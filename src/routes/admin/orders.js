// Hóa đơn & đơn hàng (chỉ admin): danh sách có lọc, hoàn tiền demo
const router = require('express').Router();
const { validate } = require('../../validators');
const S = require('../../validators/schemas');
const { Order } = require('../../models');
const listing = require('../../services/listing');
const { ordersQuery, METHODS } = require('../../services/admin-queries');
const { refundDemoOrder } = require('../../services/refund');

router.get('/orders', validate(S.admin.orders), async (req, res) => {
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

router.post('/orders/:id/refund', validate(S.admin.refund), async (req, res) => {
  const r = await refundDemoOrder(req, req.params.id);
  req.session.flash = { type: r.ok ? 'success' : 'warn', text: r.text };
  res.redirect(r.ok ? '/admin/orders?status=REFUNDED' : '/admin/orders');
});

module.exports = router;
