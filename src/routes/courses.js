const { trusted } = require('mongoose');
const { validate } = require('../validators');
const { safeRedirect, escapeRegex } = require('../utils/security');
const S = require('../validators/schemas');
const router = require('express').Router();
const { Course, Enrollment, User, Progress, Note, Post, Review, Certificate } = require('../models');
const { ensureCertificate } = require('./reviews');
const coupons = require('../services/coupon');
const { requireLogin } = require('../middlewares/auth');
const { renderDoc } = require('../services/markdown');
const { summarize } = require('../services/progress');
const { grade, resultFor, PASS_RATIO, MAX_ATTEMPTS, attemptsInfo, takeAttempt, minutesUntil } = require('../services/quiz');
const { access, isInstructor, isStaff } = require('../services/access');
const { loadThread } = require('./qa');
const { loadComments } = require('./comments');

router.get('/', validate(S.none), async (req, res) => {
  const [courses, learners, enrollments] = await Promise.all([
    Course.find({ published: true }).sort({ createdAt: 1 }).limit(6),
    User.countDocuments({ role: 'user' }),
    Enrollment.countDocuments(),
  ]);
  res.render('home', {
    title: 'Cộng đồng học lập trình online',
    courses,
    stats: { courses: await Course.countDocuments({ published: true }), learners, enrollments },
  });
});

const LEVELS = ['Cơ bản', 'Trung cấp', 'Nâng cao'];
const SORTS = {
  new: { label: 'Mới nhất', sort: { createdAt: -1 } },
  'price-asc': { label: 'Giá tăng dần', sort: { price: 1, createdAt: -1 } },
  'price-desc': { label: 'Giá giảm dần', sort: { price: -1, createdAt: -1 } },
  rating: { label: 'Đánh giá cao', sort: { ratingAvg: -1, ratingCount: -1, createdAt: -1 } },
};
const PER_PAGE = 12;

router.get('/courses', validate(S.courses.list), async (req, res) => {
  // Mọi tham số đều được ép kiểu/đối chiếu whitelist (chống NoSQL injection) và giữ lại trên URL
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const params = {
    q: String(one(req.query.q) || '')
      .trim()
      .slice(0, 60),
    level: LEVELS.includes(one(req.query.level)) ? one(req.query.level) : '',
    price: ['free', 'paid'].includes(one(req.query.price)) ? one(req.query.price) : '',
    rating: ['3', '4', '4.5'].includes(one(req.query.rating)) ? one(req.query.rating) : '',
    sort: SORTS[one(req.query.sort)] ? one(req.query.sort) : 'new',
  };
  const filter = { published: true };
  if (params.q) filter.title = trusted({ $regex: escapeRegex(params.q), $options: 'i' });
  if (params.level) filter.level = params.level;
  if (params.price === 'free') filter.price = 0;
  if (params.price === 'paid') filter.price = trusted({ $gt: 0 });
  if (params.rating) filter.ratingAvg = trusted({ $gte: Number(params.rating) });
  const total = await Course.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(req.query.page), 10) || 1));
  const courses = await Course.find(filter)
    .sort(SORTS[params.sort].sort)
    .skip((page - 1) * PER_PAGE)
    .limit(PER_PAGE);
  const owned = req.user ? (await Enrollment.find({ user: req.user.id }).select('course')).map((e) => String(e.course)) : [];
  // Tạo URL giữ nguyên bộ lọc hiện tại, chỉ thay các tham số truyền vào
  const urlWith = (over) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, page: String(page), ...over }))
      if (v && !(k === 'sort' && v === 'new') && !(k === 'page' && v === '1')) p.set(k, v);
    const s = p.toString();
    return '/courses' + (s ? `?${s}` : '');
  };
  res.render('courses/list', {
    title: 'Khóa học',
    courses,
    owned,
    params,
    total,
    page,
    pages,
    urlWith,
    levels: LEVELS,
    sorts: SORTS,
    q: params.q,
  });
});

// ---------- Yêu thích ----------
router.post('/wishlist/:courseId', requireLogin, validate(S.courses.wishlist), async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, published: true }).catch(() => null);
  const back = safeRedirect(req.body.back, '/wishlist');
  if (!course) return res.redirect(back);
  const has = req.user.wishlist.some((id) => String(id) === course.id);
  await User.updateOne({ _id: req.user._id }, has ? { $pull: { wishlist: course._id } } : { $addToSet: { wishlist: course._id } });
  req.session.flash = {
    type: 'success',
    text: has ? `Đã bỏ “${course.title}” khỏi danh sách yêu thích.` : `Đã thêm “${course.title}” vào danh sách yêu thích.`,
  };
  res.redirect(back);
});

