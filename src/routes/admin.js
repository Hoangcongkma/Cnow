// Trang quản trị – Quản trị viên: toàn quyền; Cộng tác viên: quản lý khóa học của mình và người học
const { trusted } = require('mongoose');
const { validate } = require('../validators');
const S = require('../validators/schemas');
const router = require('express').Router();
const { User, Course, Order, Enrollment, Comment, CourseComment, Post, AuditLog, AUDIT_ACTIONS, Progress, Coupon } = require('../models');
const { requireRole } = require('../middlewares/auth');
const { videoId, oembed } = require('../services/youtube');
const { renderMarkdown } = require('../services/markdown');
const { parseQuizForm } = require('../services/quiz');
const { audit } = require('../services/audit');
const { notifyNewLessons, notify } = require('../services/notify');
const listing = require('../services/listing');
// Quay lại đúng trang danh sách (giữ bộ lọc) sau khi thao tác – chỉ chấp nhận đường dẫn nội bộ /admin/…
const safeBack = (v, dflt) => safeRedirect(v, dflt, '/admin/');
const { safeRedirect } = require('../utils/security');
const orderLabels = require('../services/order-labels');
const { sendCsv } = require('../services/csv');
const { summarize } = require('../services/progress');

const staff = requireRole('admin', 'collaborator');
const adminOnly = requireRole('admin');

const canEdit = (user, course) => user.role === 'admin' || String(course.author) === String(user.id);
const COLORS = ['#f05123', '#e91e63', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#00897b', '#3f51b5'];

const MAX_SECTIONS = 50;
const MAX_LESSONS = 500;
const str = (v, max) =>
  String(v ?? '')
    .trim()
    .slice(0, max);

/**
 * Đọc cấu trúc chương/bài do trình dựng (public/js/app.js) gửi lên dạng JSON trong trường `structure`.
 * Bài học có id thuộc khóa học cũ được GIỮ NGUYÊN _id và mọi dữ liệu khác (tài liệu, trắc nghiệm…);
 * id lạ bị bỏ qua và coi như bài mới. Trả về { sections, errors }.
 */
function parseStructure(raw, oldCourse) {
  const errors = [];
  let input;
  try {
    input = JSON.parse(String(raw || '[]'));
  } catch {
    return { sections: [], errors: ['Dữ liệu chương/bài không hợp lệ – hãy bật JavaScript và thử lại.'] };
  }
  if (!Array.isArray(input)) input = [];
  if (input.length > MAX_SECTIONS) errors.push(`Tối đa ${MAX_SECTIONS} chương.`);
  const oldSections = new Map((oldCourse?.sections || []).map((s) => [String(s._id), s]));
  const oldLessons = new Map((oldCourse?.lessons || []).map((l) => [String(l._id), l]));
  const usedIds = new Set();
  let count = 0;
  const sections = input.slice(0, MAX_SECTIONS).map((s, si) => {
    const sec = { title: str(s?.title, 150) || `Chương ${si + 1}`, lessons: [] };
    if (oldSections.has(String(s?.id))) sec._id = oldSections.get(String(s.id))._id;
    for (const l of Array.isArray(s?.lessons) ? s.lessons : []) {
      if (++count > MAX_LESSONS) {
        errors.push(`Tối đa ${MAX_LESSONS} bài học.`);
        break;
      }
      const title = str(l?.title, 200);
      const rawVideo = str(l?.youtubeId, 200);
      const yt = rawVideo ? videoId(rawVideo) : null;
      if (!title) errors.push(`Chương ${si + 1}: có bài học chưa có tiêu đề.`);
      if (rawVideo && !yt) errors.push(`Bài “${title || '?'}”: link/mã video YouTube không hợp lệ.`);
      const lid = String(l?.id || '');
      const old = !usedIds.has(lid) && oldLessons.get(lid);
      if (old) usedIds.add(lid);
      const lesson = old ? old.toObject() : {};
      Object.assign(lesson, {
        title,
        youtubeId: yt || undefined,
        minutes: Math.min(600, Math.max(0, Math.round(Number(l?.minutes)) || 0)),
        preview: Boolean(l?.preview),
      });
      // Đổi video thì nguồn cũ không còn đúng → xóa, sẽ lấy lại qua oEmbed
      if (!old || old.youtubeId !== lesson.youtubeId)
        Object.assign(lesson, { sourceName: undefined, sourceUrl: undefined, license: undefined });
      sec.lessons.push(lesson);
    }
    return sec;
  });
  return { sections, errors };
}

/** Video mới (chưa có nguồn) phải được YouTube oEmbed xác nhận và ghi công tác giả. */
async function verifyVideos(sections) {
  const pending = sections.flatMap((s) => s.lessons).filter((l) => l.youtubeId && !l.sourceUrl);
  const errors = [];
  for (const l of pending.slice(0, 50)) {
    try {
      const info = await oembed(l.youtubeId, 6000);
      Object.assign(l, {
        sourceName: info.sourceName,
        sourceUrl: info.sourceUrl,
        license: 'Giấy phép chuẩn YouTube – chỉ nhúng, bản quyền thuộc tác giả',
      });
    } catch (e) {
      errors.push(`Bài “${l.title}”: YouTube không xác nhận được video ${l.youtubeId} (${e.message}).`);
    }
  }
  if (pending.length > 50) errors.push('Mỗi lần lưu chỉ thêm tối đa 50 video mới.');
  return errors;
}

/** Dữ liệu cho trình dựng chương/bài trong form (dạng thuần, có id dạng chuỗi). */
const builderData = (sections) =>
  (sections || []).map((s) => ({
    id: s._id ? String(s._id) : '',
    title: s.title,
    lessons: (s.lessons || []).map((l) => ({
      id: l._id ? String(l._id) : '',
      title: l.title,
      youtubeId: l.youtubeId || '',
      minutes: l.minutes ?? 10,
      preview: Boolean(l.preview),
      sourceName: l.sourceName || '',
    })),
  }));

function parseCourse(body) {
  return {
    title: String(body.title || '').trim(),
    slug: String(body.slug || '')
      .trim()
      .toLowerCase(),
    summary: String(body.summary || '').trim(),
    description: String(body.description || '').trim(),
    level: body.level,
    price: Math.round(Number(body.price) * 100) / 100,
    tag: String(body.tag || '').trim(),
    color: COLORS.includes(body.color) ? body.color : COLORS[0],
  };
}

const STATUSES = ['draft', 'pending', 'published', 'rejected'];
/**
 * Trạng thái sau khi lưu form. Admin chọn tự do. CTV chỉ "Lưu nháp" / "Gửi duyệt", KHÔNG tự xuất bản;
 * CTV sửa khóa ĐÃ xuất bản → quay về "Chờ duyệt" (admin phải duyệt lại nội dung mới), hoặc về nháp nếu chủ động ẩn.
 */
function nextStatus(user, current, body) {
  if (user.role === 'admin') return STATUSES.includes(body.status) ? body.status : current || 'published';
  if (current === 'published') return body.intent === 'unpublish' ? 'draft' : 'pending';
  return body.intent === 'submit' ? 'pending' : 'draft';
}
const statusFlash = (s) =>
  ({ pending: ' Khóa học đã được gửi cho quản trị viên duyệt.', draft: ' Khóa học đang ở trạng thái nháp.' })[s] || '';

// ---------- Tổng quan + biểu đồ (CTV chỉ thấy số liệu khóa học của mình) ----------
const TZ = 'Asia/Ho_Chi_Minh';
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
/** Khoảng ngày từ query (YYYY-MM-DD, giờ Việt Nam); mặc định 12 tháng gần nhất. Trả về [from, toExclusive]. */
function dateRange(q) {
  const parse = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? new Date(`${s}T00:00:00+07:00`) : null);
  const now = new Date();
  let to = parse(q.to);
  let from = parse(q.from);
  if (!to || Number.isNaN(+to)) to = parse(ymd(now));
  to = new Date(+to + 24 * 3600 * 1000);
  if (!from || Number.isNaN(+from) || from >= to) {
    from = parse(ymd(now));
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
  }
  if (to - from > 5 * 366 * 24 * 3600 * 1000) from = new Date(+to - 5 * 366 * 24 * 3600 * 1000); // tối đa 5 năm
  return [from, to];
}
/** Danh sách tháng YYYY-MM trong khoảng để biểu đồ có cả tháng doanh thu = 0. */
function monthsBetween(from, to) {
  const out = [];
  const [fy, fm] = ymd(from).split('-').map(Number);
  const [ty, tm] = ymd(new Date(+to - 1))
    .split('-')
    .map(Number);
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, (m = 1)) : m++) out.push(`${y}-${String(m).padStart(2, '0')}`);
  return out;
}

