// Đăng ký, đăng nhập, khóa tài khoản, giới hạn đăng nhập sai (rate limit), đổi mật khẩu hủy phiên khác
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, csrf, login, request, PASSWORD } = require('./helpers');

let app;
before(async () => {
  app = await setup();
  await createUser('anan');
  await createUser('bikhoa', 'user', { locked: true });
});
after(teardown);

test('đăng ký thành công: tạo tài khoản, băm mật khẩu, đăng nhập luôn', async () => {
  const { User } = require('../src/models');
  const agent = request.agent(app);
  const token = await csrf(agent, '/register');
  const res = await agent.post('/register').type('form').send({
    _csrf: token,
    name: 'Bình Minh',
    username: 'binhminh',
    email: 'Binh@Test.local',
    password: 'MatKhau2026',
    confirm: 'MatKhau2026',
  });
  assert.equal(res.status, 302);
  const u = await User.findOne({ username: 'binhminh' });
  assert.ok(u, 'đã tạo người dùng');
  assert.equal(u.email, 'binh@test.local', 'email chuẩn hóa chữ thường');
  assert.notEqual(u.passwordHash, 'MatKhau2026');
  assert.match(u.passwordHash, /^\$2[aby]\$/, 'mật khẩu được băm bằng bcrypt');
  assert.equal((await agent.get('/my-courses')).status, 200, 'phiên đã đăng nhập');
});

test('đăng ký bị từ chối: trùng tên, mật khẩu yếu, nhập lại không khớp', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent, '/register');
  const base = { _csrf: token, name: 'An Hai', email: 'moi@test.local' };
  let res = await agent
    .post('/register')
    .type('form')
    .send({ ...base, username: 'anan', password: 'MatKhau2026', confirm: 'MatKhau2026' });
  assert.equal(res.status, 400);
  assert.match(res.text, /đã được sử dụng/);
  res = await agent
    .post('/register')
    .type('form')
    .send({ ...base, username: 'anhai', password: 'abcdefgh', confirm: 'abcdefgh' });
  assert.equal(res.status, 400);
  assert.match(res.text, /cả chữ và số/);
  res = await agent
    .post('/register')
    .type('form')
    .send({ ...base, username: 'anhai', password: 'MatKhau2026', confirm: 'khac2026' });
  assert.equal(res.status, 400);
});

test('đăng nhập: đúng → 302, sai → 401 thông báo chung, tài khoản khóa → 403', async () => {
  await login(app, 'anan'); // ném lỗi nếu không phải 302
  const agent = request.agent(app);
  const token = await csrf(agent);
  let res = await agent.post('/login').type('form').send({ _csrf: token, login: 'anan', password: 'sai-mat-khau1' });
  assert.equal(res.status, 401);
  assert.match(res.text, /Tên đăng nhập hoặc mật khẩu không đúng/);
  res = await agent.post('/login').type('form').send({ _csrf: token, login: 'khong-ton-tai', password: 'x' });
  assert.equal(res.status, 401, 'không tiết lộ tài khoản có tồn tại hay không');
  res = await agent.post('/login').type('form').send({ _csrf: token, login: 'bikhoa', password: PASSWORD });
  assert.equal(res.status, 403);
});

test('đổi mật khẩu: phiên hiện tại giữ đăng nhập, phiên khác bị đăng xuất', async () => {
  await createUser('doimk');
  const a = await login(app, 'doimk');
  const b = await login(app, 'doimk');
  const token = await csrf(a, '/profile');
  const res = await a
    .post('/profile/password')
    .type('form')
    .send({ _csrf: token, current: PASSWORD, password: 'MoiHoan2026', confirm: 'MoiHoan2026' });
  assert.equal(res.status, 302);
  assert.equal((await a.get('/profile')).status, 200);
  const rb = await b.get('/profile');
  assert.equal(rb.status, 302);
  assert.equal(rb.headers.location, '/login');
});
