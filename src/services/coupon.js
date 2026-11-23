// Mã giảm giá: kiểm tra, tính giá sau giảm (theo CENT, số nguyên – tránh sai số số thực), giữ/trả lượt dùng nguyên tử
const { trusted } = require('mongoose');
const { Coupon, Order } = require('../models');

/** Chuẩn hóa mã giảm giá người dùng nhập (bỏ khoảng trắng, viết hoa, tối đa 32 ký tự). */
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
        { $or: [{ expiresAt: null }, { expiresAt: trusted({ $gt: now }) }] },
        { $or: [{ maxUses: null }, { $expr: trusted({ $lt: ['$usedCount', '$maxUses'] }) }] },
      ],
    },
    { $inc: { usedCount: 1 } },
  );
  return r.modifiedCount === 1;
}

/** Trả lại lượt dùng khi đơn bị hủy/thất bại (chỉ 1 lần cho mỗi đơn). */
async function release(order) {
  if (!order || !order.coupon) return;
  const r = await Order.updateOne({ _id: order._id, couponReleased: trusted({ $ne: true }) }, { $set: { couponReleased: true } });
  if (r.modifiedCount) await Coupon.updateOne({ _id: order.coupon, usedCount: trusted({ $gt: 0 }) }, { $inc: { usedCount: -1 } });
}

/**
 * Form tạo mã giảm giá (quản trị) → { form, errors }. Chỉ nhận các trường được phép, kiểm tra giá trị hợp lệ.
 * @param {object} body req.body đã qua zod
 */
function parseCouponForm(body) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const many = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(String).filter((x) => /^[0-9a-f]{24}$/.test(x));
  const form = {
    code: String(one(body.code) || '')
      .trim()
      .toUpperCase(),
    type: one(body.type) === 'amount' ? 'amount' : 'percent',
    value: Number(one(body.value)),
    expiresAt: one(body.expiresAt) ? new Date(`${one(body.expiresAt)}T23:59:59+07:00`) : undefined,
    maxUses: one(body.maxUses) ? Math.floor(Number(one(body.maxUses))) : undefined,
    courses: many(body.courses),
    note: String(one(body.note) || '').slice(0, 200),
  };
  const errors = [];
  if (!/^[A-Z0-9_-]{3,32}$/.test(form.code)) errors.push('Mã 3–32 ký tự: chữ, số, gạch ngang, gạch dưới.');
  if (!(form.value > 0) || (form.type === 'percent' && form.value > 100)) {
    errors.push('Giá trị giảm không hợp lệ (phần trăm 1–100, hoặc số tiền > 0).');
  }
  if (form.expiresAt && Number.isNaN(+form.expiresAt)) errors.push('Ngày hết hạn không hợp lệ.');
  if (form.maxUses !== undefined && !(form.maxUses >= 1)) errors.push('Số lượt tối thiểu là 1.');
  return { form, errors };
}

module.exports = { normalize, priceWith, findValid, reserve, release, parseCouponForm };
