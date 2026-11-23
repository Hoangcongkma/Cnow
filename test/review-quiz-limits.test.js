// Kiểm duyệt nội dung và chống gian lận: (a) CTV sửa khóa đã duyệt → quay về "Chờ duyệt"; (b) trắc nghiệm tối đa 3 lần nộp / giờ / bài
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login } = require('./helpers');

let app;
let ctv;
before(async () => {
  app = await setup();
  ctv = await createUser('ctvsua', 'collaborator');
  await createUser('quantri', 'admin');
  await createUser('hocvien');
});
after(teardown);

const formBody = (c, extra = {}) => ({
  title: c.title,
  slug: c.slug,
  price: String(c.price),
  level: 'Cơ bản',
  structure: JSON.stringify(
    c.sections.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: s.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes })),
    })),
  ),
  ...extra,
});

test('CTV sửa thông tin khóa đã xuất bản → Chờ duyệt (ẩn công khai); admin duyệt lại → xuất bản', async () => {
  const { Course } = require('../src/models');
  const c = await createCourse({ author: ctv._id, title: 'Khóa CTV đã duyệt' });
  const agent = await login(app, 'ctvsua');
  const token = await csrf(agent, `/admin/courses/${c.id}/edit`);
  const res = await agent
    .post(`/admin/courses/${c.id}`)
    .type('form')
    .send({ _csrf: token, ...formBody(c, { title: 'Khóa CTV đã sửa', intent: 'keep', status: 'published' }) });
  assert.equal(res.status, 302);
  let saved = await Course.findById(c.id);
  assert.deepEqual([saved.title, saved.status, saved.published], ['Khóa CTV đã sửa', 'pending', false]);
  const pub = await (await login(app, 'hocvien')).get(`/courses/${c.slug}`);
  assert.equal(pub.status, 404, 'đang chờ duyệt → không hiện công khai');

  const admin = await login(app, 'quantri');
  const t2 = await csrf(admin, '/admin/courses');
  await admin.post(`/admin/courses/${c.id}/approve`).type('form').send({ _csrf: t2 });
  saved = await Course.findById(c.id);
  assert.deepEqual([saved.status, saved.published], ['published', true]);
});

test('CTV sửa 1 bài học của khóa đã xuất bản → Chờ duyệt; admin sửa thì vẫn xuất bản', async () => {
  const { Course } = require('../src/models');
  const c = await createCourse({ author: ctv._id });
  const lesson = c.lessons[0];
  const agent = await login(app, 'ctvsua');
  const url = `/admin/courses/${c.id}/lessons/${lesson.id}`;
  let token = await csrf(agent, url);
  await agent.post(url).type('form').send({ _csrf: token, title: 'Bài 1 (sửa)', minutes: '6', materials: '# Mới' });
  let saved = await Course.findById(c.id);
  assert.equal(saved.lessons[0].title, 'Bài 1 (sửa)');
  assert.equal(saved.status, 'pending');

  await Course.updateOne({ _id: c._id }, { status: 'published', published: true });
  const admin = await login(app, 'quantri');
  token = await csrf(admin, url);
  await admin.post(url).type('form').send({ _csrf: token, title: 'Bài 1 (admin sửa)', minutes: '6', materials: '' });
  saved = await Course.findById(c.id);
  assert.deepEqual([saved.lessons[0].title, saved.status], ['Bài 1 (admin sửa)', 'published']);
});

test('CTV sửa khóa nháp: vẫn tự chọn Lưu nháp / Gửi duyệt như cũ', async () => {
  const { Course } = require('../src/models');
  const c = await createCourse({ author: ctv._id, status: 'draft' });
  const agent = await login(app, 'ctvsua');
  const token = await csrf(agent, `/admin/courses/${c.id}/edit`);
  await agent
    .post(`/admin/courses/${c.id}`)
    .type('form')
    .send({ _csrf: token, ...formBody(c, { intent: 'draft' }) });
  assert.equal((await Course.findById(c.id)).status, 'draft');
});

