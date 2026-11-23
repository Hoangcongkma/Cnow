// Trang quản trị (gắn dưới /admin). Quyền truy cập từng đường dẫn: bảng RULES trong src/security/rbac.js
// (staff = admin + cộng tác viên; admin = chỉ quản trị viên). Kiểm tra theo đối tượng (khóa học của ai) nằm trong service.
const router = require('express').Router();

router.use(require('./dashboard'));
router.use(require('./courses'));
router.use(require('./lessons'));
router.use(require('./people'));
router.use(require('./orders'));
router.use(require('./exports'));
router.use(require('./coupons'));
router.use(require('./audit'));
router.use(require('./moderation'));

module.exports = router;
