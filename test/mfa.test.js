// Xác thực hai lớp TOTP: thiết lập, đăng nhập 2 bước, chống dùng lại mã, mã khôi phục, giới hạn nhập sai, admin dùng TOTP thay mã quản trị
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('otplib');
const { setup, teardown, createUser, csrf, login, request, PASSWORD } = require('./helpers');

let app;
before(async () => {
  app = await setup();
  await createUser('hocvien');
  await createUser('quantri', 'admin');
});
after(teardown);

const now = () => Math.floor(Date.now() / 1000);
const codeAt = (secret, offsetSteps = 0) => generate({ secret, epoch: now() + offsetSteps * 30 });

/** Đăng nhập bước 1 (mật khẩu) → trả về agent đang chờ mã 2FA. */
async function passwordStep(username) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const res = await agent.post('/login').type('form').send({ _csrf: token, login: username, password: PASSWORD });
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/login/2fa');
  return { agent, token: await csrf(agent, '/login/2fa') };
}

let secret;
let recovery;

test('bật 2FA: trang có mã QR + khóa, mã sai bị từ chối, mã đúng → 8 mã khôi phục hiện 1 lần', async () => {
  const { User } = require('../src/models');
  const agent = await login(app, 'hocvien');
  let res = await agent.get('/profile/2fa');
  assert.equal(res.status, 200);
  assert.match(res.text, /<img src="data:image\/png;base64,/);
  assert.equal(res.headers['cache-control'], 'no-store');
  secret = res.text.match(/class="mono secret-key">([A-Z2-7 ]+)</)[1].replace(/ /g, '');
  const token = res.text.match(/name="_csrf" value="([0-9a-f]+)"/)[1];
  res = await agent.post('/profile/2fa/enable').type('form').send({ _csrf: token, code: '123456' });
  assert.equal(res.status, 400);
  res = await agent
    .post('/profile/2fa/enable')
    .type('form')
    .send({ _csrf: token, code: await codeAt(secret) });
  assert.equal(res.status, 200);
  recovery = [...res.text.matchAll(/<li>([a-z0-9]{4}-[a-z0-9]{4})<\/li>/g)].map((m) => m[1]);
  assert.equal(recovery.length, 8);
  const u = await User.findOne({ username: 'hocvien' }).select('+mfaSecret +mfaRecovery');
  assert.equal(u.mfaEnabled, true);
  assert.ok(u.mfaSecret.startsWith('v1:') && !u.mfaSecret.includes(secret), 'bí mật được mã hóa, không lưu dạng rõ');
  assert.ok(
    u.mfaRecovery.every((r) => /^[0-9a-f]{64}$/.test(r.hash)) && !JSON.stringify(u.mfaRecovery).includes(recovery[0]),
    'mã khôi phục chỉ lưu hash',
  );
  const page = await agent.get('/profile/2fa');
  assert.doesNotMatch(page.text, new RegExp(recovery[0]), 'không hiển thị lại mã khôi phục');
});

test('đăng nhập: đúng mật khẩu chưa vào được, cần mã 2FA; mã đúng → vào; dùng lại cùng mã → bị từ chối', async () => {
  const { agent, token } = await passwordStep('hocvien');
  const before2fa = await agent.get('/my-courses');
  assert.equal(before2fa.status, 302, 'chưa nhập mã thì chưa đăng nhập');
  const code = await codeAt(secret, 1); // bước kế tiếp (bước hiện tại đã dùng khi bật 2FA)
  let res = await agent.post('/login/2fa').type('form').send({ _csrf: token, code });
  assert.equal(res.status, 302);
  assert.equal((await agent.get('/my-courses')).status, 200);
  const again = await passwordStep('hocvien');
  res = await again.agent.post('/login/2fa').type('form').send({ _csrf: again.token, code });
  assert.equal(res.status, 401, 'mã đã dùng không dùng lại được');
});

test('mã khôi phục: đăng nhập được 1 lần, dùng lại thất bại', async () => {
  const { AuditLog } = require('../src/models');
  let { agent, token } = await passwordStep('hocvien');
  let res = await agent.post('/login/2fa').type('form').send({ _csrf: token, code: recovery[0].toUpperCase() });
  assert.equal(res.status, 302);
  assert.equal((await agent.get('/profile')).status, 200);
  ({ agent, token } = await passwordStep('hocvien'));
  res = await agent.post('/login/2fa').type('form').send({ _csrf: token, code: recovery[0] });
  assert.equal(res.status, 401);
  assert.ok(await AuditLog.exists({ action: 'mfa.recovery_used' }));
});

test('nhập sai mã 5 lần → hủy bước 2FA, phải đăng nhập lại', async () => {
  const { agent, token } = await passwordStep('hocvien');
  let res;
  for (let i = 0; i < 5; i++) res = await agent.post('/login/2fa').type('form').send({ _csrf: token, code: '000000' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/login');
  res = await agent
    .post('/login/2fa')
    .type('form')
    .send({ _csrf: token, code: await codeAt(secret, 1) });
  assert.equal(res.headers.location, '/login', 'mã đúng sau khi bị hủy cũng không vào được');
});

test('tắt 2FA cần đúng mật khẩu + mã', async () => {
  const { User } = require('../src/models');
  const { agent, token } = await passwordStep('hocvien');
  await agent.post('/login/2fa').type('form').send({ _csrf: token, code: recovery[1] });
  const t = await csrf(agent, '/profile/2fa');
  let res = await agent.post('/profile/2fa/disable').type('form').send({ _csrf: t, password: 'sai-mk-123', code: recovery[2] });
  assert.equal(res.status, 400);
  res = await agent.post('/profile/2fa/disable').type('form').send({ _csrf: t, password: PASSWORD, code: recovery[2] });
  assert.equal(res.status, 302);
  assert.equal((await User.findOne({ username: 'hocvien' })).mfaEnabled, false);
});

test('admin: TOTP là tùy chọn – chưa bật vẫn vào /admin (qua mã quản trị); bật TOTP thì mã 6 số thay mã quản trị; tắt được', async () => {
  const agent = await login(app, 'quantri'); // helper tự nhập mã quản trị
  assert.equal((await agent.get('/admin')).status, 200, 'không còn bắt buộc TOTP');
  const page = await agent.get('/profile/2fa');
  const token = page.text.match(/name="_csrf" value="([0-9a-f]+)"/)[1];
  const s = page.text.match(/class="mono secret-key">([A-Z2-7 ]+)</)[1].replace(/ /g, '');
  let res = await agent
    .post('/profile/2fa/enable')
    .type('form')
    .send({ _csrf: token, code: await codeAt(s) });
  assert.equal(res.status, 200);
  const codes = [...res.text.matchAll(/<li>([a-z0-9]{4}-[a-z0-9]{4})<\/li>/g)].map((m) => m[1]);
  assert.equal((await agent.get('/admin')).status, 200, 'vẫn đăng nhập sau khi bật (phiên mới giữ bước 2)');

  // Đăng nhập lại: mật khẩu → /login/2fa (TOTP), KHÔNG hỏi mã quản trị
  const st = await passwordStep('quantri');
  res = await st.agent
    .post('/login/2fa')
    .type('form')
    .send({ _csrf: st.token, code: await codeAt(s, 1) });
  assert.equal(res.status, 302);
  assert.equal((await st.agent.get('/admin')).status, 200);

  const t2 = await csrf(st.agent, '/profile/2fa');
  res = await st.agent.post('/profile/2fa/disable').type('form').send({ _csrf: t2, password: PASSWORD, code: codes[0] });
  assert.equal(res.status, 302, 'admin tắt được TOTP');
  const again = await request.agent(app);
  const t3 = await csrf(again);
  res = await again.post('/login').type('form').send({ _csrf: t3, login: 'quantri', password: PASSWORD });
  assert.equal(res.headers.location, '/login/admin-pin', 'tắt TOTP → quay về mã quản trị');
});
