// Phân quyền: khách, người học, cộng tác viên, quản trị viên
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, request } = require('./helpers');

let app;
let ctv;
let ctv2;
let courseCtv;
let courseKhac;
before(async () => {
  app = await setup();
  await createUser('admin1', 'admin');
  ctv = await createUser('ctv1', 'collaborator');
  ctv2 = await createUser('ctv2', 'collaborator');
  await createUser('hv1');
  courseCtv = await createCourse({ author: ctv._id, title: 'Khóa của CTV1' });
  courseKhac = await createCourse({ author: ctv2._id, title: 'Khóa của CTV2' });
});
after(teardown);

test('khách vào trang quản trị → chuyển tới đăng nhập', async () => {
  const res = await request(app).get('/admin');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/login');
});

test('người học vào trang quản trị → 403', async () => {
  const agent = await login(app, 'hv1');
  for (const p of ['/admin', '/admin/courses', '/admin/users', '/admin/audit', '/admin/export/orders.csv']) {
    assert.equal((await agent.get(p)).status, 403, p);
  }
});

test('cộng tác viên: vào được trang của mình, không vào trang chỉ dành cho admin', async () => {
  const agent = await login(app, 'ctv1');
  for (const p of ['/admin', '/admin/courses', '/admin/learners', `/admin/courses/${courseCtv.id}/edit`]) {
    assert.equal((await agent.get(p)).status, 200, p);
  }
  for (const p of ['/admin/users', '/admin/orders', '/admin/qa', '/admin/audit', '/admin/export/orders.csv']) {
    assert.equal((await agent.get(p)).status, 403, p);
  }
  const list = await agent.get('/admin/courses');
  assert.match(list.text, /Khóa của CTV1/);
  assert.doesNotMatch(list.text, /Khóa của CTV2/, 'không thấy khóa của người khác');
});

test('cộng tác viên không sửa được khóa của người khác (404) và không tự duyệt / xóa', async () => {
  const agent = await login(app, 'ctv1');
  assert.equal((await agent.get(`/admin/courses/${courseKhac.id}/edit`)).status, 404);
  const token = await csrf(agent, '/admin/courses');
  let res = await agent
    .post(`/admin/courses/${courseKhac.id}`)
    .type('form')
    .send({ _csrf: token, title: 'Chiếm quyền', slug: courseKhac.slug, price: '1', level: 'Cơ bản', structure: '[]' });
  assert.equal(res.status, 404);
  res = await agent.post(`/admin/courses/${courseCtv.id}/approve`).type('form').send({ _csrf: token });
  assert.equal(res.status, 403);
  res = await agent.post(`/admin/courses/${courseCtv.id}/delete`).type('form').send({ _csrf: token });
  assert.equal(res.status, 403);
});

test('cộng tác viên tạo khóa học → Nháp, không tự xuất bản được', async () => {
  const { Course } = require('../src/models');
  const agent = await login(app, 'ctv1');
  const token = await csrf(agent, '/admin/courses/new');
  const res = await agent
    .post('/admin/courses')
    .type('form')
    .send({
      _csrf: token,
      title: 'Khóa mới',
      slug: 'khoa-moi-ctv',
      price: '9.99',
      level: 'Cơ bản',
      status: 'published',
      structure: JSON.stringify([{ id: '', title: 'C1', lessons: [{ id: '', title: 'B1', minutes: 5 }] }]),
    });
  assert.equal(res.status, 302);
  const c = await Course.findOne({ slug: 'khoa-moi-ctv' });
  assert.equal(c.status, 'draft');
  assert.equal(c.published, false);
});

test('admin: vào mọi trang, đổi vai trò người khác nhưng không tự đổi quyền mình', async () => {
  const { User } = require('../src/models');
  const agent = await login(app, 'admin1');
  for (const p of ['/admin', '/admin/users', '/admin/orders', '/admin/qa', '/admin/audit', `/admin/courses/${courseKhac.id}/edit`]) {
    assert.equal((await agent.get(p)).status, 200, p);
  }
  const token = await csrf(agent, '/admin/users');
  const hv = await User.findOne({ username: 'hv1' });
  await agent.post(`/admin/users/${hv.id}`).type('form').send({ _csrf: token, role: 'collaborator' });
  assert.equal((await User.findById(hv.id)).role, 'collaborator');
  const me = await User.findOne({ username: 'admin1' });
  await agent.post(`/admin/users/${me.id}`).type('form').send({ _csrf: token, role: 'user' });
  assert.equal((await User.findById(me.id)).role, 'admin', 'không tự hạ quyền');
});
