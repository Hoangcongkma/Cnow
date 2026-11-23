// Mã quản trị (admin PIN): bước xác thực thứ hai bắt buộc của tài khoản admin (khi chưa bật TOTP).
// Chỉ lưu hash bcrypt (cost 12). Giữ lượt nhập NGUYÊN TỬ trong CSDL: tối đa 5 lần sai / 15 phút / tài khoản, sai quá → khóa 15 phút.
const { trusted } = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const COST = 12;
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

/** Quy tắc mã quản trị: ≥ 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Trả về danh sách lỗi. */
function checkPinRules(pin) {
  const s = String(pin || '');
  const errors = [];
  if (s.length < 10) errors.push('Mã quản trị phải có ít nhất 10 ký tự.');
  if (Buffer.byteLength(s, 'utf8') > 72) errors.push('Mã quản trị tối đa 72 byte.');
  if (!/[A-Z]/.test(s)) errors.push('Cần ít nhất 1 chữ hoa (A–Z).');
  if (!/[a-z]/.test(s)) errors.push('Cần ít nhất 1 chữ thường (a–z).');
  if (!/[0-9]/.test(s)) errors.push('Cần ít nhất 1 chữ số.');
  if (!/[^A-Za-z0-9]/.test(s)) errors.push('Cần ít nhất 1 ký tự đặc biệt (ví dụ ! @ # $ % _ -).');
  if (/\s/.test(s)) errors.push('Không dùng khoảng trắng.');
  return errors;
}

/** Băm mã quản trị (bcrypt). @param {string} pin @returns {Promise<string>} */
const hashPin = (pin) => bcrypt.hash(String(pin), COST);

/**
 * Giữ 1 lượt nhập mã: thất bại nếu tài khoản đang bị khóa hoặc đã có 5 lần sai trong 15 phút.
 * Lượt được ghi như 1 lần sai TRƯỚC khi so sánh (nhiều yêu cầu đồng thời không vượt giới hạn); đúng mã thì xóa.
 */
async function reserveAttempt(userId, now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_MS);
  await User.updateOne({ _id: userId }, { $pull: { adminPinFails: trusted({ $lt: since }) } });
  const r = await User.updateOne(
    {
      _id: userId,
      $and: [
        { $or: [{ adminPinLockedUntil: null }, { adminPinLockedUntil: trusted({ $lte: now }) }] },
        { $expr: trusted({ $lt: [{ $size: { $ifNull: ['$adminPinFails', []] } }, MAX_FAILS] }) },
      ],
    },
    { $push: { adminPinFails: now } },
  );
  return r.modifiedCount === 1;
}

/** Sau 1 lần sai: đủ 5 lần trong cửa sổ → khóa 15 phút. Trả về true nếu vừa bị khóa. */
async function afterFailure(userId, now = new Date()) {
  const r = await User.updateOne(
    { _id: userId, [`adminPinFails.${MAX_FAILS - 1}`]: trusted({ $exists: true }) },
    { $set: { adminPinLockedUntil: new Date(now.getTime() + LOCK_MS) }, $unset: { adminPinFails: '' } },
  );
  return r.modifiedCount === 1;
}

/** Xóa bộ đếm sai + khóa tạm của mã quản trị (sau khi nhập đúng). */
const clearFailures = (userId) => User.updateOne({ _id: userId }, { $unset: { adminPinFails: '', adminPinLockedUntil: '' } });

/**
 * So mã quản trị với hash lưu trong CSDL (không giới hạn lượt – gọi reserveAttempt trước).
 * @returns {Promise<boolean>} false nếu sai hoặc chưa đặt mã
 */
async function verifyPin(userId, pin) {
  const u = await User.findById(userId).select('+adminPinHash');
  if (!u || !u.adminPinHash) return false;
  return bcrypt.compare(String(pin || ''), u.adminPinHash);
}

/** Tài khoản đã đặt mã quản trị chưa (`npm run set:admin-pin`). */
const hasPin = async (userId) => Boolean(await User.exists({ _id: userId, adminPinHash: trusted({ $type: 'string' }) }));

module.exports = {
  MAX_FAILS,
  WINDOW_MS,
  checkPinRules,
  hashPin,
  reserveAttempt,
  afterFailure,
  clearFailures,
  verifyPin,
  hasPin,
};