/** Bộ lọc khóa học theo quyền: admin = tất cả, CTV = khóa do mình tạo. */
async function scopeCourseIds(user) {
  if (user.role === 'admin') return null;
  return (await Course.find({ author: user.id }).select('_id')).map((c) => c._id);
}

router.get('/', staff, validate(S.admin.dashboard), async (req, res) => {
  const [from, to] = dateRange(req.query);
  const ids = await scopeCourseIds(req.user);
  const courseMatch = ids ? { course: trusted({ $in: ids }) } : {};
  const inRange = { createdAt: trusted({ $gte: from, $lt: to }) };
  const paid = { ...courseMatch, ...inRange, provider: trusted({ $ne: 'free' }) };

  const [byMonth, byCourse, byStatus, learners, courses, recent] = await Promise.all([
    Order.aggregate([
      { $match: { ...paid, status: 'COMPLETED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: { $toDouble: '$amount' } },
          orders: { $sum: 1 },
        },
      },
    ]),
    Enrollment.aggregate([
      { $match: { ...courseMatch, ...inRange } },
      { $group: { _id: '$course', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'c' } },
      { $project: { n: 1, title: { $ifNull: [{ $arrayElemAt: ['$c.title', 0] }, '(đã xóa)'] } } },
    ]),
    Order.aggregate([{ $match: paid }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ids ? Enrollment.distinct('user', courseMatch).then((x) => x.length) : User.countDocuments({ role: 'user' }),
    Course.countDocuments(ids ? { _id: trusted({ $in: ids }) } : {}),
    Order.find(courseMatch).sort({ createdAt: -1 }).limit(8).populate('user', 'name').populate('course', 'title'),
  ]);

  const months = monthsBetween(from, to);
  const mm = new Map(byMonth.map((x) => [x._id, x]));
  const revenueSeries = months.map((m) => Math.round((mm.get(m)?.revenue || 0) * 100) / 100);
  const status = Object.fromEntries(byStatus.map((x) => [x._id, x.n]));
  const ok = status.COMPLETED || 0;
  const fail = (status.FAILED || 0) + (status.CANCELLED || 0);
  const charts = {
    revenue: { type: 'bar', labels: months.map((m) => m.split('-').reverse().join('/')), data: revenueSeries, label: 'Doanh thu (USD)' },
    enroll: { type: 'bar', horizontal: true, labels: byCourse.map((x) => x.title), data: byCourse.map((x) => x.n), label: 'Số ghi danh' },
    status: { type: 'doughnut', labels: ['Thành công', 'Thất bại / hủy', 'Đang chờ'], data: [ok, fail, status.CREATED || 0] },
  };
  res.render('admin/dashboard', {
    title: 'Quản trị',
    charts,
    recent,
    scoped: Boolean(ids),
    range: { from: ymd(from), to: ymd(new Date(+to - 1)) },
    stats: {
      revenue: revenueSeries.reduce((a, b) => a + b, 0),
      orders: ok,
      learners,
      courses,
      successRate: ok + fail ? Math.round((ok / (ok + fail)) * 100) : null,
    },
  });
});

// ---------- Khóa học ----------
router.get('/courses', staff, validate(S.admin.courseList), async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { author: req.user.id };
  const status = STATUSES.includes(req.query.status) ? req.query.status : '';
  const pendingCount = await Course.countDocuments({ ...filter, status: 'pending' });
  const courses = await Course.find(status ? { ...filter, status } : filter)
    .sort({ status: 1, createdAt: -1 })
    .populate('author', 'name');
  const counts = Object.fromEntries(
    (await Enrollment.aggregate([{ $group: { _id: '$course', n: { $sum: 1 } } }])).map((x) => [String(x._id), x.n]),
  );
  res.render('admin/courses', { title: 'Quản lý khóa học', courses, counts, status, pendingCount, labels: Course.STATUS_LABELS });
});

// Duyệt / từ chối khóa học (chỉ admin)
router.post('/courses/:id/approve', adminOnly, validate(S.admin.courseAction), async (req, res) => {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course) return notFound(res);
  Object.assign(course, { status: 'published', rejectReason: undefined, reviewedBy: req.user._id, reviewedAt: new Date() });
  await course.save();
  await audit(req, 'course.approve', { target: course.author, meta: { courseId: course.id, courseTitle: course.title } });
  req.session.flash = { type: 'success', text: `Đã duyệt và xuất bản “${course.title}”.` };
  res.redirect('/admin/courses?status=pending');
});
router.post('/courses/:id/reject', adminOnly, validate(S.admin.courseReject), async (req, res) => {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course) return notFound(res);
  const reason = String(req.body.reason || '')
    .trim()
    .slice(0, 500);
  if (reason.length < 5) {
    req.session.flash = { type: 'warn', text: 'Hãy ghi lý do từ chối (ít nhất 5 ký tự) để cộng tác viên biết cần sửa gì.' };
    return res.redirect('/admin/courses?status=pending');
  }
  Object.assign(course, { status: 'rejected', rejectReason: reason, reviewedBy: req.user._id, reviewedAt: new Date() });
  await course.save();
  await audit(req, 'course.reject', { target: course.author, meta: { courseId: course.id, courseTitle: course.title, reason } });
  req.session.flash = { type: 'success', text: `Đã từ chối “${course.title}”.` };
  res.redirect('/admin/courses?status=pending');
});

