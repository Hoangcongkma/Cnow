// Sửa một bài học: video (xác nhận oEmbed), tài liệu Markdown, trắc nghiệm
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { Course } = require('../../models');
const { renderMarkdown } = require('../../services/markdown');
const editor = require('../../services/course-editor');
const { courseNotFound } = require('./helpers');

/** Khóa học + bài học mà người dùng được phép sửa; không có → trả 404 và null. */
async function loadLesson(req, res) {
  const course = await Course.findById(req.params.id).catch(() => null);
  const found = course && editor.canEdit(req.user, course) && course.findLesson(req.params.lessonId);
  if (!found) {
    courseNotFound(res);
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

router.get('/courses/:id/lessons/:lessonId', validate(S.admin.lessonForm), async (req, res) => {
  const ctx = await loadLesson(req, res);
  if (ctx) renderLesson(res, 200, ctx);
});

router.post('/courses/:id/lessons/:lessonId', validate(S.admin.lessonSave), async (req, res) => {
  const ctx = await loadLesson(req, res);
  if (!ctx) return;
  const { course, lesson } = ctx;
  const parsed = await editor.parseLessonForm(req.body, lesson);
  if (parsed.errors.length) return renderLesson(res, 400, { ...ctx, form: parsed.form, errors: parsed.errors });
  editor.applyLessonForm(lesson, parsed);
  // CTV sửa bài của khóa đã xuất bản → khóa quay về "Chờ duyệt" (giống sửa ở form khóa học)
  const resubmit = req.user.role !== 'admin' && course.status === 'published';
  if (resubmit) course.status = 'pending';
  await course.save();
  req.session.flash = { type: 'success', text: `Đã lưu bài “${lesson.title}”.${resubmit ? editor.statusFlash('pending') : ''}` };
  res.redirect(`/admin/courses/${course.id}/lessons/${lesson.id}`);
});

module.exports = router;
