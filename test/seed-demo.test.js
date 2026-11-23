// Dữ liệu demo: seed 500 học viên, tỉ lệ đơn hàng, tính tiền đúng, chạy lại không nhân đôi, cùng seed cùng dữ liệu,
// unseed xóa sạch về 0, dữ liệu thật giữ nguyên; trang quản trị phân trang / tìm kiếm / lọc / CSV đúng; nhãn "Dữ liệu mẫu"
const { trusted } = require('mongoose');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, login, request } = require('./helpers');

let app;
let report;
let real;
const M = () => require('../src/models');
before(async () => {
  app = await setup();
  const ctv = await createUser('ctvthat', 'collaborator');
  await createUser('quantri', 'admin');
  real = await createUser('hocvienthat');
  const { seedCourses } = require('../scripts/seed');
  await seedCourses(ctv._id);
  const { Enrollment, Course } = M();
  await Enrollment.create({ user: real._id, course: (await Course.findOne({ slug: 'html-css' }))._id });
  const t0 = Date.now();
  report = await require('../scripts/seed-demo').seedDemo({ seed: 2026, users: 500 });
  report.ms = Date.now() - t0;
});
after(teardown);

test('seed 500 học viên + 10 CTV, ~5% bị khóa; mọi bản ghi demo có isDemo, email @demo.cnow.local, username không dấu + số', async () => {
  const { User } = M();
  const demo = await User.find({ isDemo: true }).lean();
  assert.equal(demo.filter((u) => u.role === 'user').length, 500);
  assert.equal(demo.filter((u) => u.role === 'collaborator').length, 10);
  const locked = demo.filter((u) => u.locked).length;
  assert.ok(locked >= 10 && locked <= 45, `bị khóa ${locked}`);
  assert.ok(demo.every((u) => u.email.endsWith('@demo.cnow.local')));
  assert.equal(new Set(demo.map((u) => u.email)).size, demo.length, 'email không trùng');
  assert.ok(demo.filter((u) => u.role === 'user').every((u) => /^[a-z]+\d+$/.test(u.username)));
  assert.equal(new Set(demo.map((u) => u.passwordHash)).size, 1, 'chỉ băm 1 mật khẩu dùng chung');
  assert.ok(report.ms < 60000, `seed mất ${report.ms} ms`);
});

test('đơn hàng ~1.600: ~85% thành công / 8% thất bại / 5% hủy / 2% hoàn tiền, ~15% đơn có phí dùng mã; tiền tính như luồng thật', async () => {
  const { Order, Enrollment, Course, Coupon } = M();
  const orders = await Order.find({ isDemo: true }).lean();
  const n = orders.length;
  assert.ok(n >= 1400 && n <= 1800, `${n} đơn`);
  const pct = (s) => orders.filter((o) => o.status === s).length / n;
  assert.ok(Math.abs(pct('COMPLETED') - 0.85) < 0.02, `thành công ${pct('COMPLETED')}`);
  assert.ok(Math.abs(pct('FAILED') - 0.08) < 0.01);
  assert.ok(Math.abs(pct('CANCELLED') - 0.05) < 0.01);
  assert.ok(Math.abs(pct('REFUNDED') - 0.02) < 0.01);
  const paid = orders.filter((o) => o.provider === 'demo');
  const withCoupon = paid.filter((o) => o.couponCode).length / paid.length;
  assert.ok(withCoupon > 0.1 && withCoupon < 0.2, `dùng mã ${withCoupon}`);
  const { priceWith } = require('../src/services/coupon');
  const { toVnd } = require('../src/services/money');
  const courses = new Map((await Course.find()).map((c) => [String(c._id), c]));
  const coupons = new Map((await Coupon.find({ isDemo: true })).map((c) => [String(c._id), c]));
  for (const o of paid) {
    const p = priceWith(courses.get(String(o.course)), o.coupon ? coupons.get(String(o.coupon)) : null);
    assert.equal(o.amount, p.final);
    assert.equal(o.amountVnd, toVnd(p.final));
    if (['COMPLETED', 'REFUNDED'].includes(o.status)) assert.match(o.captureId, /^DEMO-[0-9A-F]{8}$/);
  }
  // Thành công ↔ có ghi danh; hoàn tiền ↔ không còn quyền học
  const enr = new Set((await Enrollment.find({ isDemo: true }).lean()).map((e) => `${e.user}:${e.course}`));
  for (const o of orders.filter((x) => x.status === 'COMPLETED')) assert.ok(enr.has(`${o.user}:${o.course}`));
  for (const o of orders.filter((x) => x.status === 'REFUNDED')) assert.ok(!enr.has(`${o.user}:${o.course}`));
  const perUser = enr.size / 500;
  assert.ok(perUser >= 2 && perUser <= 3.2, `ghi danh TB ${perUser}`);
  // Khóa miễn phí: có ghi danh, không tính doanh thu
  const free = orders.filter((o) => o.provider === 'free');
  assert.ok(free.length > 100 && free.every((o) => o.amount === '0.00'));
  // Doanh thu tháng 9 và 12 cao hơn tháng liền trước
  const rev = report.revenue;
  const keys = Object.keys(rev);
  for (const m of ['-09', '-12']) {
    const i = keys.findIndex((k) => k.endsWith(m));
    if (i > 0) assert.ok(rev[keys[i]] > rev[keys[i - 1]], `${keys[i]} > ${keys[i - 1]}`);
  }
});

