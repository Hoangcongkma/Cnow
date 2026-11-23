// Nhật ký bảo mật (chỉ admin, chỉ xem – không sửa/xóa được)
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { AuditLog, AUDIT_ACTIONS } = require('../../models');
const listing = require('../../services/listing');
const { auditQuery } = require('../../services/admin-queries');

const PER_PAGE = 50;

router.get('/audit', validate(S.admin.audit), async (req, res) => {
  const { f, filter } = await auditQuery(req.query);
  const list = await listing.paginate(AuditLog, filter, {
    page: req.query.page,
    per: PER_PAGE,
    sort: { createdAt: -1 },
    populate: [
      ['actor', 'name username'],
      ['target', 'name username'],
    ],
  });
  const qs = (p) => '?' + new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(p) });
  res.render('admin/audit', {
    title: 'Nhật ký bảo mật',
    logs: list.items,
    f,
    actions: AUDIT_ACTIONS,
    total: list.total,
    page: list.page,
    pages: list.pages,
    qs,
  });
});

module.exports = router;
