// Kiểm tra đầu vào / xử lý đầu ra: zod, NoSQL injection (sanitizeFilter), mass assignment, open redirect, ReDoS, XSS
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, request } = require('./helpers');

let app;
let course;
before(async () => {
  app = await setup();
  await createUser('hocvien', 'user', { name: 'Học Viên Một' });
  await createUser('quantri', 'admin');
  course = await createCourse({ slug: 'khoa-kiem-tra', title: 'Khóa kiểm tra', price: 0 });
  const { Enrollment, User } = require('../src/models');
  await Enrollment.create({ user: (await User.findOne({ username: 'hocvien' }))._id, course: course._id });
});
after(teardown);

test('NoSQL injection: toán tử trong form bị từ chối (400); sanitizeFilter bọc object người dùng thành $eq', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent);
  // Bộ phân tích form không lồng khóa (extended: false) → 'login[$ne]' chỉ là tên trường lạ, bị schema loại bỏ
  const res = await agent.post('/login').type('form').send(`_csrf=${token}&login[$ne]=x&password[$ne]=x`);
  assert.equal(res.status, 401);
  assert.equal((await agent.get('/my-courses')).status, 302, 'không đăng nhập được');
  const { User } = require('../src/models');
  // Object không được đánh dấu trusted → bọc thành { $eq: … }: hoặc bị từ chối khi ép kiểu (CastError), hoặc không khớp bản ghi nào
  const injected = await User.findOne({ username: { $ne: null } }).catch((e) => (/Cast to string failed/.test(e.message) ? null : e));
  assert.equal(injected, null, 'toán tử từ dữ liệu không đáng tin không được thực thi');
  const mongoose = require('mongoose');
  assert.ok(await User.findOne({ username: mongoose.trusted({ $ne: null }) }), 'toán tử do code đánh dấu trusted vẫn chạy');
  assert.equal((await request(app).get('/courses?q[$regex]=.*&price[$ne]=x')).status, 200);
});

test('bộ lọc dùng toán tử vẫn đúng sau khi bật sanitizeFilter (khóa có phí, đánh giá, tìm kiếm quản trị)', async () => {
  await createCourse({ slug: 'khoa-co-phi', title: 'Khóa có phí', price: 9.99, ratingAvg: 4.6, ratingCount: 3 });
  let res = await request(app).get('/courses?price=paid');
  assert.match(res.text, /Khóa có phí/);
  assert.doesNotMatch(res.text, /Khóa kiểm tra/);
  res = await request(app).get('/courses?rating=4.5');
  assert.match(res.text, /Khóa có phí/);
  const admin = await login(app, 'quantri');
  res = await admin.get('/admin/learners?q=hocvien');
  assert.match(res.text, /@hocvien/);
  res = await admin.get('/admin/audit?from=2000-01-01&to=2100-01-01');
  assert.match(res.text, /Đăng nhập thành công/);
});

test('body sai cấu trúc (mảng thay cho chuỗi, chuỗi quá dài) → 400 thông báo chung; vượt giới hạn nghiệp vụ → thông báo thân thiện', async () => {
  const agent = await login(app, 'hocvien');
  const token = await csrf(agent, `/courses/${course.slug}`);
  let res = await agent.post(`/courses/${course.slug}/comments`).type('form').send(`_csrf=${token}&content=a&content=b`);
  assert.equal(res.status, 400);
  assert.match(res.text, /Dữ liệu gửi lên không hợp lệ/);
  res = await agent
    .post(`/courses/${course.slug}/comments`)
    .type('form')
    .send({ _csrf: token, content: 'x'.repeat(2001) });
  assert.equal(res.status, 400);
  res = await agent
    .post(`/courses/${course.slug}/comments`)
    .type('form')
    .send({ _csrf: token, content: 'x'.repeat(600) });
  assert.equal(res.status, 302, 'quá 500 ký tự (nghiệp vụ) → quay lại trang với thông báo');
  res = await agent
    .post('/pay/demo/DEMO-ORD-0123456789ABCDEF/paypal')
    .type('form')
    .send({ _csrf: token, action: ['a', 'b'] });
  assert.equal(res.status, 400);
});

test('params sai định dạng → 404', async () => {
  const agent = await login(app, 'hocvien');
  for (const p of ['/orders/abc/invoice.pdf', '/pay/demo/DEMO-ORD-xyz', '/certificate/not-an-id', '/avatars/abc.webp']) {
    assert.equal((await agent.get(p)).status, 404, p);
  }
});