const renderForm = (res, status, { title, course, sections, errors = [], action }) =>
  res.status(status).render('admin/course-form', {
    title,
    course,
    sections: builderData(sections),
    colors: COLORS,
    errors,
    action,
    labels: Course.STATUS_LABELS,
  });
const notFound = (res) =>
  res.status(404).render('error', { title: 'Không tìm thấy', message: 'Không tìm thấy khóa học hoặc bạn không có quyền sửa.' });

router.get('/courses/new', staff, validate(S.none), (req, res) =>
  renderForm(res, 200, {
    title: 'Thêm khóa học',
    course: { price: 19.99, status: req.user.role === 'admin' ? 'published' : 'draft', color: COLORS[0] },
    sections: [{ title: 'Chương 1: Giới thiệu', lessons: [] }],
    action: '/admin/courses',
  }),
);

router.post('/courses', staff, validate(S.admin.courseForm), async (req, res) => {
  const data = { ...parseCourse(req.body), status: nextStatus(req.user, null, req.body) };
  const { sections, errors } = parseStructure(req.body.structure, null);
  if (!errors.length) errors.push(...(await verifyVideos(sections)));
  if (errors.length) return renderForm(res, 400, { title: 'Thêm khóa học', course: data, sections, errors, action: '/admin/courses' });
  try {
    const course = await Course.create({ ...data, sections, author: req.user.id });
    req.session.flash = { type: 'success', text: `Đã tạo khóa học “${course.title}”.${statusFlash(course.status)}` };
    res.redirect('/admin/courses');
  } catch (err) {
    renderForm(res, 400, { title: 'Thêm khóa học', course: data, sections, errors: [humanize(err)], action: '/admin/courses' });
  }
});

router.get('/courses/:id/edit', staff, validate(S.admin.courseEdit), async (req, res) => {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course || !canEdit(req.user, course)) return notFound(res);
  renderForm(res, 200, { title: 'Sửa khóa học', course, sections: course.sections, action: `/admin/courses/${course.id}` });
});

router.post('/courses/:id', staff, validate({ ...S.admin.courseForm, ...S.admin.courseSave }), async (req, res) => {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course || !canEdit(req.user, course)) return notFound(res);
  const data = { ...parseCourse(req.body), status: nextStatus(req.user, course.status, req.body) };
  const { sections, errors } = parseStructure(req.body.structure, course);
  if (!errors.length) errors.push(...(await verifyVideos(sections)));
  const back = {
    title: 'Sửa khóa học',
    course: { ...data, rejectReason: course.rejectReason, _id: course._id, id: course.id },
    sections,
    action: `/admin/courses/${course.id}`,
  };
  if (errors.length) return renderForm(res, 400, { ...back, errors });
  try {
    const statusChanged = data.status !== course.status;
    Object.assign(course, data);
    if (statusChanged && data.status !== 'rejected') course.rejectReason = undefined;
    const oldIds = new Set(course.lessons.map((l) => String(l._id)));
    course.sections = sections;
    await course.save();
    // Bài học mới (id chưa có trước đó) → thông báo cho học viên đã ghi danh
    await notifyNewLessons(
      course,
      course.lessons.filter((l) => !oldIds.has(String(l._id))),
    );
    req.session.flash = { type: 'success', text: `Đã lưu khóa học.${statusChanged ? statusFlash(course.status) : ''}` };
    res.redirect(`/admin/courses/${course.id}/edit`);
  } catch (err) {
    renderForm(res, 400, { ...back, errors: [humanize(err)] });
  }
});

