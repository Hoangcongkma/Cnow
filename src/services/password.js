// Kiểm tra độ mạnh mật khẩu – dùng chung cho đăng ký và đổi mật khẩu
const COMMON = ['password', 'matkhau', '12345678', '123456789', 'qwerty', 'abc12345', 'password1', 'iloveyou', 'admin123', 'cnow1234'];

/** Trả về danh sách lỗi (rỗng = đạt). */
function checkPassword(password, { username = '', email = '' } = {}) {
  const p = String(password || '');
  const errors = [];
  // bcrypt chỉ dùng 72 BYTE đầu: chữ tiếng Việt có dấu chiếm 2–3 byte nên phải đếm theo byte, không theo ký tự
  if (p.length < 8 || Buffer.byteLength(p, 'utf8') > 72)
    errors.push('Mật khẩu phải dài từ 8 ký tự và không quá 72 byte (khoảng 24–72 ký tự tùy dấu).');
  else if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) errors.push('Mật khẩu phải có cả chữ và số.');
  const lower = p.toLowerCase();
  if (COMMON.includes(lower)) errors.push('Mật khẩu quá phổ biến, hãy chọn mật khẩu khác.');
  if (
    (username && lower.includes(String(username).toLowerCase())) ||
    (email && lower.includes(String(email).split('@')[0].toLowerCase()) && String(email).split('@')[0].length >= 3)
  ) {
    errors.push('Mật khẩu không được chứa tên đăng nhập hoặc email.');
  }
  if (/^(.)\1+$/.test(p)) errors.push('Mật khẩu không được lặp một ký tự.');
  return errors;
}

module.exports = { checkPassword };
