// Mã giảm giá: kiểm tra, tính giá sau giảm (theo CENT, số nguyên – tránh sai số số thực), giữ/trả lượt dùng nguyên tử
const { Coupon, Order } = require('../models');

const normalize = (code) =>
  String(code ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 32);
const cents = (usd) => Math.round(Number(usd) * 100);
const money = (c) => (c / 100).toFixed(2);

/** Giá sau giảm cho một khóa học: { original, discount, final } dạng chuỗi "19.99" và finalCents. */
function priceWith(course, coupon) {
  const base = cents(course.price);
  let off = 0;
  if (coupon) off = coupon.type === 'percent' ? Math.round((base * coupon.value) / 100) : Math.min(base, cents(coupon.value));
  const final = Math.max(0, base - off);
  return { original: money(base), discount: money(base - final), final: money(final), finalCents: final };
}

/**
 * Tìm mã hợp lệ cho khóa học + người dùng. Trả về { coupon } hoặc { error }.
 * Không giữ lượt dùng – việc đó làm ở reserve() khi tạo đơn.
 */
async function findValid(rawCode, course, user) {
  const code = normalize(rawCode);
  if (!code) return {};
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { error: 'Mã giảm giá không hợp lệ.' };
  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.active) return { error: 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.' };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: 'Mã giảm giá đã hết hạn.' };
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { error: 'Mã giảm giá đã hết lượt sử dụng.' };
  if (course.price <= 0) return { error: 'Khóa học miễn phí không cần mã giảm giá.' };
  if (coupon.courses.length && !coupon.courses.some((id) => String(id) === String(course._id))) {
    return { error: 'Mã giảm giá không áp dụng cho khóa học này.' };
  }
  if (user && (await Order.exists({ user: user._id, coupon: coupon._id, status: 'COMPLETED' }))) {
    return { error: 'Bạn đã dùng mã giảm giá này rồi.' };
  }
  return { coupon };
}

/** Giữ 1 lượt dùng – nguyên tử, không vượt maxUses kể cả khi nhiều người dùng cùng lúc. */
async function reserve(coupon) {
  const now = new Date();
  const r = await Coupon.updateOne(
    {
      _id: coupon._id,
      active: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
      ],
    },
    { $inc: { usedCount: 1 } },
  );
  return r.modifiedCount === 1;
}

/** Trả lại lượt dùng khi đơn bị hủy/thất bại (chỉ 1 lần cho mỗi đơn). */
async function release(order) {
  if (!order || !order.coupon) return;
  const r = await Order.updateOne({ _id: order._id, couponReleased: { $ne: true } }, { $set: { couponReleased: true } });
  if (r.modifiedCount) await Coupon.updateOne({ _id: order.coupon, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

module.exports = { normalize, priceWith, findValid, reserve, release };