// ---------- Sửa một bài học: video, tài liệu Markdown ----------
async function loadLesson(req, res) {
  const course = await Course.findById(req.params.id).catch(() => null);
  const found = course && canEdit(req.user, course) && course.findLesson(req.params.lessonId);
  if (!found) {
    notFound(res);
    return null;
  }
  return { course, ...found };
}
const renderLesson = (res, status, { course, lesson, index, form, errors = [] }) =>
  res.status(status).render('admin/lesson-form', {
    title: 'Sửa bài học',
    course,
    lesson,
    index,
    form: form || lesson,
    errors,
    materialsHtml: renderMarkdown((form || lesson).materials),
  });

router.get('/courses/:id/lessons/:lessonId', staff, validate(S.admin.lessonForm), async (req, res) => {
  const ctx = await loadLesson(req, res);
  if (!ctx) return;
  renderLesson(res, 200, ctx);
});

router.post('/courses/:id/lessons/:lessonId', staff, validate(S.admin.lessonSave), async (req, res) => {
  const ctx = await loadLesson(req, res);
  if (!ctx) return;
  const { course, lesson } = ctx;
  const rawVideo = str(req.body.youtubeId, 200);
  const yt = rawVideo ? videoId(rawVideo) : null;
  const form = {
    _id: lesson._id,
    title: str(req.body.title, 200),
    youtubeId: yt || rawVideo,
    minutes: Math.min(600, Math.max(0, Math.round(Number(req.body.minutes)) || 0)),
    preview: req.body.preview === 'on',
    materials: String(req.body.materials || '')
      .replace(/\r\n/g, '\n')
      .slice(0, 40000),
  };
  const parsedQuiz = parseQuizForm(req.body);
  form.quiz = parsedQuiz.quiz;
  const errors = [...parsedQuiz.errors];
  if (!form.title) errors.push('Bài học cần có tiêu đề.');
  if (rawVideo && !yt) errors.push('Link/mã video YouTube không hợp lệ.');
  const videoChanged = (yt || undefined) !== lesson.youtubeId;
  if (!errors.length && yt && videoChanged) {
    const probe = [{ lessons: [{ title: form.title, youtubeId: yt }] }];
    errors.push(...(await verifyVideos(probe)));
    Object.assign(form, {
      sourceName: probe[0].lessons[0].sourceName,
      sourceUrl: probe[0].lessons[0].sourceUrl,
      license: probe[0].lessons[0].license,
    });
  }
  if (errors.length) return renderLesson(res, 400, { ...ctx, form, errors });
  Object.assign(lesson, {
    title: form.title,
    youtubeId: yt || undefined,
    minutes: form.minutes,
    preview: form.preview,
    materials: form.materials,
    quiz: form.quiz,
  });
  if (videoChanged) Object.assign(lesson, { sourceName: form.sourceName, sourceUrl: form.sourceUrl, license: form.license });
  // CTV sửa bài của khóa đã xuất bản → khóa quay về "Chờ duyệt" (giống sửa ở form khóa học)
  const resubmit = req.user.role !== 'admin' && course.status === 'published';
  if (resubmit) course.status = 'pending';
  await course.save();
  req.session.flash = { type: 'success', text: `Đã lưu bài “${lesson.title}”.${resubmit ? statusFlash('pending') : ''}` };
  res.redirect(`/admin/courses/${course.id}/lessons/${lesson.id}`);
});

router.post('/courses/:id/delete', adminOnly, validate(S.admin.courseAction), async (req, res) => {
  const id = req.params.id;
  if (await Enrollment.exists({ course: id })) {
    req.session.flash = { type: 'warn', text: 'Khóa học đã có học viên – hãy ẩn (bỏ “Xuất bản”) thay vì xóa.' };
  } else {
    await Course.deleteOne({ _id: id }).catch(() => null);
    await Comment.deleteMany({ course: id }).catch(() => null);
    await CourseComment.deleteMany({ course: id }).catch(() => null);
    await Post.deleteMany({ course: id }).catch(() => null);
    req.session.flash = { type: 'success', text: 'Đã xóa khóa học.' };
  }
  res.redirect('/admin/courses');
});

// ---------- Người học (admin + cộng tác viên) ----------
/** Khóa học trong phạm vi quyền (admin: tất cả; CTV: khóa của mình) – cho ô lọc theo khóa học. */
const scopedCourses = (user) =>
  Course.find(user.role === 'admin' ? {} : { author: user.id })
    .select('title')
    .sort({ title: 1 })
    .lean();

async function learnersQuery(req) {
  const courses = await scopedCourses(req.user);
  const allowed = courses.map((c) => String(c._id));
  const f = {
    q: listing.one(req.query.q).slice(0, 80),
    course: listing.pick(req.query.course, allowed),
    sort: listing.pick(req.query.sort, ['new', 'old'], 'new'),
  };
  const filter = { course: f.course ? f.course : trusted({ $in: courses.map((c) => c._id) }) };
  if (f.q) filter.user = trusted({ $in: await listing.userIdsMatching(f.q) });
  const sort = f.sort === 'old' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  return { f, filter, sort, courses };
}

