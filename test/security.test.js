// CSRF, header bảo mật, chống NoSQL injection, chặn đường dẫn upload
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, request } = require('./helpers');

let app;
let course;
before(async () => {
  app = await setup();
  await createUser('admin1', 'admin');
  await createUser('hvien');
  course = await createCourse({ price: 0 });
});
after(teardown);

test('POST không có CSRF token → 403, kể cả khi đã đăng nhập', async () => {
  const agent = await login(app, 'admin1');
  let res = await agent.post(`/admin/courses/${course.id}/delete`).type('form').send({});
  assert.equal(res.status, 403);
  res = await agent
    .post(`/admin/courses/${course.id}/delete`)
    .type('form')
    .send({ _csrf: 'a'.repeat(64) });
  assert.equal(res.status, 403, 'token sai → 403');
  const { Course } = require('../src/models');
  assert.ok(await Course.exists({ _id: course._id }), 'khóa học không bị xóa');
});

test('POST multipart tới route không phải upload → 403 (không vượt CSRF bằng multipart)', async () => {
  const agent = await login(app, 'admin1');
  const res = await agent.post(`/admin/courses/${course.id}/delete`).field('x', '1');
  assert.equal(res.status, 403);
});

test('token đúng trong header x-csrf-token được chấp nhận', async () => {
  const agent = await login(app, 'hvien');
  const token = await csrf(agent, '/profile');
  const res = await agent.post('/profile').set('x-csrf-token', token).type('form').send({ name: 'Học viên Một', bio: '' });
  assert.equal(res.status, 302);
});

test('header bảo mật: CSP chỉ self, nosniff, không lộ X-Powered-By, cookie HttpOnly + SameSite', async () => {
  const res = await request(app).get('/login');
  const csp = res.headers['content-security-policy'];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self' https:\/\/www\.youtube\.com/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-powered-by'], undefined);
  const cookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('cnow.sid='));
  assert.ok(cookie && /HttpOnly/i.test(cookie) && /SameSite=Lax/i.test(cookie), 'cookie phiên an toàn');
});

test('NoSQL injection: tham số dạng toán tử bị ép kiểu, không lộ dữ liệu', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent);
  // body urlencoded extended:false → login[$ne]= là khóa phẳng, giá trị ép String
  const res = await agent.post('/login').type('form').send({ _csrf: token, 'login[$ne]': 'x', password: 'x' });
  assert.equal(res.status, 401);
  const list = await request(app).get('/courses?level[$ne]=x&price[$gt]=&sort[$where]=1');
  assert.equal(list.status, 200);
});

test('ảnh đại diện: đường dẫn lạ / path traversal → 404', async () => {
  for (const p of ['/avatars/..%2f..%2fpackage.json', '/avatars/abc.webp', `/avatars/${'0'.repeat(32)}.webp`]) {
    assert.equal((await request(app).get(p)).status, 404, p);
  }
});
