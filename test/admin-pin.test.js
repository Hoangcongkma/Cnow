// Mã quản trị (admin PIN): bước xác thực thứ hai bắt buộc của admin chưa bật TOTP
const { trusted } = require('mongoose');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, csrf, login, request, PASSWORD, ADMIN_PIN } = require('./helpers');

let app;
const seen = []; // mọi response trong file – kiểm tra không lộ hash
before(async () => {
  app = await setup({ TRUST_PROXY: '1' }); // giả lập nhiều IP bằng X-Forwarded-For
  await createUser('hocvien');
  await createUser('quantri', 'admin');
  await createUser('quantri2', 'admin');
  await createUser('quantri3', 'admin');
  await createUser('chuaco', 'admin', { adminPinHash: undefined });
});
after(teardown);

let ipN = 0;
const newIp = () => `10.1.${Math.floor(++ipN / 200)}.${ipN % 200}`;
const keep = (res) => (seen.push(res.text || ''), res);

/** Bước mật khẩu từ 1 IP; trả về agent + token của trang nhập mã. */
async function passwordStep(username, ip = newIp()) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const res = keep(
    await agent.post('/login').set('X-Forwarded-For', ip).type('form').send({ _csrf: token, login: username, password: PASSWORD }),
  );
  return { agent, res, ip, token: res.headers.location === '/login/admin-pin' ? await csrf(agent, '/login/admin-pin') : token };
}
const sendPin = async (s, pin, ip = s.ip) =>
  keep(await s.agent.post('/login/admin-pin').set('X-Forwarded-For', ip).type('form').send({ _csrf: s.token, pin }));

test('người dùng thường không bị hỏi mã quản trị', async () => {
  const s = await passwordStep('hocvien');
  assert.equal(s.res.status, 302);
  assert.equal(s.res.headers.location, '/my-courses');
  assert.equal((await s.agent.get('/my-courses')).status, 200);
});

test('admin chưa đặt mã: không có phiên, không vào /admin, hiện hướng dẫn chạy set:admin-pin', async () => {
  const s = await passwordStep('chuaco');
  assert.equal(s.res.status, 403);
  assert.match(s.res.text, /Chưa đặt mã quản trị/);
  assert.match(s.res.text, /npm run set:admin-pin/);
  const res = await s.agent.get('/admin');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/login');
});

test('đúng mật khẩu nhưng chưa nhập mã → chưa vào /admin; mã đúng → vào được, phiên mới, có audit ADMIN_PIN_OK', async () => {
  const { AuditLog } = require('../src/models');
  const s = await passwordStep('quantri');
  assert.equal(s.res.headers.location, '/login/admin-pin');
  const cookieBefore = s.res.headers['set-cookie'].find((c) => c.startsWith('cnow.sid=')).split(';')[0];
  assert.equal((await s.agent.get('/admin')).headers.location, '/login', 'chưa qua bước 2 → chưa đăng nhập');
  const res = await sendPin(s, ADMIN_PIN);
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/admin');
  const cookieAfter = res.headers['set-cookie'].find((c) => c.startsWith('cnow.sid=')).split(';')[0];
  assert.notEqual(cookieAfter, cookieBefore, 'regenerate session sau khi qua bước 2');
  assert.equal(keep(await s.agent.get('/admin')).status, 200);
  assert.ok(await AuditLog.exists({ action: 'ADMIN_PIN_OK' }));
});

test('sai mã: thông báo chung; sai 5 lần → khóa 15 phút (cả mã đúng, cả IP khác); hết khóa → vào được', async () => {
  const { AuditLog, User } = require('../src/models');
  const s = await passwordStep('quantri2');
  let res;
  for (let i = 0; i < 4; i++) {
    res = await sendPin(s, `Sai-ma-${i}#Abc`, newIp()); // mỗi lần 1 IP khác → chỉ giới hạn theo tài khoản tác động
    assert.equal(res.status, 401);
    assert.match(res.text, /Mã quản trị không đúng/);
  }
  res = await sendPin(s, 'Sai-ma-4#Abc', newIp());
  assert.equal(res.status, 429, 'lần sai thứ 5 → khóa');
  res = await sendPin(s, ADMIN_PIN, newIp());
  assert.equal(res.status, 429, 'đang khóa: mã đúng cũng bị chặn');
  assert.equal((await s.agent.get('/admin')).headers.location, '/login');
  const u = await User.findOne({ username: 'quantri2' });
  assert.ok(u.adminPinLockedUntil > new Date(Date.now() + 14 * 60 * 1000));
  assert.equal(await AuditLog.countDocuments({ action: 'ADMIN_PIN_FAIL', target: u._id }), 5);
  assert.ok(await AuditLog.exists({ action: 'ADMIN_PIN_LOCKED', target: u._id }));
  const logs = JSON.stringify(await AuditLog.find({}).lean());
  assert.ok(!logs.includes('Sai-ma-') && !logs.includes(ADMIN_PIN), 'audit log không chứa giá trị mã');

  await User.updateOne({ _id: u._id }, { adminPinLockedUntil: new Date(Date.now() - 1000) }); // giả lập hết 15 phút
  const s2 = await passwordStep('quantri2');
  res = await sendPin(s2, ADMIN_PIN);
  assert.equal(res.status, 302);
  assert.equal((await s2.agent.get('/admin')).status, 200);
});