router.get('/learners', staff, validate(S.admin.learners), async (req, res) => {
  const { f, filter, sort, courses } = await learnersQuery(req);
  const list = await listing.paginate(Enrollment, filter, {
    page: req.query.page,
    sort,
    populate: [
      ['user', 'name username email isDemo locked'],
      ['course', 'title sections'],
    ],
  });
  // Tiến độ chỉ tính cho 25 dòng của trang hiện tại
  const pairs = list.items.filter((e) => e.user && e.course).map((e) => ({ user: e.user._id, course: e.course._id }));
  const progress = pairs.length ? await Progress.find({ $or: pairs }).lean() : [];
  const pmap = new Map(progress.map((p) => [`${p.user}:${p.course}`, p]));
  const rows = list.items
    .filter((e) => e.user && e.course)
    .map((e) => ({ e, s: summarize(e.course, pmap.get(`${e.user._id}:${e.course._id}`)) }));
  res.render('admin/learners', { title: 'Quản lý người học', rows, list, f, courses, qs: listing.queryString(f) });
});

// ---------- Hóa đơn, đơn hàng (admin) ----------
// Phương thức thanh toán để lọc: cổng demo theo từng cổng, PayPal thật, miễn phí
const METHODS = {
  'demo-paypal': {
    label: 'PayPal (mô phỏng)',
    match: { provider: trusted({ $in: ['demo', 'mock'] }), gateway: trusted({ $in: ['paypal', null] }) },
  },
  'demo-vnpay': { label: 'VNPay (mô phỏng)', match: { provider: 'demo', gateway: 'vnpay' } },
  'demo-momo': { label: 'Ví MoMo (mô phỏng)', match: { provider: 'demo', gateway: 'momo' } },
  paypal: { label: 'PayPal (thật)', match: { provider: 'paypal' } },
  free: { label: 'Miễn phí', match: { provider: 'free' } },
};
async function ordersQuery(req) {
  const courses = await scopedCourses(req.user);
  const f = {
    q: listing.one(req.query.q).slice(0, 80),
    status: listing.pick(req.query.status, orderLabels.STATUSES),
    course: listing.pick(
      req.query.course,
      courses.map((c) => String(c._id)),
    ),
    method: listing.pick(req.query.method, Object.keys(METHODS)),
    from: /^\d{4}-\d{2}-\d{2}$/.test(listing.one(req.query.from)) ? listing.one(req.query.from) : '',
    to: /^\d{4}-\d{2}-\d{2}$/.test(listing.one(req.query.to)) ? listing.one(req.query.to) : '',
    sort: listing.pick(req.query.sort, ['new', 'old'], 'new'),
  };
  const filter = {};
  if (f.status) filter.status = f.status;
  if (f.course) filter.course = f.course;
  if (f.method) Object.assign(filter, METHODS[f.method].match);
  if (f.q) filter.user = trusted({ $in: await listing.userIdsMatching(f.q) });
  if (f.from || f.to) {
    const [from, to] = dateRange({ from: f.from || '2000-01-01', to: f.to });
    filter.createdAt = trusted({ $gte: from, $lt: to });
  }
  const sort = f.sort === 'old' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  return { f, filter, sort, courses };
}

router.get('/orders', adminOnly, validate(S.admin.orders), async (req, res) => {
  const { f, filter, sort, courses } = await ordersQuery(req);
  const list = await listing.paginate(Order, filter, {
    page: req.query.page,
    sort,
    populate: [
      ['user', 'name email isDemo'],
      ['course', 'title'],
    ],
  });
  res.render('admin/orders', {
    title: 'Hóa đơn & đơn hàng',
    orders: list.items,
    list,
    f,
    status: f.status,
    courses,
    methods: METHODS,
    qs: listing.queryString(f),
  });
});

// Hoàn tiền (DEMO): chỉ admin, chỉ đơn demo đã thành công → REFUNDED, thu hồi quyền học, ghi audit log, báo học viên.
// Không gọi cổng thanh toán nào (thanh toán chỉ demo; hoàn tiền PayPal thật: không làm).
router.post('/orders/:id/refund', adminOnly, validate(S.admin.refund), async (req, res) => {
  const found = await Order.findById(req.params.id).catch(() => null);
  if (!found || !orderLabels.refundable(found)) {
    req.session.flash = { type: 'warn', text: 'Đơn hàng không tồn tại hoặc không hoàn tiền được (chỉ đơn demo đã thanh toán thành công).' };
    return res.redirect('/admin/orders');
  }
  // Chuyển trạng thái nguyên tử: bấm 2 lần chỉ hoàn 1 lần
  const order = await Order.findOneAndUpdate(
    { _id: found._id, status: 'COMPLETED' },
    { $set: { status: 'REFUNDED', refundedAt: new Date(), refundedBy: req.user._id } },
    { new: true },
  ).populate('course', 'title slug');
  if (!order) {
    req.session.flash = { type: 'warn', text: 'Đơn hàng đã được xử lý trước đó.' };
    return res.redirect('/admin/orders');
  }
  const revoked = await Enrollment.deleteOne({ user: order.user, course: order.course._id });
  await audit(req, 'order.refund', {
    target: order.user,
    meta: { orderId: order.id, amount: order.amount, currency: order.currency, courseId: order.course.id, reason: 'demo' },
  });
  await notify(order.user, {
    type: 'refund',
    text: `Đơn hàng khóa “${order.course.title}” ($${order.amount}) đã được hoàn tiền (demo). Quyền học khóa này đã được thu hồi.`,
    link: '/orders',
  });
  req.session.flash = {
    type: 'success',
    text: `Đã hoàn tiền (demo) đơn ${order.id.slice(-8).toUpperCase()}${revoked.deletedCount ? ' và thu hồi quyền học' : ''}.`,
  };
  res.redirect('/admin/orders?status=REFUNDED');
});

