// Mã giảm giá (chỉ admin): tạo, bật/tắt, xóa (mã đã dùng chỉ tắt được)
const { trusted } = require('mongoose');
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { Coupon, Course, Order } = require('../../models');
const { audit } = require('../../services/audit');
const { parseCouponForm } = require('../../services/coupon');

/** Danh sách mã + khóa có phí (cho ô chọn khóa áp dụng). */
const loadPage = () =>
  Promise.all([
    Coupon.find().sort({ createdAt: -1 }).limit(300).populate('courses', 'title'),
    Course.find({ price: trusted({ $gt: 0 }) })
      .select('title')
      .sort({ title: 1 }),
  ]);

router.get('/coupons', validate(S.admin.coupons), async (req, res) => {
  const [list, courses] = await loadPage();
  res.render('admin/coupons', { title: 'Mã giảm giá', list, courses, errors: [], form: {} });
});

router.post('/coupons', validate(S.admin.couponCreate), async (req, res) => {
  const { form, errors } = parseCouponForm(req.body);
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
  const [list, courses] = await loadPage();
  res.status(400).render('admin/coupons', { title: 'Mã giảm giá', list, courses, errors, form });
});

router.post('/coupons/:id', validate(S.admin.couponToggle), async (req, res) => {
  const c = await Coupon.findById(req.params.id).catch(() => null);
  if (c) {
    c.active = req.body.active === '1';
    await c.save();
    await audit(req, 'coupon.update', { meta: { code: c.code, to: c.active ? 'active' : 'inactive' } });
  }
  res.redirect('/admin/coupons');
});

router.post('/coupons/:id/delete', validate(S.admin.couponDelete), async (req, res) => {
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

module.exports = router;
