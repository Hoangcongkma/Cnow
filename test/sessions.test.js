// Phiên đăng nhập: hết hạn (30 phút không hoạt động / 7 ngày), trang "Phiên đăng nhập", đăng xuất từ xa, báo đăng nhập
// từ IP mới, đổi vai trò → đăng xuất, cookie __Host- ở production, khóa đăng nhập lũy tiến theo tài khoản + IP
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { setup, teardown, createUser, csrf, login, request, PASSWORD } = require('./helpers');

let app;
before(async () => {
  app = await setup({ TRUST_PROXY: '1' });
  for (const u of ['phien1', 'phien2', 'ipmoi', 'doivaitro', 'khoaip1', 'khoaip2']) await createUser(u);
  await createUser('quantri', 'admin');
});
after(teardown);

const M = () => require('../src/models');
async function loginFrom(username, ip) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const res = await agent
    .post('/login')
    .set('X-Forwarded-For', ip)
    .type('form')
    .send({ _csrf: token, login: username, password: PASSWORD });
  assert.equal(res.status, 302, `đăng nhập ${username} từ ${ip}`);
  return agent;
}

/** Sửa trực tiếp dữ liệu phiên trong store (giả lập thời gian trôi qua). */
async function patchSession(userId, patch) {
  const col = require('mongoose').connection.db.collection('sessions');
  for (const doc of await col.find({}).toArray()) {
    const s = typeof doc.session === 'string' ? JSON.parse(doc.session) : doc.session;
    if (s.userId !== String(userId)) continue;
    Object.assign(s, patch);
    await col.updateOne({ _id: doc._id }, { $set: { session: typeof doc.session === 'string' ? JSON.stringify(s) : s } });
  }
}

test('trang Phiên đăng nhập: liệt kê các thiết bị, đánh dấu phiên hiện tại; đăng xuất từ xa phiên khác', async () => {
  const u = await M().User.findOne({ username: 'phien1' });
  const a = await loginFrom('phien1', '10.1.0.1');
  const b = await loginFrom('phien1', '10.1.0.2');
  const page = await a.get('/profile/sessions');
  assert.equal(page.status, 200);
  assert.equal(page.headers['cache-control'], 'no-store');
  assert.match(page.text, /Phiên này/);
  assert.equal((page.text.match(/\/profile\/sessions\/[0-9a-f]{24}\/revoke/g) || []).length, 1, '1 phiên khác có nút đăng xuất');
  assert.doesNotMatch(page.text, /cnow\.sid|"sid"/, 'không lộ id phiên');
  const id = page.text.match(/\/profile\/sessions\/([0-9a-f]{24})\/revoke/)[1];
  const token = await csrf(a, '/profile/sessions');
  await a.post(`/profile/sessions/${id}/revoke`).type('form').send({ _csrf: token });
  assert.equal((await b.get('/profile')).headers.location, '/login', 'phiên B đã bị đăng xuất');
  assert.equal((await a.get('/profile')).status, 200, 'phiên A còn');
  assert.ok(await M().AuditLog.exists({ action: 'session.revoke', target: u._id }));
  // Không đăng xuất được phiên của người khác
  const c = await loginFrom('phien2', '10.1.0.3');
  const other = await M().UserSession.findOne({ user: (await M().User.findOne({ username: 'phien2' }))._id });
  await a.post(`/profile/sessions/${other.id}/revoke`).type('form').send({ _csrf: token });
  assert.equal((await c.get('/profile')).status, 200);
});

test('hết hạn: 30 phút không hoạt động hoặc quá 7 ngày kể từ khi đăng nhập → phải đăng nhập lại (có audit)', async () => {
  const u = await M().User.findOne({ username: 'phien2' });
  const a = await loginFrom('phien2', '10.1.0.4');
  assert.equal((await a.get('/profile')).status, 200);
  await patchSession(u._id, { seenAt: Date.now() - 31 * 60 * 1000 });
  let res = await a.get('/profile');
  assert.equal(res.headers.location, '/login');
  assert.ok(await M().AuditLog.exists({ action: 'session.expired', target: u._id, 'meta.reason': 'idle' }));
  const b = await loginFrom('phien2', '10.1.0.4');
  await patchSession(u._id, { authAt: Date.now() - 8 * 24 * 3600 * 1000 });
  res = await b.get('/profile');
  assert.equal(res.headers.location, '/login');
  assert.ok(await M().AuditLog.exists({ action: 'session.expired', target: u._id, 'meta.reason': 'absolute' }));
});