// ---------- Thành viên, phân quyền, xử lý vi phạm (admin) ----------
const ROLE_LABELS = { user: 'Người học', collaborator: 'Cộng tác viên', admin: 'Quản trị viên' };
function usersQuery(query) {
  const f = {
    q: listing.one(query.q).slice(0, 80),
    role: listing.pick(query.role, Object.keys(ROLE_LABELS)),
    status: listing.pick(query.status, ['active', 'locked']),
    demo: listing.pick(query.demo, ['real', 'demo']),
    sort: listing.pick(query.sort, ['new', 'old', 'name'], 'new'),
  };
  const filter = {};
  if (f.q) {
    const rx = listing.textRx(f.q);
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }
  if (f.role) filter.role = f.role;
  if (f.status) filter.locked = f.status === 'locked' ? true : trusted({ $ne: true });
  if (f.demo) filter.isDemo = f.demo === 'demo' ? true : trusted({ $ne: true });
  const sort = { new: { createdAt: -1, _id: -1 }, old: { createdAt: 1, _id: 1 }, name: { name: 1, _id: 1 } }[f.sort];
  return { f, filter, sort };
}

router.get('/users', adminOnly, validate(S.admin.users), async (req, res) => {
  const { f, filter, sort } = usersQuery(req.query);
  const list = await listing.paginate(User, filter, { page: req.query.page, sort, select: '-passwordHash' });
  res.render('admin/users', {
    title: 'Thành viên & phân quyền',
    users: list.items,
    list,
    f,
    qs: listing.queryString(f),
    roles: ROLE_LABELS,
  });
});

router.get('/export/users.csv', adminOnly, validate(S.admin.users), async (req, res) => {
  const { filter, sort } = usersQuery(req.query);
  const users = await User.find(filter)
    .sort(sort)
    .limit(50000)
    .select('name username email role locked mfaEnabled isDemo createdAt')
    .lean();
  sendCsv(
    res,
    `cnow-thanh-vien-${stamp()}`,
    ['Họ tên', 'Tên đăng nhập', 'Email', 'Vai trò', 'Trạng thái', '2FA', 'Ngày tạo', 'Dữ liệu mẫu'],
    users.map((u) => [
      u.name,
      u.username,
      u.email,
      ROLE_LABELS[u.role],
      u.locked ? 'Bị khóa' : 'Hoạt động',
      u.mfaEnabled ? 'Có' : '',
      vnTime(u.createdAt),
      u.isDemo ? 'Có' : '',
    ]),
  );
});

router.post('/users/:id', adminOnly, validate(S.admin.userUpdate), async (req, res) => {
  const target = await User.findById(req.params.id).catch(() => null);
  if (!target) return res.redirect('/admin/users');
  if (target.id === req.user.id) {
    req.session.flash = { type: 'warn', text: 'Không thể tự đổi quyền hoặc tự khóa tài khoản của mình.' };
    return res.redirect('/admin/users');
  }
  const before = { role: target.role, locked: target.locked };
  if (['user', 'collaborator', 'admin'].includes(req.body.role)) target.role = req.body.role;
  if (req.body.locked !== undefined) target.locked = req.body.locked === '1';
  await target.save();
  if (before.role !== target.role)
    await audit(req, 'user.role_change', { target: target._id, meta: { from: before.role, to: target.role } });
  if (before.locked !== target.locked) await audit(req, target.locked ? 'user.lock' : 'user.unlock', { target: target._id });
  req.session.flash = { type: 'success', text: `Đã cập nhật tài khoản ${target.username}.` };
  res.redirect(safeBack(req.body.back, '/admin/users'));
});

// ---------- Xuất CSV ----------
const vnTime = (d) => (d ? new Date(d).toLocaleString('vi-VN', { timeZone: TZ }) : '');
const stamp = () => ymd(new Date());

router.get('/export/orders.csv', adminOnly, validate(S.admin.orders), async (req, res) => {
  const { filter, sort } = await ordersQuery(req); // cùng bộ lọc với trang /admin/orders
  const orders = await Order.find(filter).sort(sort).limit(50000).populate('user', 'name username email').populate('course', 'title');
  sendCsv(
    res,
    `cnow-don-hang-${stamp()}`,
    [
      'Thời gian',
      'Mã đơn',
      'Học viên',
      'Tên đăng nhập',
      'Email',
      'Khóa học',
      'Số tiền',
      'Tiền tệ',
      'Cổng',
      'DEMO',
      'Số tiền VND (demo)',
      'Trạng thái',
      'Mã đơn cổng',
      'Mã giao dịch',
      'Lý do lỗi',
    ],
    orders.map((o) => [
      vnTime(o.createdAt),
      o.id,
      o.user?.name,
      o.user?.username,
      o.user?.email,
      o.course?.title,
      Number(o.amount),
      o.currency,
      orderLabels.methodLabel(o),
      orderLabels.isDemo(o) ? 'DEMO – không phải giao dịch thật' : '',
      o.amountVnd ?? '',
      o.status,
      o.providerOrderId,
      o.captureId,
      o.failureReason,
    ]),
  );
});

