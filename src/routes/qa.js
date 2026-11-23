// Hỏi – Đáp theo bài học: đặt câu hỏi, trả lời lồng 1 cấp, vote hữu ích, giảng viên chọn câu trả lời hay nhất
const { trusted } = require('mongoose');
const { validate } = require('../validators');
const S = require('../validators/schemas');
const router = require('express').Router();
const communityLimiter = require('../security/rate-limit').limits.community();
const { Course, Post } = require('../models');
const { access, isInstructor } = require('../services/access');
const { notify } = require('../services/notify');

const MAX_PER_HOUR = 10;
const MAX_LEN = 2000;

/** Tải câu hỏi + câu trả lời (không bị ẩn) của một bài học, sắp xếp sẵn cho view. */
async function loadThread(course, lesson, me) {
  const questions = await Post.find({ course: course._id, lesson: lesson._id, parent: null, hidden: false })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user', 'name role avatar isDemo');
  const answers = questions.length
    ? await Post.find({ parent: trusted({ $in: questions.map((q) => q._id) }), hidden: false }).populate('user', 'name role avatar isDemo')
    : [];
  const myId = me ? String(me._id) : '';
  const shape = (p) => ({
    id: String(p._id),
    content: p.content,
    createdAt: p.createdAt,
    best: p.best,
    user: p.user,
    mine: myId && String(p.user?._id) === myId,
    votes: p.votes.length,
    voted: myId ? p.votes.some((v) => String(v) === myId) : false,
    isInstructorPost: Boolean(p.user) && isInstructor(p.user, course),
  });
  return questions.map((q) => ({
    ...shape(q),
    answers: answers
      .filter((a) => String(a.parent) === String(q._id))
      .map(shape)
      .sort((a, b) => b.best - a.best || b.votes - a.votes || a.createdAt - b.createdAt),
  }));
}

const back = (course, index) => `/learn/${course.slug}?lesson=${index}#qa`;

// Đặt câu hỏi hoặc trả lời
router.post('/learn/:slug/qa', communityLimiter, validate(S.qa.post), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });
  const { full } = await access(req, course);
  const found = course.findLesson(String(req.body.lessonId || ''));
  if (!full || !found) {
    req.session.flash = { type: 'warn', text: 'Chỉ học viên của khóa học mới được hỏi đáp.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  const content = String(req.body.content || '').trim();
  let parent = null;
  if (req.body.parent) {
    parent = await Post.findOne({
      _id: String(req.body.parent),
      course: course._id,
      lesson: found.lesson._id,
      parent: null,
      hidden: false,
    }).catch(() => null);
    if (!parent) {
      req.session.flash = { type: 'warn', text: 'Câu hỏi không tồn tại hoặc đã bị ẩn.' };
      return res.redirect(back(course, found.index));
    }
  }
  if (content.length < 2 || content.length > MAX_LEN) {
    req.session.flash = { type: 'warn', text: `Nội dung dài 2–${MAX_LEN} ký tự.` };
    return res.redirect(back(course, found.index));
  }
  // Chống spam: tối đa 10 bài viết (câu hỏi + trả lời) mỗi giờ cho mỗi người
  const recent = await Post.countDocuments({ user: req.user.id, createdAt: trusted({ $gte: new Date(Date.now() - 3600 * 1000) }) });
  if (recent >= MAX_PER_HOUR) {
    req.session.flash = { type: 'warn', text: `Bạn đã đăng ${MAX_PER_HOUR} bài trong 1 giờ qua. Vui lòng thử lại sau.` };
    return res.redirect(back(course, found.index));
  }
  await Post.create({ course: course._id, lesson: found.lesson._id, user: req.user.id, parent: parent ? parent._id : null, content });
  // Báo cho người hỏi khi có người khác trả lời
  if (parent && String(parent.user) !== req.user.id) {
    await notify(parent.user, {
      type: 'qa_reply',
      text: `${req.user.name} đã trả lời câu hỏi của bạn trong bài “${found.lesson.title}”.`,
      link: back(course, found.index),
    });
  }
  req.session.flash = { type: 'success', text: parent ? 'Đã gửi câu trả lời.' : 'Đã đăng câu hỏi.' };
  res.redirect(back(course, found.index));
});

async function loadPost(req, res) {
  const post = await Post.findOne({ _id: req.params.id, hidden: false }).catch(() => null);
  const course = post && (await Course.findOne({ _id: post.course, published: true }));
  const found = course && course.findLesson(post.lesson);
  if (!found) {
    res.status(404).render('error', { title: 'Không tìm thấy', message: 'Bài viết không tồn tại.' });
    return null;
  }
  return { post, course, index: found.index };
}

// Vote "Hữu ích" (bấm lần nữa để bỏ vote). Không tự vote bài của mình.
router.post('/qa/:id/vote', validate(S.qa.action), async (req, res) => {
  const ctx = await loadPost(req, res);
  if (!ctx) return;
  const { post, course, index } = ctx;
  const { full } = await access(req, course);
  if (!full) {
    req.session.flash = { type: 'warn', text: 'Chỉ học viên của khóa học mới được vote.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  if (String(post.user) === req.user.id) req.session.flash = { type: 'warn', text: 'Không thể tự vote bài viết của mình.' };
  else {
    const has = post.votes.some((v) => String(v) === req.user.id);
    await Post.updateOne({ _id: post._id }, has ? { $pull: { votes: req.user._id } } : { $addToSet: { votes: req.user._id } });
  }
  res.redirect(back(course, index));
});

// Giảng viên (tác giả khóa học hoặc admin) chọn / bỏ chọn câu trả lời hay nhất
router.post('/qa/:id/best', validate(S.qa.action), async (req, res) => {
  const ctx = await loadPost(req, res);
  if (!ctx) return;
  const { post, course, index } = ctx;
  if (!isInstructor(req.user, course) || !post.parent) {
    return res
      .status(403)
      .render('error', { title: 'Không có quyền', message: 'Chỉ giảng viên của khóa học mới chọn được câu trả lời hay nhất.' });
  }
  const makeBest = !post.best;
  await Post.updateMany({ parent: post.parent }, { $set: { best: false } });
  if (makeBest) await Post.updateOne({ _id: post._id }, { $set: { best: true } });
  res.redirect(back(course, index));
});

module.exports = router;
module.exports.loadThread = loadThread;