test('đăng nhập từ IP mới → thông báo bảo mật + audit; IP đã biết → không báo; không lưu IP gốc trong hồ sơ', async () => {
  const u = await M().User.findOne({ username: 'ipmoi' });
  await loginFrom('ipmoi', '10.2.0.1'); // lần đầu: chỉ ghi nhận
  assert.equal(await M().Notification.countDocuments({ user: u._id, type: 'security' }), 0);
  await loginFrom('ipmoi', '10.2.0.2');
  assert.equal(await M().Notification.countDocuments({ user: u._id, type: 'security' }), 1);
  assert.ok(await M().AuditLog.exists({ action: 'login.new_ip', target: u._id }));
  await loginFrom('ipmoi', '10.2.0.2');
  assert.equal(await M().Notification.countDocuments({ user: u._id, type: 'security' }), 1, 'IP đã biết');
  const saved = await M().User.findById(u._id).select('+knownIpHashes');
  assert.equal(saved.knownIpHashes.length, 2);
  assert.ok(!saved.knownIpHashes.some((h) => h.includes('10.2.0')), 'chỉ lưu HMAC');
});

test('admin đổi vai trò một người → mọi phiên của người đó bị hủy', async () => {
  const target = await M().User.findOne({ username: 'doivaitro' });
  const victim = await loginFrom('doivaitro', '10.3.0.1');
  const admin = await login(app, 'quantri');
  const token = await csrf(admin, '/admin/users');
  await admin.post(`/admin/users/${target.id}`).type('form').send({ _csrf: token, role: 'collaborator' });
  assert.equal((await victim.get('/profile')).headers.location, '/login');
  assert.equal(await M().UserSession.countDocuments({ user: target._id }), 0);
});

test('khóa lũy tiến: thang thời gian 5→10→20→40→60 phút; IP bị khóa sau 10 lần sai dù đổi tài khoản', async () => {
  const { lockMs } = require('../src/services/login-guard');
  const min = (n) => lockMs(n, 5) / 60000;
  assert.deepEqual([4, 5, 6, 7, 8, 9, 20].map(min), [0, 5, 10, 20, 40, 60, 60]);
  const agent = request.agent(app);
  const token = await csrf(agent);
  for (let i = 0; i < 10; i++) {
    const r = await agent
      .post('/login')
      .set('X-Forwarded-For', '10.9.9.9')
      .type('form')
      .send({ _csrf: token, login: i % 2 ? 'khoaip1' : 'khoaip2', password: `sai-${i}-x1` });
    assert.equal(r.status, 401, `lần ${i + 1}`);
  }
  const r = await agent
    .post('/login')
    .set('X-Forwarded-For', '10.9.9.9')
    .type('form')
    .send({ _csrf: token, login: 'phien1', password: PASSWORD });
  assert.equal(r.status, 429, 'IP đã sai 10 lần → khóa, kể cả tài khoản khác đúng mật khẩu');
  const ok = await request.agent(app);
  const t2 = await csrf(ok);
  const r2 = await ok
    .post('/login')
    .set('X-Forwarded-For', '10.9.9.8')
    .type('form')
    .send({ _csrf: t2, login: 'phien1', password: PASSWORD });
  assert.equal(r2.status, 302, 'IP khác không bị ảnh hưởng');
});

test('production + HTTPS: cookie phiên dùng tiền tố __Host-', () => {
  const code = "process.stdout.write(require('./src/config').sessionCookieName)";
  const run = (env) =>
    String(
      execFileSync(process.execPath, ['-e', code], {
        cwd: path.join(__dirname, '..'),
        env: {
          PATH: process.env.PATH,
          SYSTEMROOT: process.env.SYSTEMROOT,
          SESSION_SECRET: 's'.repeat(40),
          MONGODB_URI: 'mongodb://x/y',
          PAYMENT_MODE: '',
          ...env,
        },
      }),
    );
  assert.equal(run({ NODE_ENV: 'production', BASE_URL: 'https://cnow.example.com' }), '__Host-cnow.sid');
  assert.equal(run({ NODE_ENV: 'development', BASE_URL: 'http://localhost:3000' }), 'cnow.sid');
});
