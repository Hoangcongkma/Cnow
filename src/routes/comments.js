// Bình luận ngắn ở trang khóa học: học viên đã ghi danh (hoặc staff) viết; admin ẩn/hiện ở /admin/comments
const { trusted } = require('mongoose');
const { validate } = require('../validators');
const S = require('../validators/schemas');
const router = require('express').Router();
const { Course, CourseComment } = require('../models');
const { access } = require('../services/access');

const MAX_LEN = 500;
const MAX_PER_HOUR = 5;
const PER_PAGE = 10;

/** Trang bình luận đang hiện của khóa học (mới nhất trước). */
async function loadComments(course, rawPage) {
  const filter = { course: course._id, hidden: false };
  const total = await CourseComment.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(String(rawPage || ''), 10) || 1));
  const items = await CourseComment.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PER_PAGE)
    .limit(PER_PAGE)
    .populate('user', 'name avatar role isDemo');
  return { items, total, page, pages };
}

router.post('/courses/:slug/comments', validate(S.comments.create), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });
  const back = `/courses/${course.slug}#comments`;
  const { full } = await access(req, course);
  if (!full) {
    req.session.flash = { type: 'warn', text: 'Chỉ học viên của khóa học mới được bình luận.' };
    return res.redirect(back);
  }
  const content = String(req.body.content || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (content.length < 2 || content.length > MAX_LEN) {
    req.session.flash = { type: 'warn', text: `Bình luận dài 2–${MAX_LEN} ký tự.` };
    return res.redirect(back);
  }
  const recent = await CourseComment.countDocuments({
    user: req.user._id,
    createdAt: trusted({ $gte: new Date(Date.now() - 3600 * 1000) }),
  });
  if (recent >= MAX_PER_HOUR) {
    req.session.flash = { type: 'warn', text: `Bạn đã bình luận ${MAX_PER_HOUR} lần trong 1 giờ qua. Vui lòng thử lại sau.` };
    return res.redirect(back);
  }
  await CourseComment.create({ course: course._id, user: req.user._id, content });
  req.session.flash = { type: 'success', text: 'Đã đăng bình luận.' };
  res.redirect(back);
});

module.exports = router;
module.exports.loadComments = loadComments;
