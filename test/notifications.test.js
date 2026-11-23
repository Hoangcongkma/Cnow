// Thông báo: trả lời câu hỏi, khóa học có bài mới, thanh toán thành công; chuông đếm chưa đọc; mở/đánh dấu đã đọc
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, demoPay } = require('./helpers');

let app;
let course;
let asker;
let other;
before(async () => {
  app = await setup();
  const { Enrollment } = require('../src/models');
  await createUser('quantri', 'admin');
  asker = await createUser('nguoihoi');
  other = await createUser('nguoitraloi');
  await createUser('khongghidanh');
  course = await createCourse({ price: 0, slug: 'khoa-tb', title: 'Khóa thông báo' });
  for (const u of [asker, other]) await Enrollment.create({ user: u._id, course: course._id });
});
after(teardown);

const count = async (user, filter = {}) => require('../src/models').Notification.countDocuments({ user: user._id, ...filter });

test('trả lời câu hỏi → báo cho người hỏi (không báo khi tự trả lời câu hỏi của mình)', async () => {
  const { Post } = require('../src/models');
  const a = await login(app, 'nguoihoi');
  const lessonId = course.lessons[0].id;
  let t = await csrf(a, `/learn/${course.slug}?lesson=0`);
  await a.post(`/learn/${course.slug}/qa`).type('form').send({ _csrf: t, lessonId, content: 'Biến là gì vậy ạ?' });
  const q = await Post.findOne({ parent: null });
  await a.post(`/learn/${course.slug}/qa`).type('form').send({ _csrf: t, lessonId, parent: q.id, content: 'Tự bổ sung thêm' });
  assert.equal(await count(asker), 0, 'tự trả lời không tạo thông báo');
  const b = await login(app, 'nguoitraloi');
  t = await csrf(b, `/learn/${course.slug}?lesson=0`);
  await b
    .post(`/learn/${course.slug}/qa`)
    .type('form')
    .send({ _csrf: t, lessonId, parent: q.id, content: 'Biến là chiếc hộp chứa giá trị.' });
  const { Notification } = require('../src/models');
  const n = await Notification.findOne({ user: asker._id });
  assert.equal(n.type, 'qa_reply');
  assert.match(n.text, /Test nguoitraloi đã trả lời câu hỏi của bạn/);
  assert.equal(n.link, `/learn/${course.slug}?lesson=0#qa`);
});

test('chuông hiển thị số chưa đọc; mở thông báo → đã đọc + chuyển tới đúng bài; không mở được thông báo của người khác', async () => {
  const { Notification } = require('../src/models');
  const a = await login(app, 'nguoihoi');
  let page = await a.get('/courses');
  assert.match(page.text, /class="bell-count" aria-hidden="true">1</);
  const n = await Notification.findOne({ user: asker._id });
  const b = await login(app, 'nguoitraloi');
  let t = await csrf(b, '/notifications');
  let res = await b.post(`/notifications/${n.id}/open`).type('form').send({ _csrf: t });
  assert.equal(res.headers.location, '/notifications');
  assert.equal((await Notification.findById(n.id)).read, false, 'người khác không đánh dấu được');
  t = await csrf(a, '/notifications');
  res = await a.post(`/notifications/${n.id}/open`).type('form').send({ _csrf: t });
  assert.equal(res.headers.location, n.link);
  assert.equal((await Notification.findById(n.id)).read, true);
  page = await a.get('/courses');
  assert.doesNotMatch(page.text, /bell-count/);
});

test('khóa học có bài mới → báo cho học viên đã ghi danh, người chưa ghi danh không nhận', async () => {
  const { Notification, Course, User } = require('../src/models');
  await Notification.deleteMany({});
  const admin = await login(app, 'quantri');
  const c = await Course.findById(course._id);
  const structure = c.sections.map((s) => ({
    id: s.id,
    title: s.title,
    lessons: [...s.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes })), { id: '', title: 'Bài mới toanh', minutes: 7 }],
  }));
  const t = await csrf(admin, `/admin/courses/${c.id}/edit`);
  const body = {
    _csrf: t,
    title: c.title,
    slug: c.slug,
    price: '0',
    level: 'Cơ bản',
    status: 'published',
    structure: JSON.stringify(structure),
  };
  const res = await admin.post(`/admin/courses/${c.id}`).type('form').send(body);
  assert.equal(res.status, 302);
  assert.equal(await count(asker, { type: 'new_lesson' }), 1);
  assert.equal(await count(other, { type: 'new_lesson' }), 1);
  const stranger = await User.findOne({ username: 'khongghidanh' });
  assert.equal(await count(stranger), 0);
  const n = await Notification.findOne({ user: asker._id });
  assert.match(n.text, /có bài mới: “Bài mới toanh”/);
  assert.equal(n.link, `/learn/${c.slug}?lesson=2`);
  // Lưu lại mà không thêm bài → không có thông báo mới
  const t2 = await csrf(admin, `/admin/courses/${c.id}/edit`);
  const c2 = await Course.findById(course._id);
  const same = c2.sections.map((s) => ({
    id: s.id,
    title: s.title,
    lessons: s.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes })),
  }));
  await admin
    .post(`/admin/courses/${c.id}`)
    .type('form')
    .send({ ...body, _csrf: t2, structure: JSON.stringify(same) });
  assert.equal(await count(asker, { type: 'new_lesson' }), 1);
});

test('thanh toán thành công → 1 thông báo (tải lại trang không lặp); khóa miễn phí không báo', async () => {
  const buyer = await createUser('nguoimua');
  const paid = await createCourse({ price: 12, slug: 'khoa-tra-phi' });
  const free = await createCourse({ price: 0, slug: 'khoa-free-2' });
  const a = await login(app, 'nguoimua');
  let t = await csrf(a, `/courses/${free.slug}`);
  await a.post('/pay').type('form').send({ _csrf: t, courseId: free.id });
  assert.equal(await count(buyer), 0);
  t = await csrf(a, `/courses/${paid.slug}`);
  const res = await a.post('/pay').type('form').send({ _csrf: t, courseId: paid.id });
  await demoPay(a, res.headers.location);
  assert.equal(await count(buyer, { type: 'payment' }), 1);
  const { Notification } = require('../src/models');
  assert.match((await Notification.findOne({ user: buyer._id })).text, /Thanh toán thành công \$12\.00/);
  t = await csrf(a, '/notifications');
  await a.post('/notifications/read-all').type('form').send({ _csrf: t });
  assert.equal(await count(buyer, { read: false }), 0, 'đánh dấu tất cả đã đọc');
});
