// Kiểm tra độ mạnh mật khẩu – dùng chung cho đăng ký, đổi mật khẩu, seed
// Danh sách 1000 mật khẩu phổ biến nhất: data/security/common-passwords.txt (SecLists, giấy phép MIT), nạp 1 lần vào Set.
const fs = require('fs');
const path = require('path');

const MIN_LENGTH = 10;
const MAX_BYTES = 72; // bcrypt chỉ dùng 72 BYTE đầu

const COMMON = new Set(
  fs
    .readFileSync(path.join(__dirname, '..', '..', 'data', 'security', 'common-passwords.txt'), 'utf8')
    .split('\n')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);
// Bổ sung vài mật khẩu hay gặp ở Việt Nam / của chính website
for (const p of ['matkhau', 'matkhau123', 'abc12345', 'admin123', 'cnow1234', 'cnow123456', '1234567890', 'qwerty123']) COMMON.add(p);

/** Mật khẩu (không phân biệt hoa thường) có nằm trong danh sách phổ biến – kể cả khi chỉ thêm số/ký tự ở cuối. */
function isCommon(p) {
  const lower = p.toLowerCase();
  if (COMMON.has(lower)) return true;
  const core = lower.replace(/[\d!@#$%^&*._-]+$/, ''); // "password2026!" → "password"
  return core.length >= 4 && COMMON.has(core);
}

/**
 * Kiểm tra mật khẩu mới. Trả về danh sách lỗi (rỗng = đạt).
 * @param {string} password
 * @param {{ username?: string, email?: string }} [ctx]
 * @returns {string[]}
 */
function checkPassword(password, { username = '', email = '' } = {}) {
  const p = String(password || '');
  const errors = [];
  // Tiếng Việt có dấu chiếm 2–3 byte → đếm byte, không đếm ký tự
  if (p.length < MIN_LENGTH || Buffer.byteLength(p, 'utf8') > MAX_BYTES) {
    errors.push(`Mật khẩu phải dài từ ${MIN_LENGTH} ký tự và không quá ${MAX_BYTES} byte (khoảng 24–72 ký tự tùy dấu).`);
  } else if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) errors.push('Mật khẩu phải có cả chữ và số.');
  const lower = p.toLowerCase();
  if (isCommon(p)) errors.push('Mật khẩu quá phổ biến (nằm trong danh sách mật khẩu hay bị dò), hãy chọn mật khẩu khác.');
  const local = String(email).split('@')[0].toLowerCase();
  if ((username && lower.includes(String(username).toLowerCase())) || (local.length >= 3 && lower.includes(local))) {
    errors.push('Mật khẩu không được chứa tên đăng nhập hoặc email.');
  }
  if (/^(.)\1+$/.test(p)) errors.push('Mật khẩu không được lặp một ký tự.');
  return errors;
}

module.exports = { checkPassword };