// ---------- Giới hạn làm lại trắc nghiệm ----------
const QUIZ = [
  { question: 'Một cộng một?', options: ['1', '2', '3', '4'], answer: 1, explain: '1 + 1 = 2' },
  { question: 'Hai nhân hai?', options: ['4', '2', '3', '5'], answer: 0, explain: '2 × 2 = 4' },
];
async function quizCourse() {
  const { Enrollment, User } = require('../src/models');
  const c = await createCourse({
    price: 0,
    sections: [{ title: 'C1', lessons: [{ title: 'Bài có quiz', minutes: 5, quiz: QUIZ }] }],
  });
  const u = await User.findOne({ username: 'hocvien' });
  await Enrollment.create({ user: u._id, course: c._id });
  return { c, u, lessonId: c.lessons[0].id };
}
const submit = async (agent, c, lessonId, answers) => {
  const token = await csrf(agent, `/learn/${c.slug}?lesson=0&retry=1`);
  return agent.post(`/learn/${c.slug}/quiz`).type('form').send({ _csrf: token, lessonId, q0: answers[0], q1: answers[1] });
};

test('trắc nghiệm: 3 lần nộp trong 1 giờ được chấm, lần 4 bị chặn (kết quả giữ nguyên), quá 1 giờ được làm tiếp', async () => {
  const { Progress } = require('../src/models');
  const { c, u, lessonId } = await quizCourse();
  const agent = await login(app, 'hocvien');
  for (let i = 0; i < 3; i++) await submit(agent, c, lessonId, ['0', '1']); // sai cả 2
  let page = await agent.get(`/learn/${c.slug}?lesson=0&retry=1`);
  assert.match(page.text, /dùng hết 3 lần nộp/);
  assert.doesNotMatch(page.text, /class="quiz-form"/, 'hết lượt → không hiện form làm lại');

  await submit(agent, c, lessonId, ['1', '0']).catch(() => {});
  // csrf() ở trên lấy từ trang retry (đang chế độ xem kết quả) – gửi thẳng lần 4 với token của trang khác
  const token = await csrf(agent, '/my-courses');
  const blocked = await agent.post(`/learn/${c.slug}/quiz`).type('form').send({ _csrf: token, lessonId, q0: '1', q1: '0' });
  assert.equal(blocked.status, 302);
  let p = await Progress.findOne({ user: u._id, course: c._id });
  assert.equal(p.quizResults[0].correct, 0, 'lần nộp bị chặn không được chấm');
  assert.equal(p.quizResults[0].passed, false);
  assert.equal(p.quizAttempts.length, 3);

  // Giả lập đã qua 1 giờ
  await Progress.updateOne({ _id: p._id }, { $set: { 'quizAttempts.$[].at': new Date(Date.now() - 61 * 60 * 1000) } });
  page = await agent.get(`/learn/${c.slug}?lesson=0&retry=1`);
  assert.match(page.text, /class="quiz-form"/);
  await submit(agent, c, lessonId, ['1', '0']);
  p = await Progress.findOne({ user: u._id, course: c._id });
  assert.equal(p.quizResults[0].passed, true);
  assert.equal(p.quizAttempts.length, 1, 'lượt cũ hơn 1 giờ đã được dọn');
});

test('trắc nghiệm: 6 lần nộp cùng lúc chỉ 3 lần được tính (giữ lượt nguyên tử)', async () => {
  const { Progress } = require('../src/models');
  const { c, u, lessonId } = await quizCourse();
  const agent = await login(app, 'hocvien');
  const token = await csrf(agent, `/learn/${c.slug}?lesson=0`);
  await Promise.all(
    Array.from({ length: 6 }, () => agent.post(`/learn/${c.slug}/quiz`).type('form').send({ _csrf: token, lessonId, q0: '1', q1: '0' })),
  );
  const p = await Progress.findOne({ user: u._id, course: c._id });
  assert.equal(p.quizAttempts.length, 3);
});
