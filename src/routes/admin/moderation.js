// Kiểm duyệt nội dung (chỉ admin): Hỏi – Đáp và bình luận khóa học – ẩn / hiện, có ghi nhật ký
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { Post, CourseComment } = require('../../models');
const { audit } = require('../../services/audit');
const listing = require('../../services/listing');
const { moderationQuery } = require('../../services/admin-queries');
const { safeBack } = require('./helpers');

const NEWEST = { createdAt: -1, _id: -1 };

router.get('/qa', validate(S.admin.moderation), async (req, res) => {
  const { f, filter, courses } = await moderationQuery(req);
  const list = await listing.paginate(Post, filter, {
    page: req.query.page,
    sort: NEWEST,
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

router.get('/comments', validate(S.admin.moderation), async (req, res) => {
  const { f, filter, courses } = await moderationQuery(req);
  const list = await listing.paginate(CourseComment, filter, {
    page: req.query.page,
    sort: NEWEST,
    populate: [
      ['user', 'name username isDemo'],
      ['course', 'title slug'],
    ],
  });
  res.render('admin/comments', { title: 'Kiểm duyệt bình luận', comments: list.items, list, f, courses, qs: listing.queryString(f) });
});

/** Ẩn / hiện 1 bài viết và ghi nhật ký. kind: 'post' | 'comment' */
async function moderate(req, res, Model, kind, back) {
  const hide = req.body.hidden === '1';
  const doc = await Model.findOneAndUpdate({ _id: req.params.id }, { hidden: hide }).catch(() => null);
  if (doc) await audit(req, 'content.moderate', { target: doc.user, meta: { reason: `${hide ? 'hide' : 'show'}_${kind}` } });
  res.redirect(safeBack(req.body.back, back));
}

router.post('/qa/:id', validate(S.admin.moderate), (req, res) => moderate(req, res, Post, 'post', '/admin/qa'));
router.post('/comments/:id', validate(S.admin.moderate), (req, res) => moderate(req, res, CourseComment, 'comment', '/admin/comments'));

module.exports = router;