test('mass assignment: trường không được phép (role, locked, passwordHash…) bị bỏ qua', async () => {
  const { User } = require('../src/models');
  const agent = request.agent(app);
  let token = await csrf(agent, '/register');
  await agent.post('/register').type('form').send({
    _csrf: token,
    name: 'Kẻ Leo Quyền',
    username: 'leoquyen',
    email: 'leo@test.local',
    password: 'Mat-khau-rat-manh-2026',
    confirm: 'Mat-khau-rat-manh-2026',
    role: 'admin',
    locked: 'false',
    sessionVersion: '99',
  });
  const u = await User.findOne({ username: 'leoquyen' });
  assert.equal(u.role, 'user');
  assert.equal(u.sessionVersion || 0, 0);
  const hv = await login(app, 'hocvien');
  token = await csrf(hv, '/profile');
  await hv.post('/profile').type('form').send({ _csrf: token, name: 'Tên mới', bio: '', role: 'admin', email: 'doi@test.local' });
  const me = await User.findOne({ username: 'hocvien' });
  assert.deepEqual([me.role, me.email], ['user', 'hocvien@test.local']);
});

test('open redirect: chỉ chấp nhận đường dẫn nội bộ (chặn //host, /\\host, URL tuyệt đối, xuống dòng)', async () => {
  const { safeRedirect } = require('../src/utils/security');
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/ok\r\nLocation: x', '', null, { a: 1 }]) {
    assert.equal(safeRedirect(bad, '/fallback'), '/fallback', String(bad));
  }
  assert.equal(safeRedirect('/courses?page=2', '/'), '/courses?page=2');
  assert.equal(safeRedirect('/profile', '/admin', '/admin/'), '/admin');
  assert.equal(safeRedirect('/admin/users?page=3', '/admin', '/admin/'), '/admin/users?page=3');
  const agent = await login(app, 'hocvien');
  const token = await csrf(agent, '/courses');
  const res = await agent.post(`/wishlist/${course.id}`).type('form').send({ _csrf: token, back: '/\\evil.com' });
  assert.equal(res.headers.location, '/wishlist');
});

test('ReDoS: chuỗi tìm kiếm luôn được escape và cắt ngắn', async () => {
  const { searchRegex } = require('../src/utils/security');
  const rx = searchRegex('(a+)+$' + 'a'.repeat(500));
  assert.equal(rx.source.length <= 2 * 80, true);
  const t0 = Date.now();
  rx.test('a'.repeat(50000) + '!');
  assert.ok(Date.now() - t0 < 50);
  const admin = await login(app, 'quantri');
  assert.equal((await admin.get('/admin/users?q=' + encodeURIComponent('(a+)+$'.repeat(20)))).status, 200);
});

test('XSS: nội dung người dùng được escape ở bình luận, đánh giá, hỏi – đáp, tên; Markdown bị lọc', async () => {
  const payload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const { User, CourseComment, Review, Post } = require('../src/models');
  const u = await User.findOneAndUpdate({ username: 'hocvien' }, { name: `Tên ${payload}` }, { returnDocument: 'after' });
  await CourseComment.create({ course: course._id, user: u._id, content: payload });
  await Review.create({ course: course._id, user: u._id, rating: 5, content: payload });
  await Post.create({ course: course._id, lesson: course.lessons[0]._id, user: u._id, content: payload });
  const detail = await request(app).get(`/courses/${course.slug}`);
  assert.doesNotMatch(detail.text, /<script>alert|<img src=x onerror/);
  assert.match(detail.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  const agent = await login(app, 'hocvien');
  const learn = await agent.get(`/learn/${course.slug}?lesson=0`);
  assert.doesNotMatch(learn.text, /<script>alert|<img[^>]*onerror/);
  const { renderMarkdown } = require('../src/services/markdown');
  const html = renderMarkdown(
    `# Bài\n${payload}\n[x](javascript:alert(3)) <a href="//evil.com">y</a> <iframe src="https://evil.com"></iframe> <div style="x" onclick="a()">z</div>`,
  );
  assert.doesNotMatch(html, /<script|onerror|javascript:|<iframe|onclick|style=|href="\/\/evil/);
});
