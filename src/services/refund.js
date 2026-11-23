// Hoàn tiền (DEMO): chỉ đơn demo đã thành công → REFUNDED, thu hồi quyền học, ghi audit log, báo học viên.
// Không gọi cổng thanh toán nào (thanh toán chỉ demo; hoàn tiền PayPal thật: không làm).
const { Order, Enrollment } = require('../models');
const orderLabels = require('./order-labels');
const { audit } = require('./audit');
const { notify } = require('./notify');

/**
 * @param {import('express').Request} req (để ghi audit: người thực hiện, IP, requestId)
 * @param {string} orderId
 * @returns {Promise<{ ok: boolean, text: string }>}
 */
async function refundDemoOrder(req, orderId) {
  const found = await Order.findById(orderId).catch(() => null);
  if (!found || !orderLabels.refundable(found)) {
    return { ok: false, text: 'Đơn hàng không tồn tại hoặc không hoàn tiền được (chỉ đơn demo đã thanh toán thành công).' };
  }
  // Chuyển trạng thái nguyên tử: bấm 2 lần chỉ hoàn 1 lần
  const order = await Order.findOneAndUpdate(
    { _id: found._id, status: 'COMPLETED' },
    { $set: { status: 'REFUNDED', refundedAt: new Date(), refundedBy: req.user._id } },
    { new: true },
  ).populate('course', 'title slug');
  if (!order) return { ok: false, text: 'Đơn hàng đã được xử lý trước đó.' };
  const revoked = await Enrollment.deleteOne({ user: order.user, course: order.course._id });
  await audit(req, 'order.refund', {
    target: order.user,
    meta: { orderId: order.id, amount: order.amount, currency: order.currency, courseId: order.course.id, reason: 'demo' },
  });
  await notify(order.user, {
    type: 'refund',
    text: `Đơn hàng khóa “${order.course.title}” ($${order.amount}) đã được hoàn tiền (demo). Quyền học khóa này đã được thu hồi.`,
    link: '/orders',
  });
  const tail = revoked.deletedCount ? ' và thu hồi quyền học' : '';
  return { ok: true, text: `Đã hoàn tiền (demo) đơn ${order.id.slice(-8).toUpperCase()}${tail}.` };
}

module.exports = { refundDemoOrder };