router.get('/export/learners.csv', staff, validate(S.admin.learners), async (req, res) => {
  const { filter, sort } = await learnersQuery(req);
  const enrollments = await Enrollment.find(filter)
    .sort(sort)
    .limit(50000)
    .populate('user', 'name username email')
    .populate('course', 'title sections');
  const progress = await Progress.find({
    course: trusted({ $in: [...new Set(enrollments.map((e) => String(e.course?._id)))].filter((x) => x !== 'undefined') }),
  }).lean();
  const pmap = new Map(progress.map((p) => [`${p.user}:${p.course}`, p]));
  const rows = enrollments
    .filter((e) => e.user && e.course)
    .map((e) => {
      const s = summarize(e.course, pmap.get(`${e.user._id}:${e.course._id}`));
      return [e.user.name, e.user.username, e.user.email, e.course.title, vnTime(e.createdAt), s.pct, `${s.completed}/${s.total}`];
    });
  sendCsv(
    res,
    `cnow-nguoi-hoc-${stamp()}`,
    ['Học viên', 'Tên đăng nhập', 'Email', 'Khóa học', 'Ngày ghi danh', 'Tiến độ (%)', 'Bài đã học'],
    rows,
  );
});

router.get('/export/revenue.csv', staff, validate(S.admin.revenueCsv), async (req, res) => {
  const [from, to] = dateRange(req.query);
  const ids = await scopeCourseIds(req.user);
  const courses = await Course.find(ids ? { _id: trusted({ $in: ids }) } : {})
    .select('title price author')
    .populate('author', 'name');
  const cids = courses.map((c) => c._id);
  const [rev, enr] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          course: trusted({ $in: cids }),
          status: 'COMPLETED',
          provider: trusted({ $ne: 'free' }),
          createdAt: trusted({ $gte: from, $lt: to }),
        },
      },
      { $group: { _id: '$course', orders: { $sum: 1 }, revenue: { $sum: { $toDouble: '$amount' } } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: trusted({ $in: cids }), createdAt: trusted({ $gte: from, $lt: to }) } },
      { $group: { _id: '$course', n: { $sum: 1 } } },
    ]),
  ]);
  const rm = new Map(rev.map((x) => [String(x._id), x]));
  const em = new Map(enr.map((x) => [String(x._id), x.n]));
  const rows = courses
    .map((c) => [
      c.title,
      c.author?.name,
      c.price,
      em.get(c.id) || 0,
      rm.get(c.id)?.orders || 0,
      Math.round((rm.get(c.id)?.revenue || 0) * 100) / 100,
    ])
    .sort((a, b) => b[5] - a[5]);
  rows.push([
    'TỔNG',
    '',
    '',
    rows.reduce((t, r) => t + r[3], 0),
    rows.reduce((t, r) => t + r[4], 0),
    Math.round(rows.reduce((t, r) => t + r[5], 0) * 100) / 100,
  ]);
  sendCsv(
    res,
    `cnow-doanh-thu-${ymd(from)}-${ymd(new Date(+to - 1))}`,
    ['Khóa học', 'Tác giả', 'Giá (USD)', 'Ghi danh mới', 'Đơn thành công', 'Doanh thu (USD)'],
    rows,
  );
});

// ---------- Mã giảm giá (admin) ----------
router.get('/coupons', adminOnly, validate(S.admin.coupons), async (req, res) => {
  const [list, courses] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).limit(300).populate('courses', 'title'),
    Course.find({ price: trusted({ $gt: 0 }) })
      .select('title')
      .sort({ title: 1 }),
  ]);
  res.render('admin/coupons', { title: 'Mã giảm giá', list, courses, errors: [], form: {} });
});

router.post('/coupons', adminOnly, validate(S.admin.couponCreate), async (req, res) => {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const many = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(String).filter((x) => /^[0-9a-f]{24}$/.test(x));
  const form = {
    code: String(one(req.body.code) || '')
      .trim()
      .toUpperCase(),
    type: one(req.body.type) === 'amount' ? 'amount' : 'percent',
    value: Number(one(req.body.value)),
    expiresAt: one(req.body.expiresAt) ? new Date(`${one(req.body.expiresAt)}T23:59:59+07:00`) : undefined,
    maxUses: one(req.body.maxUses) ? Math.floor(Number(one(req.body.maxUses))) : undefined,
    courses: many(req.body.courses),
    note: String(one(req.body.note) || '').slice(0, 200),
  };
  const errors = [];
  if (!/^[A-Z0-9_-]{3,32}$/.test(form.code)) errors.push('Mã 3–32 ký tự: chữ, số, gạch ngang, gạch dưới.');
  if (!(form.value > 0) || (form.type === 'percent' && form.value > 100))
    errors.push('Giá trị giảm không hợp lệ (phần trăm 1–100, hoặc số tiền > 0).');
  if (form.expiresAt && Number.isNaN(+form.expiresAt)) errors.push('Ngày hết hạn không hợp lệ.');
  if (form.maxUses !== undefined && !(form.maxUses >= 1)) errors.push('Số lượt tối thiểu là 1.');
  if (!errors.length) {
    try {
      const c = await Coupon.create({ ...form, createdBy: req.user._id });
      await audit(req, 'coupon.create', { meta: { code: c.code } });
      req.session.flash = { type: 'success', text: `Đã tạo mã ${c.code}.` };
      return res.redirect('/admin/coupons');
    } catch (err) {
      errors.push(err.code === 11000 ? 'Mã này đã tồn tại.' : 'Không lưu được mã giảm giá.');
    }
  }
  const [list, courses] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).limit(300).populate('courses', 'title'),
    Course.find({ price: trusted({ $gt: 0 }) }).select('title'),
  ]);
  res.status(400).render('admin/coupons', { title: 'Mã giảm giá', list, courses, errors, form });
});

router.post('/coupons/:id', adminOnly, validate(S.admin.couponToggle), async (req, res) => {
  const c = await Coupon.findById(req.params.id).catch(() => null);
  if (c) {
    c.active = req.body.active === '1';
    await c.save();
    await audit(req, 'coupon.update', { meta: { code: c.code, to: c.active ? 'active' : 'inactive' } });
  }
  res.redirect('/admin/coupons');
});

