// Người học (admin + CTV, trong phạm vi khóa của mình) và thành viên – phân quyền, khóa tài khoản (chỉ admin)
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { User, Enrollment, Progress, UserSession } = require('../../models');
const { audit } = require('../../services/audit');
const listing = require('../../services/listing');
const { summarize } = require('../../services/progress');
const { learnersQuery, usersQuery, ROLE_LABELS } = require('../../services/admin-queries');
const { safeBack } = require('./helpers');

router.get('/learners', validate(S.admin.learners), async (req, res) => {
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
  const items = list.items.filter((e) => e.user && e.course);
  const pairs = items.map((e) => ({ user: e.user._id, course: e.course._id }));
  const progress = pairs.length ? await Progress.find({ $or: pairs }).lean() : [];
  const pmap = new Map(progress.map((p) => [`${p.user}:${p.course}`, p]));
  const rows = items.map((e) => ({ e, s: summarize(e.course, pmap.get(`${e.user._id}:${e.course._id}`)) }));
  res.render('admin/learners', { title: 'Quản lý người học', rows, list, f, courses, qs: listing.queryString(f) });
});

router.get('/users', validate(S.admin.users), async (req, res) => {
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

router.post('/users/:id', validate(S.admin.userUpdate), async (req, res) => {
  const target = await User.findById(req.params.id).catch(() => null);
  if (!target) return res.redirect('/admin/users');
  if (target.id === req.user.id) {
    req.session.flash = { type: 'warn', text: 'Không thể tự đổi quyền hoặc tự khóa tài khoản của mình.' };
    return res.redirect('/admin/users');
  }
  const before = { role: target.role, locked: target.locked };
  if (Object.keys(ROLE_LABELS).includes(req.body.role)) target.role = req.body.role;
  if (req.body.locked !== undefined) target.locked = req.body.locked === '1';
  const roleChanged = before.role !== target.role;
  // Đổi vai trò → hủy mọi phiên của người đó (phải đăng nhập lại với quyền mới; admin mới phải qua bước mã quản trị)
  if (roleChanged) target.sessionVersion = (target.sessionVersion || 0) + 1;
  await target.save();
  if (roleChanged || target.locked) await UserSession.deleteMany({ user: target._id });
  if (roleChanged) await audit(req, 'user.role_change', { target: target._id, meta: { from: before.role, to: target.role } });
  if (before.locked !== target.locked) await audit(req, target.locked ? 'user.lock' : 'user.unlock', { target: target._id });
  req.session.flash = { type: 'success', text: `Đã cập nhật tài khoản ${target.username}.` };
  res.redirect(safeBack(req.body.back, '/admin/users'));
});

module.exports = router;