router.get('/wishlist', requireLogin, validate(S.none), async (req, res) => {
  const courses = await Course.find({ _id: trusted({ $in: req.user.wishlist }), published: true });
  const order = req.user.wishlist.map(String).reverse(); // mới thêm lên trước
  courses.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const owned = (await Enrollment.find({ user: req.user.id }).select('course')).map((e) => String(e.course));
  res.render('user/wishlist', { title: 'Khóa học yêu thích', courses, owned });
});

router.get('/courses/:slug', validate(S.courses.detail), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true }).populate('author', 'name');
  if (!course) return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });
  const enrolled = req.user ? await Enrollment.exists({ user: req.user.id, course: course.id }) : false;
  const [questions, reviews, myReview, comments] = await Promise.all([
    Post.countDocuments({ course: course.id, parent: null, hidden: false }),
    Review.find({ course: course.id }).sort({ updatedAt: -1 }).limit(30).populate('user', 'name avatar isDemo'),
    req.user ? Review.findOne({ user: req.user.id, course: course.id }) : null,
    loadComments(course, req.query.cpage),
  ]);
  // Xem trước giá với mã giảm giá (?coupon=CODE) – tính ở server; khi bấm mua, /pay tính lại từ đầu
  let couponView = null;
  const rawCoupon = typeof req.query.coupon === 'string' ? req.query.coupon : '';
  if (rawCoupon && !enrolled && course.price > 0) {
    const { coupon, error } = await coupons.findValid(rawCoupon, course, req.user);
    couponView = coupon ? { code: coupon.code, ...coupons.priceWith(course, coupon) } : { error, code: coupons.normalize(rawCoupon) };
  }
  res.render('courses/detail', {
    couponView,
    title: course.title,
    description: `${course.summary || course.title} · ${course.lessons.length} bài học · ${course.price === 0 ? 'Miễn phí' : '$' + course.price.toFixed(2)}`,
    ogType: 'article',
    course,
    enrolled: Boolean(enrolled),
    questions,
    reviews,
    myReview,
    comments,
    staff: isStaff(req.user),
  });
});

const notFound = (res) => res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });

// Học khóa học: chỉ người đã ghi danh (hoặc bài học thử)
router.get('/learn/:slug', requireLogin, validate(S.courses.learn), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return notFound(res);
  const { full } = await access(req, course);
  const progress = full ? await Progress.findOne({ user: req.user.id, course: course.id }) : null;
  const summary = summarize(course, progress);
  // Không chỉ định bài → mở đúng bài đang học dở
  const wanted = req.query.lesson === undefined ? summary.resume : Number(req.query.lesson) || 0;
  const idx = Math.max(0, Math.min(wanted, course.lessons.length - 1));
  const lesson = course.lessons[idx];
  if (!full && !(lesson && lesson.preview)) {
    req.session.flash = { type: 'warn', text: 'Bạn cần mua khóa học để xem bài học này.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  if (full && lesson && String(progress?.lastLesson) !== String(lesson._id)) {
    await Progress.updateOne({ user: req.user.id, course: course.id }, { $set: { lastLesson: lesson._id } }, { upsert: true });
  }
  // Trắc nghiệm: chỉ gửi câu hỏi + phương án; đáp án/giải thích chỉ có sau khi đã nộp (và không bấm "Làm lại")
  let quiz = null;
  if (full && lesson?.quiz?.length) {
    const result = resultFor(progress, lesson._id);
    const attempts = attemptsInfo(progress, lesson._id);
    // Hết lượt làm lại → vẫn ở chế độ xem kết quả, kèm thời điểm được làm tiếp
    const review = result && (req.query.retry === undefined || !attempts.left) && result.answers.length === lesson.quiz.length;
    quiz = {
      result,
      review,
      attempts: { ...attempts, max: MAX_ATTEMPTS, waitMinutes: attempts.retryAt ? minutesUntil(attempts.retryAt) : 0 },
      passRatio: PASS_RATIO,
      items: lesson.quiz.map((q, i) => ({
        question: q.question,
        options: q.options,
        ...(review ? { answer: q.answer, explain: q.explain, chosen: result.answers[i] } : {}),
      })),
    };
  }
  const notes =
    full && lesson ? await Note.find({ user: req.user.id, course: course.id, lesson: lesson._id }).sort({ seconds: 1, createdAt: 1 }) : [];
  const thread = lesson ? await loadThread(course, lesson, req.user) : [];
  const cert = summary.finished ? await Certificate.findOne({ user: req.user.id, course: course.id }) : null;
  const doc = renderDoc(lesson?.materials);
  res.render('courses/learn', {
    title: course.title,
    course,
    lesson,
    idx,
    enrolled: full,
    summary,
    quiz,
    notes,
    thread,
    cert,
    instructor: isInstructor(req.user, course),
    materialsHtml: doc.html,
    toc: doc.toc,
  });
});

