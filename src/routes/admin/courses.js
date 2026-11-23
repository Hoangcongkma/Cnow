// Quản lý khóa học: danh sách, thêm/sửa (trình dựng chương–bài), duyệt/từ chối, xóa
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { Course, Enrollment, Comment, CourseComment, Post } = require('../../models');
const { audit } = require('../../services/audit');
const { notifyNewLessons } = require('../../services/notify');
const editor = require('../../services/course-editor');
const { courseNotFound } = require('./helpers');

router.get('/courses', validate(S.admin.courseList), async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { author: req.user.id };
  const status = editor.STATUSES.includes(req.query.status) ? req.query.status : '';
  const pendingCount = await Course.countDocuments({ ...filter, status: 'pending' });
  const courses = await Course.find(status ? { ...filter, status } : filter)
    .sort({ status: 1, createdAt: -1 })
    .populate('author', 'name');
  const counts = Object.fromEntries(
    (await Enrollment.aggregate([{ $group: { _id: '$course', n: { $sum: 1 } } }])).map((x) => [String(x._id), x.n]),
  );
  res.render('admin/courses', { title: 'Quản lý khóa học', courses, counts, status, pendingCount, labels: Course.STATUS_LABELS });
});

/** Duyệt / từ chối (chỉ admin – bảng quyền) */
async function review(req, res, status, reason) {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course) return courseNotFound(res);
  Object.assign(course, { status, rejectReason: reason, reviewedBy: req.user._id, reviewedAt: new Date() });
  await course.save();
  const meta = { courseId: course.id, courseTitle: course.title, ...(reason ? { reason } : {}) };
  await audit(req, status === 'published' ? 'course.approve' : 'course.reject', { target: course.author, meta });
  const verb = status === 'published' ? 'duyệt và xuất bản' : 'từ chối';
  req.session.flash = { type: 'success', text: `Đã ${verb} “${course.title}”.` };
  res.redirect('/admin/courses?status=pending');
}

router.post('/courses/:id/approve', validate(S.admin.courseAction), (req, res) => review(req, res, 'published', undefined));

router.post('/courses/:id/reject', validate(S.admin.courseReject), (req, res) => {
  const reason = String(req.body.reason || '')
    .trim()
    .slice(0, 500);
  if (reason.length < 5) {
    req.session.flash = { type: 'warn', text: 'Hãy ghi lý do từ chối (ít nhất 5 ký tự) để cộng tác viên biết cần sửa gì.' };
    return res.redirect('/admin/courses?status=pending');
  }
  return review(req, res, 'rejected', reason);
});

const renderForm = (res, status, { title, course, sections, errors = [], action }) =>
  res.status(status).render('admin/course-form', {
    title,
    course,
    sections: editor.builderData(sections),
    colors: editor.COLORS,
    errors,
    action,
    labels: Course.STATUS_LABELS,
  });

router.get('/courses/new', validate(S.none), (req, res) =>
  renderForm(res, 200, {
    title: 'Thêm khóa học',
    course: { price: 19.99, status: req.user.role === 'admin' ? 'published' : 'draft', color: editor.COLORS[0] },
    sections: [{ title: 'Chương 1: Giới thiệu', lessons: [] }],
    action: '/admin/courses',
  }),
);

/** Đọc form khóa học + cấu trúc chương/bài, xác nhận video mới. */
async function readCourseForm(req, oldCourse) {
  const data = { ...editor.parseCourse(req.body), status: editor.nextStatus(req.user, oldCourse?.status || null, req.body) };
  const { sections, errors } = editor.parseStructure(req.body.structure, oldCourse);
  if (!errors.length) errors.push(...(await editor.verifyVideos(sections)));
  return { data, sections, errors };
}

router.post('/courses', validate(S.admin.courseForm), async (req, res) => {
  const { data, sections, errors } = await readCourseForm(req, null);
  const back = { title: 'Thêm khóa học', course: data, sections, action: '/admin/courses' };
  if (errors.length) return renderForm(res, 400, { ...back, errors });
  try {
    const course = await Course.create({ ...data, sections, author: req.user.id });
    req.session.flash = { type: 'success', text: `Đã tạo khóa học “${course.title}”.${editor.statusFlash(course.status)}` };
    res.redirect('/admin/courses');
  } catch (err) {
    renderForm(res, 400, { ...back, errors: [editor.humanize(err)] });
  }
});

router.get('/courses/:id/edit', validate(S.admin.courseEdit), async (req, res) => {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course || !editor.canEdit(req.user, course)) return courseNotFound(res);
  renderForm(res, 200, { title: 'Sửa khóa học', course, sections: course.sections, action: `/admin/courses/${course.id}` });
});

router.post('/courses/:id', validate({ ...S.admin.courseForm, ...S.admin.courseSave }), async (req, res) => {
  const course = await Course.findById(req.params.id).catch(() => null);
  if (!course || !editor.canEdit(req.user, course)) return courseNotFound(res);
  const { data, sections, errors } = await readCourseForm(req, course);
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
    req.session.flash = { type: 'success', text: `Đã lưu khóa học.${statusChanged ? editor.statusFlash(course.status) : ''}` };
    res.redirect(`/admin/courses/${course.id}/edit`);
  } catch (err) {
    renderForm(res, 400, { ...back, errors: [editor.humanize(err)] });
  }
});

// Xóa (chỉ admin – bảng quyền). Khóa đã có học viên thì không xóa được, chỉ ẩn.
router.post('/courses/:id/delete', validate(S.admin.courseAction), async (req, res) => {
  const id = req.params.id;
  if (await Enrollment.exists({ course: id })) {
    req.session.flash = { type: 'warn', text: 'Khóa học đã có học viên – hãy ẩn (bỏ “Xuất bản”) thay vì xóa.' };
    return res.redirect('/admin/courses');
  }
  const removed = await Course.findOneAndDelete({ _id: id }).catch(() => null);
  if (removed) await audit(req, 'course.delete', { target: removed.author, meta: { courseId: id, courseTitle: removed.title } });
  await Promise.all([Comment, CourseComment, Post].map((M) => M.deleteMany({ course: id }).catch(() => null)));
  req.session.flash = { type: 'success', text: 'Đã xóa khóa học.' };
  res.redirect('/admin/courses');
});

module.exports = router;
