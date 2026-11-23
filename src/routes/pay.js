// Luồng thanh toán: đăng nhập -> chọn khóa học -> thanh toán -> xác nhận -> mở khóa học
// PAYMENT_MODE=demo (mặc định): cổng MÔ PHỎNG PayPal / VNPay / MoMo – không trừ tiền thật, mọi đơn ghi rõ DEMO.
// PAYMENT_MODE=paypal: PayPal Orders API v2 thật (giữ nguyên, chỉ dùng khi có khóa API).
const { trusted } = require('mongoose');
const { validate } = require('../validators');
const S = require('../validators/schemas');
const router = require('express').Router();
const paymentLimiter = require('../security/rate-limit').limits.payment();
const crypto = require('crypto');
const config = require('../config');
const paypal = require('../services/paypal');
const { Course, Order, Enrollment, Coupon } = require('../models');
const { notify } = require('../services/notify');
const coupons = require('../services/coupon');
const money = require('../services/money');
const { GATEWAYS, billable } = require('../services/order-labels');
const { buildInvoice, invoiceNumber } = require('../services/invoice');

async function grant(order) {
  // upsert: an toàn khi người dùng tải lại trang success nhiều lần
  const r = await Enrollment.updateOne(
    { user: order.user, course: order.course },
    { $setOnInsert: { user: order.user, course: order.course, order: order._id } },
    { upsert: true },
  );
  // Thông báo thanh toán thành công – chỉ lần đầu mở quyền học (không lặp khi tải lại trang) và chỉ với đơn có trả tiền
  if (r.upsertedCount && order.provider !== 'free') {
    const course = await Course.findById(order.course).select('title slug');
    await notify(order.user, {
      type: 'payment',
      text: `Thanh toán thành công $${order.amount}${order.provider === 'demo' ? ' (demo)' : ''} cho khóa học “${course ? course.title : ''}”. Chúc bạn học tốt!`,
      link: course ? `/learn/${course.slug}` : '/my-courses',
    });
  }
}

const notFoundOrder = (res) =>
  res.status(404).render('error', { title: 'Không tìm thấy đơn hàng', message: 'Đơn hàng không tồn tại hoặc không thuộc về bạn.' });