test('học tập + cộng đồng: tiến độ đa dạng, chứng nhận cho người xong 100%, ~300 câu hỏi (~70% có trả lời), bình luận, đánh giá, chat', async () => {
  const { Progress, Certificate, Post, CourseComment, Review, ChatMessage, Course } = M();
  const progress = await Progress.find({ isDemo: true }).populate('course', 'sections');
  const full = progress.filter((p) => p.completedLessons.length === p.course.lessons.length);
  assert.ok(full.length > 100);
  assert.equal(await Certificate.countDocuments({ isDemo: true }), full.length);
  const questions = await Post.find({ isDemo: true, parent: null }).lean();
  assert.ok(questions.length >= 280 && questions.length <= 320, `${questions.length} câu hỏi`);
  const answered = new Set((await Post.find({ isDemo: true, parent: trusted({ $ne: null }) }).lean()).map((a) => String(a.parent)));
  const ratio = questions.filter((q) => answered.has(String(q._id))).length / questions.length;
  assert.ok(ratio > 0.6 && ratio < 0.8, `có trả lời ${ratio}`);
  const best = await Post.countDocuments({ isDemo: true, best: true });
  assert.ok(best / questions.length > 0.2 && best / questions.length < 0.4, `hay nhất ${best}`);
  const comments = await CourseComment.countDocuments({ isDemo: true });
  assert.ok(comments >= 350 && comments <= 420, `${comments} bình luận`);
  assert.ok((await CourseComment.countDocuments({ isDemo: true, hidden: true })) >= 6);
  const reviews = await Review.find({ isDemo: true }).lean();
  assert.ok(reviews.length >= 330 && reviews.length <= 360, `${reviews.length} đánh giá`);
  assert.ok(reviews.filter((r) => r.rating >= 4).length / reviews.length > 0.75);
  assert.ok(reviews.some((r) => r.rating <= 2 && r.content));
  const chat = await ChatMessage.countDocuments({ isDemo: true });
  assert.ok(chat >= 60 && chat <= 120);
  const c = await Course.findOne({ slug: 'html-css' });
  assert.ok(c.ratingCount > 30 && c.ratingAvg > 3.5, 'điểm đánh giá khóa học được tính lại');
});

test('nhãn "Dữ liệu mẫu" cạnh tên trong đánh giá / bình luận / hỏi – đáp; người dùng thật không có nhãn', async () => {
  const page = await request(app).get('/courses/html-css');
  assert.match(page.text, /class="demo-label"[^>]*>Dữ liệu mẫu</);
  const agent = await login(app, 'hocvienthat');
  const learn = await agent.get('/learn/html-css?lesson=1');
  assert.match(learn.text, /id="qa"/);
  assert.match(learn.text, /Dữ liệu mẫu/);
  assert.doesNotMatch(page.text, /bình luận bị ẩn|đã bị ẩn/i);
});

