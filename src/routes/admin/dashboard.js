// Tổng quan (biểu đồ) và giám sát bảo mật
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { AUDIT_ACTIONS } = require('../../models');
const { dashboardData } = require('../../services/reporting');
const { securitySummary } = require('../../services/security-monitor');

// CTV chỉ thấy số liệu khóa học của mình
router.get('/', validate(S.admin.dashboard), async (req, res) => {
  res.render('admin/dashboard', { title: 'Quản trị', ...(await dashboardData(req.user, req.query)) });
});

const SECURITY_EVENTS = [
  'login.success',
  'login.new_ip',
  'session.revoke',
  'session.expired',
  'password.change',
  'user.role_change',
  'user.lock',
  'order.refund',
  'export.csv',
  'data.export',
  'account.delete',
];

// Giám sát bảo mật 24 giờ (chỉ admin – bảng quyền)
router.get('/security', validate(S.none), async (req, res) => {
  const labels = Object.fromEntries(SECURITY_EVENTS.map((k) => [k, AUDIT_ACTIONS[k]]));
  res.set('Cache-Control', 'no-store').render('admin/security', { title: 'Giám sát bảo mật', s: await securitySummary(), labels });
});

module.exports = router;