router.post('/pay', paymentLimiter, validate(S.pay.create), async (req, res) => {
  const course = await Course.findOne({ _id: req.body.courseId, published: true }).catch(() => null);
  if (!course) return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Khóa học không tồn tại.' });
  if (await Enrollment.exists({ user: req.user.id, course: course.id })) return res.redirect(`/learn/${course.slug}`);

  // Khóa học miễn phí: ghi danh ngay
  if (course.price === 0) {
    const order = await Order.create({ user: req.user.id, course: course.id, amount: '0.00', provider: 'free', status: 'COMPLETED' });
    await grant(order);
    return res.redirect(`/learn/${course.slug}`);
  }

  // Đơn cũ chưa thanh toán xong của chính người này cho khóa này (vd. đóng tab thanh toán) → hủy và trả lượt mã giảm giá
  for (const old of await Order.find({ user: req.user.id, course: course.id, status: 'CREATED' })) {
    await Order.updateOne({ _id: old._id, status: 'CREATED' }, { status: 'CANCELLED', failureReason: 'replaced' });
    await coupons.release(old);
  }

  // Mã giảm giá (nếu có): kiểm tra và tính lại giá HOÀN TOÀN ở server, không tin số tiền/giảm giá từ form
  const back = `/courses/${course.slug}`;
  const { coupon, error: couponError } = await coupons.findValid(req.body.coupon, course, req.user);
  if (couponError) {
    req.session.flash = { type: 'warn', text: couponError };
    return res.redirect(back);
  }
  const price = coupons.priceWith(course, coupon);
  const couponFields = coupon
    ? { coupon: coupon._id, couponCode: coupon.code, originalAmount: price.original, discount: price.discount }
    : {};
  // Giữ 1 lượt dùng mã (nguyên tử); hết lượt do người khác vừa dùng → báo lại
  if (coupon && !(await coupons.reserve(coupon))) {
    req.session.flash = { type: 'warn', text: 'Mã giảm giá vừa hết lượt sử dụng.' };
    return res.redirect(back);
  }

  // Giảm 100% → ghi danh ngay như khóa miễn phí
  if (coupon && price.finalCents === 0) {
    const order = await Order.create({
      user: req.user.id,
      course: course.id,
      amount: '0.00',
      provider: 'free',
      status: 'COMPLETED',
      ...couponFields,
    });
    await grant(order);
    req.session.flash = { type: 'success', text: `Đã áp dụng mã ${coupon.code}: khóa học miễn phí cho bạn!` };
    return res.redirect(`/learn/${course.slug}`);
  }

  const amount = price.final; // giá lấy từ CSDL (đã trừ mã giảm giá tính ở server)

  // ---------- Cổng DEMO: tạo đơn rồi chuyển tới trang chọn phương thức ----------
  if (config.demo) {
    const order = await Order.create({
      user: req.user.id,
      course: course.id,
      amount,
      amountVnd: money.toVnd(amount),
      provider: 'demo',
      providerOrderId: 'DEMO-ORD-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
      ...couponFields,
    });
    return res.redirect(303, `/pay/demo/${order.providerOrderId}`);
  }

  // PAYMENT_MODE=paypal nhưng thiếu khóa API → từ chối, KHÔNG mở khóa
  if (!config.paypal.configured) {
    if (coupon) await Coupon.updateOne({ _id: coupon._id, usedCount: trusted({ $gt: 0 }) }, { $inc: { usedCount: -1 } });
    return res.status(503).render('pay/result', {
      title: 'Chưa thể thanh toán',
      ok: false,
      course,
      message: 'Cổng thanh toán đang tạm ngừng. Vui lòng thử lại sau.',
    });
  }

  const order = await Order.create({ user: req.user.id, course: course.id, amount, provider: 'paypal', ...couponFields });
  try {
    const pp = await paypal.createOrder({
      referenceId: order.id,
      amount,
      description: `Cnow – ${course.title}`,
      returnUrl: `${config.baseUrl}/pay/success`,
      cancelUrl: `${config.baseUrl}/pay/cancel`,
    });
    order.providerOrderId = pp.id;
    await order.save();
    res.redirect(303, pp.approveUrl); // chuyển sang PayPal
  } catch (err) {
    req.log.error({ err }, 'paypal:create thất bại');
    await Order.updateOne({ _id: order._id }, { status: 'FAILED', failureReason: 'create_failed' });
    await coupons.release(order);
    res.status(502).render('pay/result', {
      title: 'Thanh toán thất bại',
      ok: false,
      course,
      message: 'Không kết nối được PayPal. Vui lòng thử lại sau.',
    });
  }
});

// ---------- PayPal thật (PAYMENT_MODE=paypal) ----------
// PayPal chuyển về: /pay/success?token=<PayPal order id>&PayerID=...
router.get('/pay/success', validate(S.pay.paypalReturn), async (req, res) => {
  const order = await Order.findOne({ providerOrderId: String(req.query.token || ''), user: req.user.id, provider: 'paypal' }).populate(
    'course',
  );
  if (!order) return notFoundOrder(res);
  if (order.status === 'COMPLETED') return res.redirect(`/learn/${order.course.slug}`);
  if (order.status !== 'CREATED')
    return res.render('pay/result', {
      title: 'Thanh toán thất bại',
      ok: false,
      course: order.course,
      message: 'Đơn hàng này đã kết thúc.',
    });

  try {
    const r = await paypal.captureOrder(order.providerOrderId);
    // Đối chiếu kết quả với đơn hàng trong CSDL trước khi mở quyền học
    const valid = r.status === 'COMPLETED' && r.captureStatus === 'COMPLETED' && r.amount === order.amount && r.currency === order.currency;
    // Chỉ log thông tin đối chiếu, không log email/thông tin cá nhân của người trả tiền
    if (!valid)
      throw new Error(`Kết quả không khớp (order ${order.id}): status=${r.status}/${r.captureStatus} amount=${r.amount} ${r.currency}`);
    Object.assign(order, { status: 'COMPLETED', captureId: r.captureId, payerEmail: r.payerEmail });
    await order.save();
    await grant(order);
    res.render('pay/result', { title: 'Thanh toán thành công', ok: true, course: order.course, order });
  } catch (err) {
    req.log.error({ err }, 'paypal:capture thất bại');
    await Order.updateOne({ _id: order._id, status: 'CREATED' }, { status: 'FAILED', failureReason: 'capture_failed' });
    await coupons.release(order);
    res.render('pay/result', {
      title: 'Thanh toán thất bại',
      ok: false,
      course: order.course,
      message: 'Giao dịch không được xác nhận. Bạn chưa bị trừ tiền hoặc sẽ được PayPal hoàn lại.',
    });
  }
});

