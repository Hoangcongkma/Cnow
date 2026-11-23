// Nghiệp vụ mua khóa học: giá tính HOÀN TOÀN ở server (cent), mã giảm giá giữ lượt nguyên tử, tạo đơn theo cổng
// (miễn phí / demo / PayPal thật), mở quyền học duy nhất qua grant().
const crypto = require('crypto');
const { trusted } = require('mongoose');
const config = require('../config');
const paypal = require('./paypal');
const coupons = require('./coupon');
const money = require('./money');
const { notify } = require('./notify');
const { Course, Order, Enrollment, Coupon } = require('../models');

/**
 * Mở quyền học cho đơn đã thanh toán. Upsert → gọi lại nhiều lần vẫn an toàn (tải lại trang kết quả).
 * Thông báo "thanh toán thành công" chỉ gửi lần đầu và chỉ với đơn có trả tiền.
 */
async function grant(order) {
  const r = await Enrollment.updateOne(
    { user: order.user, course: order.course },
    { $setOnInsert: { user: order.user, course: order.course, order: order._id } },
    { upsert: true },
  );
  if (!r.upsertedCount || order.provider === 'free') return;
  const course = await Course.findById(order.course).select('title slug');
  await notify(order.user, {
    type: 'payment',
    text: `Thanh toán thành công $${order.amount}${order.provider === 'demo' ? ' (demo)' : ''} cho khóa học “${course ? course.title : ''}”. Chúc bạn học tốt!`,
    link: course ? `/learn/${course.slug}` : '/my-courses',
  });
}

/** Đơn cũ chưa thanh toán xong của chính người này cho khóa này (vd. đóng tab thanh toán) → hủy và trả lượt mã. */
async function cancelPending(userId, courseId) {
  for (const old of await Order.find({ user: userId, course: courseId, status: 'CREATED' })) {
    await Order.updateOne({ _id: old._id, status: 'CREATED' }, { status: 'CANCELLED', failureReason: 'replaced' });
    await coupons.release(old);
  }
}

/** Kiểm tra mã + tính giá + giữ 1 lượt dùng. Trả về { error } hoặc { coupon, price, couponFields }. */
async function applyCoupon(code, course, user) {
  const { coupon, error } = await coupons.findValid(code, course, user);
  if (error) return { error };
  const price = coupons.priceWith(course, coupon);
  if (coupon && !(await coupons.reserve(coupon))) return { error: 'Mã giảm giá vừa hết lượt sử dụng.' };
  const couponFields = coupon
    ? { coupon: coupon._id, couponCode: coupon.code, originalAmount: price.original, discount: price.discount }
    : {};
  return { coupon, price, couponFields };
}

async function enrollFree(base, extra = {}) {
  const order = await Order.create({ ...base, amount: '0.00', provider: 'free', status: 'COMPLETED', ...extra });
  await grant(order);
  return order;
}

/** Cổng PayPal thật: tạo đơn PayPal và chuyển hướng tới trang duyệt của PayPal. */
async function startPaypal(base, amount, couponFields, course, log) {
  const order = await Order.create({ ...base, amount, provider: 'paypal', ...couponFields });
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
    return { redirect: pp.approveUrl, status: 303 };
  } catch (err) {
    log.error({ err }, 'paypal:create thất bại');
    await Order.updateOne({ _id: order._id }, { status: 'FAILED', failureReason: 'create_failed' });
    await coupons.release(order);
    return {
      render: 'pay/result',
      status: 502,
      data: { title: 'Thanh toán thất bại', ok: false, course, message: 'Không kết nối được PayPal. Vui lòng thử lại sau.' },
    };
  }
}

/**
 * Bắt đầu mua khóa học. Trả về "hành động" cho route: { notFound } | { redirect, status?, flash? } | { render, status, data }.
 * @param {{ user: object, courseId: string, couponCode?: string, log: object }} input
 */
async function startCheckout({ user, courseId, couponCode, log }) {
  const course = await Course.findOne({ _id: courseId, published: true }).catch(() => null);
  if (!course) return { notFound: true };
  const learn = `/learn/${course.slug}`;
  if (await Enrollment.exists({ user: user.id, course: course.id })) return { redirect: learn };
  const base = { user: user.id, course: course.id };
  if (course.price === 0) {
    await enrollFree(base);
    return { redirect: learn };
  }
  await cancelPending(user.id, course.id);
  const c = await applyCoupon(couponCode, course, user);
  if (c.error) return { redirect: `/courses/${course.slug}`, flash: { type: 'warn', text: c.error } };
  if (c.coupon && c.price.finalCents === 0) {
    await enrollFree(base, c.couponFields); // giảm 100% → ghi danh ngay như khóa miễn phí
    return { redirect: learn, flash: { type: 'success', text: `Đã áp dụng mã ${c.coupon.code}: khóa học miễn phí cho bạn!` } };
  }
  const amount = c.price.final; // giá lấy từ CSDL (đã trừ mã giảm giá tính ở server)
  if (config.demo) {
    const ref = 'DEMO-ORD-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    await Order.create({ ...base, amount, amountVnd: money.toVnd(amount), provider: 'demo', providerOrderId: ref, ...c.couponFields });
    return { redirect: `/pay/demo/${ref}`, status: 303 };
  }
  if (!config.paypal.configured) {
    // PAYMENT_MODE=paypal nhưng thiếu khóa API → từ chối, KHÔNG mở khóa, trả lượt mã
    if (c.coupon) await Coupon.updateOne({ _id: c.coupon._id, usedCount: trusted({ $gt: 0 }) }, { $inc: { usedCount: -1 } });
    const data = { title: 'Chưa thể thanh toán', ok: false, course, message: 'Cổng thanh toán đang tạm ngừng. Vui lòng thử lại sau.' };
    return { render: 'pay/result', status: 503, data };
  }
  return startPaypal(base, amount, c.couponFields, course, log);
}

module.exports = { grant, startCheckout };
