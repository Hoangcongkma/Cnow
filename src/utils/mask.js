// Che dữ liệu cá nhân trước khi ghi log / nhật ký: email → c***@gmail.com
const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Che email: giữ ký tự đầu và tên miền. */
const maskEmail = (s) => String(s ?? '').replace(EMAIL_RE, '$1***@$2');

/** Che mọi email xuất hiện trong chuỗi bất kỳ (dùng cho thông điệp log). */
module.exports = { maskEmail };