router.post('/coupons/:id/delete', adminOnly, validate(S.admin.couponDelete), async (req, res) => {
  const c = await Coupon.findById(req.params.id).catch(() => null);
  if (c && (await Order.exists({ coupon: c._id }))) {
    req.session.flash = { type: 'warn', text: 'Mã đã được dùng trong đơn hàng – hãy tắt thay vì xóa để giữ lịch sử.' };
  } else if (c) {
    await c.deleteOne();
    await audit(req, 'coupon.delete', { meta: { code: c.code } });
    req.session.flash = { type: 'success', text: `Đã xóa mã ${c.code}.` };
  }
  res.redirect('/admin/coupons');
});

// ---------- Nhật ký bảo mật (admin) ----------
router.get('/audit', adminOnly, validate(S.admin.audit), async (req, res) => {
  const one = (v) => String(Array.isArray(v) ? v[0] : (v ?? '')).trim();
  const f = {
    action: one(req.query.action),
    user: one(req.query.user).slice(0, 80),
    from: one(req.query.from),
    to: one(req.query.to),
    ip: one(req.query.ip).slice(0, 64),
  };
  const filter = {};
  if (AUDIT_ACTIONS[f.action]) filter.action = f.action;
  else f.action = '';
  const date = (s, end) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00`);
    if (Number.isNaN(+d)) return null;
    if (end) d.setDate(d.getDate() + 1);
    return d;
  };
  const from = date(f.from);
  const to = date(f.to, true);
  if (!from) f.from = '';
  if (!to) f.to = '';
  if (from || to) filter.createdAt = trusted({ ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) });
  if (f.ip) filter.ip = f.ip;
  if (f.user) {
    const rx = listing.textRx(f.user);
    const ids = (
      await User.find({ $or: [{ username: rx }, { email: rx }, { name: rx }] })
        .select('_id')
        .limit(200)
    ).map((u) => u._id);
    filter.$or = [{ actor: trusted({ $in: ids }) }, { target: trusted({ $in: ids }) }, { 'meta.login': rx }];
  }
  const PER = 50;
  const total = await AuditLog.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PER));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(req.query.page), 10) || 1));
  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PER)
    .limit(PER)
    .populate('actor', 'name username')
    .populate('target', 'name username');
  const qs = (p) => '?' + new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(p) });
  res.render('admin/audit', { title: 'Nhật ký bảo mật', logs, f, actions: AUDIT_ACTIONS, total, page, pages, qs });
});

// ---------- Kiểm duyệt Hỏi – Đáp (admin) ----------
/** Bộ lọc chung cho 2 trang kiểm duyệt (Hỏi – Đáp, Bình luận): trạng thái hiện/ẩn, khóa học, tìm theo nội dung / người viết */
async function moderationQuery(req) {
  const courses = await scopedCourses(req.user);
  const f = {
    show: listing.pick(req.query.show, ['visible', 'hidden']),
    course: listing.pick(
      req.query.course,
      courses.map((c) => String(c._id)),
    ),
    q: listing.one(req.query.q).slice(0, 80),
  };
  const filter = {};
  if (f.show) filter.hidden = f.show === 'hidden';
  if (f.course) filter.course = f.course;
  if (f.q) {
    const rx = listing.textRx(f.q);
    filter.$or = [{ content: rx }, { user: trusted({ $in: await listing.userIdsMatching(f.q) }) }];
  }
  return { f, filter, courses };
}

router.get('/qa', adminOnly, validate(S.admin.moderation), async (req, res) => {
  const { f, filter, courses } = await moderationQuery(req);
  const list = await listing.paginate(Post, filter, {
    page: req.query.page,
    sort: { createdAt: -1, _id: -1 },
    populate: [
      ['user', 'name username isDemo'],
      ['course', 'title slug sections'],
    ],
  });
  const rows = list.items.map((p) => {
    const found = p.course && p.course.findLesson(p.lesson);
    return { p, lessonIndex: found ? found.index : 0, lessonTitle: found ? found.lesson.title : '(bài đã xóa)' };
  });
  res.render('admin/qa', { title: 'Kiểm duyệt Hỏi – Đáp', rows, list, f, show: f.show || 'all', courses, qs: listing.queryString(f) });
});

router.post('/qa/:id', adminOnly, validate(S.admin.moderate), async (req, res) => {
  await Post.updateOne({ _id: req.params.id }, { hidden: req.body.hidden === '1' }).catch(() => null);
  res.redirect(safeBack(req.body.back, '/admin/qa'));
});

// ---------- Kiểm duyệt bình luận khóa học (admin) ----------
router.get('/comments', adminOnly, validate(S.admin.moderation), async (req, res) => {
  const { f, filter, courses } = await moderationQuery(req);
  const list = await listing.paginate(CourseComment, filter, {
    page: req.query.page,
    sort: { createdAt: -1, _id: -1 },
    populate: [
      ['user', 'name username isDemo'],
      ['course', 'title slug'],
    ],
  });
  res.render('admin/comments', { title: 'Kiểm duyệt bình luận', comments: list.items, list, f, courses, qs: listing.queryString(f) });
});

router.post('/comments/:id', adminOnly, validate(S.admin.moderate), async (req, res) => {
  await CourseComment.updateOne({ _id: req.params.id }, { hidden: req.body.hidden === '1' }).catch(() => null);
  res.redirect(safeBack(req.body.back, '/admin/comments'));
});

function humanize(err) {
  if (err.code === 11000) return 'Đường dẫn (slug) đã tồn tại, hãy chọn slug khác.';
  if (err.name === 'ValidationError')
    return (
      'Dữ liệu chưa hợp lệ: ' +
      Object.values(err.errors)
        .map((e) => e.path)
        .join(', ')
    );
  return 'Không lưu được khóa học.';
}

module.exports = router;