test('trang quản trị: 25 dòng/trang, tìm kiếm, lọc, CSV theo bộ lọc; /admin dưới 1 giây', async () => {
  const { User, Order, Course } = M();
  const admin = await login(app, 'quantri');
  const rows = (html) => (html.match(/<tr[ >]/g) || []).length - 1; // trừ dòng tiêu đề
  let res = await admin.get('/admin/users?page=2');
  assert.equal(res.status, 200);
  assert.equal(rows(res.text), 25);
  const u = await User.findOne({ isDemo: true, role: 'user' }).sort({ createdAt: 1 });
  res = await admin.get(`/admin/users?q=${u.username}`);
  assert.equal(rows(res.text), 1);
  assert.match(res.text, new RegExp(u.username));
  res = await admin.get('/admin/users?role=collaborator');
  assert.match(res.text, /\/ <b>11<\/b>/, '10 CTV demo + 1 CTV thật');
  res = await admin.get('/admin/users?q=a.*(b+)+$'); // ký tự regex được escape
  assert.equal(res.status, 200);

  res = await admin.get('/admin/orders?status=REFUNDED');
  const refunded = await Order.countDocuments({ status: 'REFUNDED' });
  assert.match(res.text, new RegExp(`/ <b>${refunded}</b>`));
  const csv = await admin.get('/admin/export/orders.csv?status=REFUNDED');
  assert.equal(csv.text.trim().split('\n').length - 1, refunded, 'CSV đúng bộ lọc');

  const html = await Course.findOne({ slug: 'html-css' });
  res = await admin.get(`/admin/learners?course=${html.id}&page=1`);
  assert.equal(rows(res.text), 25);
  const lcsv = await admin.get(`/admin/export/learners.csv?course=${html.id}`);
  const { Enrollment } = M();
  assert.equal(lcsv.text.trim().split('\n').length - 1, await Enrollment.countDocuments({ course: html._id }));

  res = await admin.get('/admin/comments?show=hidden');
  assert.equal(res.status, 200);
  assert.match(res.text, /Hiện lại/);

  await admin.get('/admin'); // làm nóng
  const t0 = Date.now();
  res = await admin.get('/admin');
  const ms = Date.now() - t0;
  assert.equal(res.status, 200);
  assert.ok(ms < 1000, `/admin mất ${ms} ms`);
});

test('chạy lại cùng seed: không nhân đôi, cùng bộ dữ liệu; unseed xóa sạch về 0, dữ liệu thật giữ nguyên', async () => {
  const { User, Enrollment } = M();
  const { seedDemo, unseedDemo, DEMO_MODELS } = require('../scripts/seed-demo');
  const names1 = (await User.find({ isDemo: true }).sort({ username: 1 }).lean()).map((u) => u.username);
  const r2 = await seedDemo({ seed: 2026, users: 500 });
  const names2 = (await User.find({ isDemo: true }).sort({ username: 1 }).lean()).map((u) => u.username);
  assert.deepEqual(names2, names1, 'cùng seed → cùng người dùng');
  assert.equal(r2.orders.total, report.orders.total);
  assert.equal(await User.countDocuments({ isDemo: true }), 510);

  const removed = await unseedDemo();
  assert.ok(removed.User === 510 && removed.Order > 1000);
  for (const name of DEMO_MODELS) assert.equal(await M()[name].countDocuments({ isDemo: true }), 0, name);
  assert.ok(await User.exists({ _id: real._id }), 'người dùng thật còn nguyên');
  assert.equal(await Enrollment.countDocuments({ user: real._id }), 1);
  const { Course } = M();
  assert.equal((await Course.findOne({ slug: 'html-css' })).ratingCount, 0, 'điểm đánh giá tính lại sau khi xóa');
});
