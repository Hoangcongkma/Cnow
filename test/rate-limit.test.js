// Giới hạn đăng nhập sai – file riêng (mỗi file test chạy ở tiến trình riêng nên bộ đếm theo IP bắt đầu từ 0)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, csrf, request, PASSWORD } = require('./helpers');

let app;
before(async () => {
  app = await setup();
  await createUser('anan');
});
after(teardown);

test('sau 5 lần đăng nhập sai, lần thứ 6 bị chặn (429) kể cả khi đúng mật khẩu; có ghi audit log', async () => {
  const { AuditLog } = require('../src/models');
  const agent = request.agent(app);
  const token = await csrf(agent);
  for (let i = 0; i < 5; i++) {
    const r = await agent
      .post('/login')
      .type('form')
      .send({ _csrf: token, login: 'anan', password: `sai${i}xyz9` });
    assert.equal(r.status, 401, `lần sai thứ ${i + 1}`);
  }
  const res = await agent.post('/login').type('form').send({ _csrf: token, login: 'anan', password: PASSWORD });
  assert.equal(res.status, 429);
  assert.match(res.text, /sai quá nhiều lần/);
  assert.ok(res.headers['ratelimit'] || res.headers['ratelimit-policy'], 'có header RateLimit chuẩn');
  assert.equal(await AuditLog.countDocuments({ action: 'login.failure' }), 5);
  assert.equal(await AuditLog.countDocuments({ action: 'login.rate_limited' }), 1);
});

test('đăng ký: tối đa 10 lần/giờ/IP', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent, '/register');
  let last;
  for (let i = 0; i < 11; i++) {
    last = await agent
      .post('/register')
      .type('form')
      .send({ _csrf: token, name: 'X', username: 'x', email: 'x', password: 'a', confirm: 'b' });
  }
  assert.equal(last.status, 429);
});