// Phòng chat của khóa học (Socket.IO): học viên đã ghi danh và giảng viên (tác giả khóa học, admin)
router.get('/courses/:slug/chat', requireLogin, validate(S.courses.chat), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true }).select('title slug author');
  if (!course) return notFound(res);
  const teacher = isInstructor(req.user, course);
  if (!teacher && !(await Enrollment.exists({ user: req.user.id, course: course.id }))) {
    req.session.flash = { type: 'warn', text: 'Chỉ học viên đã ghi danh mới vào được phòng chat của khóa học.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  res.render('courses/chat', { title: `Chat – ${course.title}`, course, teacher });
});

// Đánh dấu đã học / bỏ đánh dấu một bài, rồi tự sang bài tiếp theo
router.post('/learn/:slug/complete', requireLogin, validate(S.courses.complete), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return notFound(res);
  const { full } = await access(req, course);
  const found = course.findLesson(String(req.body.lessonId || ''));
  if (!full || !found) {
    req.session.flash = { type: 'warn', text: 'Bạn cần ghi danh khóa học để lưu tiến độ.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  const { lesson, index } = found;
  if (req.body.undo !== '1' && lesson.quiz?.length) {
    const progress = await Progress.findOne({ user: req.user.id, course: course.id });
    if (!resultFor(progress, lesson._id)?.passed) {
      req.session.flash = { type: 'warn', text: `Hãy làm trắc nghiệm và đúng từ ${PASS_RATIO * 100}% trở lên trước khi đánh dấu đã học.` };
      return res.redirect(`/learn/${course.slug}?lesson=${index}#quiz`);
    }
  }
  if (req.body.undo === '1') {
    await Progress.updateOne({ user: req.user.id, course: course.id }, { $pull: { completedLessons: lesson._id } });
    return res.redirect(`/learn/${course.slug}?lesson=${index}`);
  }
  const progress = await Progress.findOneAndUpdate(
    { user: req.user.id, course: course.id },
    { $addToSet: { completedLessons: lesson._id }, $set: { lastLesson: lesson._id } },
    { upsert: true, new: true },
  );
  const summary = summarize(course, progress);
  if (summary.finished) {
    const cert = await ensureCertificate(req.user, course, progress);
    req.session.flash = {
      type: 'success',
      text: `🎉 Chúc mừng! Bạn đã hoàn thành khóa học “${course.title}”.${cert ? ' Chứng nhận của bạn đã được cấp.' : ''}`,
    };
    return res.redirect(`/learn/${course.slug}?lesson=${index}`);
  }
  const next = index + 1 < course.lessons.length ? index + 1 : summary.resume;
  req.session.flash = { type: 'success', text: `✓ Đã học xong “${lesson.title}”.` };
  res.redirect(`/learn/${course.slug}?lesson=${next}`);
});

// Nộp trắc nghiệm: chấm ở server, lưu kết quả vào Progress rồi quay lại trang học để xem giải thích
router.post('/learn/:slug/quiz', requireLogin, validate(S.courses.quiz), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return notFound(res);
  const { full } = await access(req, course);
  const found = course.findLesson(String(req.body.lessonId || ''));
  if (!full || !found || !found.lesson.quiz?.length) {
    req.session.flash = { type: 'warn', text: 'Bạn cần ghi danh khóa học để làm trắc nghiệm.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  const { lesson, index } = found;
  await Progress.updateOne(
    { user: req.user.id, course: course.id },
    { $setOnInsert: { user: req.user.id, course: course.id } },
    { upsert: true },
  );
  if (!(await takeAttempt(Progress, req.user._id, course._id, lesson._id))) {
    const info = attemptsInfo(await Progress.findOne({ user: req.user.id, course: course.id }), lesson._id);
    req.session.flash = {
      type: 'warn',
      text: `Bạn đã nộp ${MAX_ATTEMPTS} lần trong 1 giờ qua cho bài này. Hãy ôn lại phần giải thích và thử lại sau khoảng ${minutesUntil(info.retryAt || new Date())} phút.`,
    };
    return res.redirect(`/learn/${course.slug}?lesson=${index}#quiz`);
  }
  const r = grade(lesson.quiz, req.body);
  const progress = await Progress.findOne({ user: req.user.id, course: course.id });
  const prev = resultFor(progress, lesson._id);
  const entry = { lesson: lesson._id, ...r, passed: r.passed || Boolean(prev?.passed), at: new Date() };
  // Thay kết quả của bài này bằng 1 lệnh cập nhật nguyên tử (nộp đồng thời không gây VersionError / mất kết quả bài khác)
  await Progress.updateOne({ _id: progress._id }, [
    {
      $set: {
        quizResults: {
          $concatArrays: [
            { $filter: { input: { $ifNull: ['$quizResults', []] }, cond: trusted({ $ne: ['$$this.lesson', lesson._id] }) } },
            [{ $literal: entry }],
          ],
        },
      },
    },
  ]);
  req.session.flash = r.passed
    ? { type: 'success', text: `Bạn đúng ${r.correct}/${r.total} câu (${r.pct}%) – đạt! Giờ bạn có thể đánh dấu đã học.` }
    : {
        type: 'warn',
        text: `Bạn đúng ${r.correct}/${r.total} câu (${r.pct}%). Cần từ ${PASS_RATIO * 100}% – xem giải thích và làm lại nhé.`,
      };
  res.redirect(`/learn/${course.slug}?lesson=${index}#quiz`);
});

// ---------- Ghi chú cá nhân theo mốc thời gian video ----------
const noteSeconds = (v) => Math.min(86400, Math.max(0, Math.floor(Number(v)) || 0));
const noteText = (v) =>
  String(v || '')
    .trim()
    .slice(0, 1000);

router.post('/learn/:slug/notes', requireLogin, validate(S.courses.noteCreate), async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, published: true });
  if (!course) return notFound(res);
  const { full } = await access(req, course);
  const found = course.findLesson(String(req.body.lessonId || ''));
  if (!full || !found) {
    req.session.flash = { type: 'warn', text: 'Bạn cần ghi danh khóa học để ghi chú.' };
    return res.redirect(`/courses/${course.slug}`);
  }
  const text = noteText(req.body.text);
  if (!text) req.session.flash = { type: 'warn', text: 'Ghi chú không được để trống.' };
  else if ((await Note.countDocuments({ user: req.user.id, course: course.id })) >= 500)
    req.session.flash = { type: 'warn', text: 'Mỗi khóa học tối đa 500 ghi chú.' };
  else await Note.create({ user: req.user.id, course: course.id, lesson: found.lesson._id, seconds: noteSeconds(req.body.seconds), text });
  res.redirect(`/learn/${course.slug}?lesson=${found.index}#notes`);
});