test('giới hạn theo IP: 5 lần sai từ 1 IP (dù khác tài khoản) → IP đó bị khóa bước nhập mã', async () => {
  const ip = newIp();
  const a = await passwordStep('quantri3', ip);
  for (let i = 0; i < 3; i++) assert.equal((await sendPin(a, `Sai-ip-${i}#Abc`)).status, 401);
  const b = await passwordStep('quantri', ip);
  assert.equal((await sendPin(b, 'Sai-ip-3#Abc')).status, 401);
  assert.equal((await sendPin(b, 'Sai-ip-4#Abc')).status, 401);
  assert.equal((await sendPin(b, ADMIN_PIN)).status, 429, 'IP đã sai 5 lần → khóa');
  assert.equal((await sendPin(b, ADMIN_PIN, newIp())).status, 302, 'IP khác, tài khoản chưa bị khóa → vào được');
});

test('10 lần nhập sai đồng thời: tối đa 5 lần được so sánh (giữ lượt nguyên tử)', async () => {
  const { AuditLog, User } = require('../src/models');
  const s = await passwordStep('quantri3');
  const u = await User.findOne({ username: 'quantri3' });
  await User.updateOne({ _id: u._id }, { $unset: { adminPinFails: '', adminPinLockedUntil: '' } });
  const before0 = await AuditLog.countDocuments({ action: 'ADMIN_PIN_FAIL', target: u._id });
  await Promise.all(Array.from({ length: 10 }, (_, i) => sendPin(s, `Dong-thoi-${i}#A`, newIp())));
  const fails = (await AuditLog.countDocuments({ action: 'ADMIN_PIN_FAIL', target: u._id })) - before0;
  assert.ok(fails <= 5, `chỉ ${fails} lần được so sánh`);
  assert.ok((await User.findById(u._id)).adminPinLockedUntil > new Date());
});

test('admin vừa được nâng quyền khi đang đăng nhập (chưa qua bước mã) → bị đăng xuất', async () => {
  const { User } = require('../src/models');
  await createUser('sapnang');
  const agent = await login(app, 'sapnang');
  await User.updateOne({ username: 'sapnang' }, { role: 'admin' });
  const res = await agent.get('/admin');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/login');
  assert.equal((await agent.get('/profile')).headers.location, '/login', 'phiên đã bị hủy');
});

test('script set:admin-pin: kiểm tra quy tắc, chỉ cho admin, chỉ lưu hash, đăng xuất phiên cũ', async () => {
  const { User } = require('../src/models');
  const { setAdminPin } = require('../scripts/set-admin-pin');
  await assert.rejects(setAdminPin('quantri', 'ngan#A1'), /ít nhất 10/);
  await assert.rejects(setAdminPin('quantri', 'khongcohoa#1'), /chữ hoa/);
  await assert.rejects(setAdminPin('quantri', 'KhongCoSo#abc'), /chữ số/);
  await assert.rejects(setAdminPin('quantri', 'KhongDacBiet12'), /ký tự đặc biệt/);
  await assert.rejects(setAdminPin('hocvien', 'Ma-Moi#2026abc'), /không phải quản trị viên/);
  await assert.rejects(setAdminPin('khongton', 'Ma-Moi#2026abc'), /Không tìm thấy/);

  const old = await login(app, 'chuaco').catch((e) => e);
  assert.ok(old instanceof Error, 'chưa có mã → không đăng nhập được');
  const admin = await login(app, 'quantri');
  assert.equal(await setAdminPin('chuaco', 'Ma-Moi#2026abc'), 'chuaco');
  const u = await User.findOne({ username: 'chuaco' }).select('+adminPinHash');
  assert.match(u.adminPinHash, /^\$2[aby]\$12\$/, 'bcrypt cost 12');
  assert.ok(!u.adminPinHash.includes('Ma-Moi'));
  const s = await passwordStep('chuaco');
  assert.equal((await sendPin(s, 'Ma-Moi#2026abc')).status, 302);
  assert.equal((await s.agent.get('/admin')).status, 200);

  // Đổi mã của 1 admin đang đăng nhập → phiên đó bị đăng xuất
  await setAdminPin('quantri', 'Doi-Ma#2026xyz');
  assert.equal((await admin.get('/admin')).headers.location, '/login');
});

test('hash mã quản trị không xuất hiện trong bất kỳ response nào', async () => {
  const { User } = require('../src/models');
  const s = await passwordStep('quantri3', newIp());
  await User.updateOne({ username: 'quantri3' }, { $unset: { adminPinFails: '', adminPinLockedUntil: '' } });
  const ok = await sendPin(s, ADMIN_PIN, newIp());
  assert.equal(ok.status, 302);
  for (const p of ['/admin', '/admin/users', '/profile', '/profile/2fa', '/admin/audit', '/admin/export/learners.csv']) {
    keep(await s.agent.get(p));
  }
  const hashes = (await User.find({ adminPinHash: trusted({ $exists: true }) }).select('+adminPinHash')).map((u) => u.adminPinHash);
  assert.ok(hashes.length >= 4);
  const all = seen.join('\n');
  for (const h of hashes) {
    assert.ok(!all.includes(h), 'hash không có trong response');
    assert.ok(!all.includes(h.slice(7, 29)), 'kể cả phần salt');
  }
  assert.doesNotMatch(all, /adminPinHash/);
});
