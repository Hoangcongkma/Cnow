// Đánh giá khóa học và chứng nhận hoàn thành
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Course, Enrollment, Review, Certificate, Progress } = require('../models');
const { summarize } = require('../services/progress');

/** Tính lại điểm trung bình và số lượt đánh giá của khóa học. */
async function refreshRating(courseId) {
  const [agg] = await Review.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(String(courseId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await Course.updateOne({ _id: courseId }, { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.n : 0 } });
}

/** Cấp chứng nhận nếu học viên đã ghi danh và hoàn thành 100% (gọi lại nhiều lần vẫn an toàn). */
async function ensureCertificate(user, course, progress) {
  if (!summarize(course, progress).finished) return null;
  if (!(await Enrollment.exists({ user: user._id, course: course._id }))) return null; // staff học thử không được cấp
  const existing = await Certificate.findOne({ user: user._id, course: course._id });
  if (existing) return existing;
  try {
    return await Certificate.create({
      user: user._id,
      course: course._id,
      code: crypto.randomBytes(8).toString('hex').toUpperCase(),
      name: user.name,
      courseTitle: course.title,
    });
  } catch (e) {
    if (e.code === 11000) return Certificate.findOne({ user: user._id, course: course._id }); // tạo đồng thời
    throw e;
  }
}

// Gửi / sửa đánh giá: chỉ học viên đã ghi danh, mỗi người 1 đánh giá
router.post('/courses/:slug/review', validate(S.reviews.review), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });
  const back = `/courses/${course.slug}#reviews`;
  if (!(await Enrollment.exists({ user: req.user.id, course: course.id }))) {
    req.session.flash = { type: 'warn', text: 'Chỉ học viên đã ghi danh mới được đánh giá khóa học.' };
    return res.redirect(back);
  }
  const rating = Number.parseInt(String(req.body.rating || ''), 10);
  const content = String(req.body.content || '')
    .trim()
    .slice(0, 1000);
  if (!(rating >= 1 && rating <= 5)) {
    req.session.flash = { type: 'warn', text: 'Hãy chọn từ 1 đến 5 sao.' };
    return res.redirect(back);
  }
  const r = await Review.updateOne({ user: req.user.id, course: course.id }, { $set: { rating, content } }, { upsert: true });
  await refreshRating(course._id);
  req.session.flash = { type: 'success', text: r.upsertedCount ? 'Cảm ơn bạn đã đánh giá khóa học!' : 'Đã cập nhật đánh giá của bạn.' };
  res.redirect(back);
});

// Chứng nhận: chủ sở hữu hoặc admin xem; người khác kiểm tra qua /verify/:code
router.get('/certificate/:id', validate(S.reviews.certificate), async (req, res) => {
  const cert = await Certificate.findById(req.params.id).catch(() => null);
  if (!cert || (String(cert.user) !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Chứng nhận không tồn tại.' });
  }
  res.render('certificate/show', {
    title: `Chứng nhận – ${cert.courseTitle}`,
    cert,
    verifyUrl: `${res.locals.baseUrl}/verify/${cert.code}`,
  });
});

// Lấy (hoặc cấp) chứng nhận của khóa học đã hoàn thành
router.post('/courses/:slug/certificate', validate(S.reviews.claim), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug });
  if (!course) return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });
  const progress = await Progress.findOne({ user: req.user.id, course: course.id });
  const cert = await ensureCertificate(req.user, course, progress);
  if (!cert) {
    req.session.flash = { type: 'warn', text: 'Hoàn thành 100% bài học để nhận chứng nhận.' };
    return res.redirect('/my-courses');
  }
  res.redirect(`/certificate/${cert.id}`);
});

// Trang công khai kiểm tra chứng nhận
router.get('/verify', validate(S.reviews.verifyQuery), (req, res) => {
  const code = String(req.query.code || '')
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase();
  if (code) return res.redirect(`/verify/${code}`);
  res.render('certificate/verify', { title: 'Kiểm tra chứng nhận', cert: null, code: '', checked: false });
});
router.get('/verify/:code', validate(S.reviews.verifyCode), async (req, res) => {
  const code = String(req.params.code)
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()
    .slice(0, 16);
  const cert = /^[0-9A-F]{16}$/.test(code) ? await Certificate.findOne({ code }) : null;
  res.status(cert ? 200 : 404).render('certificate/verify', { title: 'Kiểm tra chứng nhận', cert, code, checked: true });
});

module.exports = router;
module.exports.ensureCertificate = ensureCertificate;