router.get('/pay/cancel', validate(S.pay.paypalReturn), async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { providerOrderId: String(req.query.token || ''), user: req.user.id, provider: 'paypal', status: 'CREATED' },
    { status: 'CANCELLED' },
    { new: true },
  ).populate('course');
  await coupons.release(order);
  res.render('pay/result', {
    title: 'Đã hủy thanh toán',
    ok: false,
    course: order?.course,
    message: 'Bạn đã hủy thanh toán. Khóa học chưa được mở.',
  });
});

// ---------- Cổng thanh toán DEMO (PAYMENT_MODE=demo) ----------
if (config.demo) {
  const REF = /^DEMO-ORD-[0-9A-F]{16}$/;
  const findDemo = (req) =>
    REF.test(req.params.ref)
      ? Order.findOne({ providerOrderId: req.params.ref, user: req.user.id, provider: 'demo' }).populate('course', 'title slug')
      : null;
  /** Số tiền cổng phải thu: PayPal demo theo USD ("19.99"), VNPay/MoMo demo theo VND (số nguyên). */
  const expected = (order, gw) =>
    GATEWAYS[gw].currency === 'USD' ? { amount: order.amount, currency: 'USD' } : { amount: String(order.amountVnd), currency: 'VND' };

  /** Đơn đã kết thúc (bấm lại, tải lại trang, bấm 2 lần) → hiển thị đúng kết quả, KHÔNG xử lý lại. */
  const showFinal = (res, order) =>
    order.status === 'COMPLETED'
      ? res.render('pay/result', { title: 'Thanh toán thành công', ok: true, course: order.course, order })
      : res.status(409).render('pay/result', {
          title: 'Đơn hàng đã kết thúc',
          ok: false,
          course: order.course,
          order,
          message: 'Đơn hàng này đã được xử lý trước đó. Nếu muốn mua lại, hãy quay lại trang khóa học.',
        });

  // Bước 1: chọn phương thức
  router.get('/pay/demo/:ref', validate(S.pay.demoChoose), async (req, res) => {
    const order = await findDemo(req);
    if (!order) return notFoundOrder(res);
    if (order.status !== 'CREATED') return showFinal(res, order);
    res.render('pay/demo-choose', { title: 'Chọn phương thức thanh toán (demo)', order, gateways: GATEWAYS });
  });

  // Bước 2: trang xác nhận của cổng đã chọn
  router.get('/pay/demo/:ref/:gw', validate(S.pay.demoGateway), async (req, res) => {
    if (!GATEWAYS[req.params.gw]) return notFoundOrder(res);
    const order = await findDemo(req);
    if (!order) return notFoundOrder(res);
    if (order.status !== 'CREATED') return showFinal(res, order);
    const gw = req.params.gw;
    res.render('pay/demo-gateway', {
      title: `${GATEWAYS[gw].label} – xác nhận (demo)`,
      order,
      gw,
      gateway: GATEWAYS[gw],
      expect: expected(order, gw),
    });
  });

  // Bước 3: kết quả (Thanh toán thành công / thất bại / Hủy giao dịch)
  router.post('/pay/demo/:ref/:gw', paymentLimiter, validate(S.pay.demoSubmit), async (req, res) => {
    const gw = req.params.gw;
    if (!GATEWAYS[gw]) return notFoundOrder(res);
    const found = await findDemo(req);
    if (!found) return notFoundOrder(res);
    if (found.status !== 'CREATED') return showFinal(res, found);

    const action = String(req.body.action || '');
    if (!['success', 'fail', 'cancel'].includes(action)) return res.status(400).render('error', { title: 'Yêu cầu không hợp lệ' });
    // "Cổng" trả về số tiền + loại tiền → đối chiếu với đơn trong CSDL (giống kiểm tra capture của PayPal thật)
    const exp = expected(found, gw);
    const amountOk = String(req.body.amount || '') === exp.amount && String(req.body.currency || '') === exp.currency;

    let update;
    if (action === 'success' && amountOk) {
      update = { status: 'COMPLETED', gateway: gw, captureId: 'DEMO-' + crypto.randomBytes(4).toString('hex').toUpperCase() };
    } else if (action === 'success') {
      update = { status: 'FAILED', gateway: gw, failureReason: 'amount_mismatch' };
    } else if (action === 'fail') {
      update = { status: 'FAILED', gateway: gw, failureReason: 'demo_declined' };
    } else {
      update = { status: 'CANCELLED', gateway: gw, failureReason: 'demo_cancelled' };
    }
    // Chuyển trạng thái NGUYÊN TỬ từ CREATED: bấm 2 lần / 2 tab cùng lúc → chỉ 1 yêu cầu được xử lý
    const order = await Order.findOneAndUpdate({ _id: found._id, status: 'CREATED' }, { $set: update }, { new: true }).populate(
      'course',
      'title slug',
    );
    if (!order) return showFinal(res, await Order.findById(found._id).populate('course', 'title slug'));

    if (order.status === 'COMPLETED') {
      await grant(order);
      return res.render('pay/result', { title: 'Thanh toán thành công', ok: true, course: order.course, order });
    }
    await coupons.release(order);
    const messages = {
      amount_mismatch: 'Số tiền cổng thanh toán trả về không khớp với đơn hàng – giao dịch bị từ chối, khóa học chưa được mở.',
      demo_declined: 'Giao dịch thất bại (mô phỏng). Bạn chưa bị trừ tiền – hãy thử lại hoặc chọn phương thức khác.',
      demo_cancelled: 'Bạn đã hủy giao dịch. Khóa học chưa được mở.',
    };
    res.status(order.failureReason === 'amount_mismatch' ? 400 : 200).render('pay/result', {
      title: order.status === 'CANCELLED' ? 'Đã hủy giao dịch' : 'Thanh toán thất bại',
      ok: false,
      course: order.course,
      order,
      message: messages[order.failureReason],
    });
  });
}

// Hóa đơn PDF: chỉ chủ đơn hàng hoặc admin; chỉ đơn đã thanh toán / đã hoàn tiền (hoặc miễn phí nhờ mã giảm giá)
router.get('/orders/:id/invoice.pdf', validate(S.pay.invoice), async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email username')
    .populate('course', 'title')
    .catch(() => null);
  const mine = order && order.user && (String(order.user._id) === req.user.id || req.user.role === 'admin');
  if (!mine || !billable(order))
    return res.status(404).render('error', { title: 'Không tìm thấy', message: 'Không có hóa đơn cho đơn hàng này.' });
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="cnow-${invoiceNumber(order)}.pdf"`,
    'Cache-Control': 'no-store',
  });
  buildInvoice({ order, user: order.user, course: order.course }).pipe(res);
});

router.get('/orders', validate(S.none), async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).populate('course', 'title slug');
  res.render('user/orders', { title: 'Lịch sử thanh toán', orders });
});

module.exports = router;
module.exports.grant = grant;