// Sửa / xóa: chỉ chủ ghi chú
async function ownNote(req, res) {
  const note = await Note.findOne({ _id: req.params.id, user: req.user.id }).catch(() => null);
  if (!note) {
    res.status(404).render('error', { title: 'Không tìm thấy', message: 'Ghi chú không tồn tại.' });
    return null;
  }
  const course = await Course.findById(note.course);
  const found = course && course.findLesson(note.lesson);
  return { note, back: course ? `/learn/${course.slug}?lesson=${found ? found.index : 0}#notes` : '/my-courses' };
}
router.post('/notes/:id', requireLogin, validate(S.courses.noteUpdate), async (req, res) => {
  const ctx = await ownNote(req, res);
  if (!ctx) return;
  const text = noteText(req.body.text);
  if (!text) req.session.flash = { type: 'warn', text: 'Ghi chú không được để trống.' };
  else {
    ctx.note.text = text;
    if (req.body.seconds !== undefined) ctx.note.seconds = noteSeconds(req.body.seconds);
    await ctx.note.save();
  }
  res.redirect(ctx.back);
});
router.post('/notes/:id/delete', requireLogin, validate(S.courses.noteDelete), async (req, res) => {
  const ctx = await ownNote(req, res);
  if (!ctx) return;
  await ctx.note.deleteOne();
  res.redirect(ctx.back);
});

router.get('/my-courses', requireLogin, validate(S.none), async (req, res) => {
  const enrollments = (await Enrollment.find({ user: req.user.id }).sort({ createdAt: -1 }).populate('course')).filter((e) => e.course);
  const progresses = await Progress.find({ user: req.user.id, course: trusted({ $in: enrollments.map((e) => e.course._id) }) });
  const byCourse = new Map(progresses.map((p) => [String(p.course), p]));
  const certs = new Map((await Certificate.find({ user: req.user.id })).map((x) => [String(x.course), x]));
  const items = enrollments.map((e) => ({
    e,
    c: e.course,
    s: summarize(e.course, byCourse.get(String(e.course._id))),
    cert: certs.get(String(e.course._id)),
  }));
  res.render('user/my-courses', { title: 'Khóa học của tôi', items });
});

module.exports = router;
