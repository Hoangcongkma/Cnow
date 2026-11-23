// Xuất CSV theo đúng bộ lọc đang xem; mỗi lần xuất được ghi nhật ký bảo mật và giới hạn 20 lần/giờ/người
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { User, Order, Enrollment } = require('../../models');
const { sendAuditedCsv } = require('../../services/csv');
const reporting = require('../../services/reporting');
const { learnersQuery, ordersQuery, usersQuery, ROLE_LABELS } = require('../../services/admin-queries');

const exportLimiter = require('../../security/rate-limit').limits.export();
const MAX_ROWS = 50000;

router.get('/export/users.csv', exportLimiter, validate(S.admin.users), async (req, res) => {
  const { filter, sort } = usersQuery(req.query);
  const users = await User.find(filter)
    .sort(sort)
    .limit(MAX_ROWS)
    .select('name username email role locked mfaEnabled isDemo createdAt')
    .lean();
  const rows = users.map((u) => [
    u.name,
    u.username,
    u.email,
    ROLE_LABELS[u.role],
    u.locked ? 'Bị khóa' : 'Hoạt động',
    u.mfaEnabled ? 'Có' : '',
    reporting.vnTime(u.createdAt),
    u.isDemo ? 'Có' : '',
  ]);
  const headers = ['Họ tên', 'Tên đăng nhập', 'Email', 'Vai trò', 'Trạng thái', '2FA', 'Ngày tạo', 'Dữ liệu mẫu'];
  await sendAuditedCsv(req, res, `cnow-thanh-vien-${reporting.stamp()}`, headers, rows);
});

router.get('/export/orders.csv', exportLimiter, validate(S.admin.orders), async (req, res) => {
  const { filter, sort } = await ordersQuery(req); // cùng bộ lọc với trang /admin/orders
  const orders = await Order.find(filter).sort(sort).limit(MAX_ROWS).populate('user', 'name username email').populate('course', 'title');
  await sendAuditedCsv(req, res, `cnow-don-hang-${reporting.stamp()}`, reporting.ORDER_HEADERS, orders.map(reporting.orderRow));
});

router.get('/export/learners.csv', exportLimiter, validate(S.admin.learners), async (req, res) => {
  const { filter, sort } = await learnersQuery(req);
  const enrollments = await Enrollment.find(filter)
    .sort(sort)
    .limit(MAX_ROWS)
    .populate('user', 'name username email')
    .populate('course', 'title sections');
  const headers = ['Học viên', 'Tên đăng nhập', 'Email', 'Khóa học', 'Ngày ghi danh', 'Tiến độ (%)', 'Bài đã học'];
  await sendAuditedCsv(req, res, `cnow-nguoi-hoc-${reporting.stamp()}`, headers, await reporting.learnerRows(enrollments));
});

router.get('/export/revenue.csv', exportLimiter, validate(S.admin.revenueCsv), async (req, res) => {
  const { rows, name } = await reporting.revenueReport(req.user, req.query);
  const headers = ['Khóa học', 'Tác giả', 'Giá (USD)', 'Ghi danh mới', 'Đơn thành công', 'Doanh thu (USD)'];
  await sendAuditedCsv(req, res, name, headers, rows);
});

module.exports = router;
