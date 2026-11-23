// Tiện ích an toàn dùng chung: chuyển hướng nội bộ, biểu thức chính quy từ dữ liệu người dùng.

/**
 * Chỉ chấp nhận đường dẫn NỘI BỘ để chuyển hướng (chống open redirect).
 * Từ chối: URL tuyệt đối (https://…), "//host", "/\host" (trình duyệt coi "\" như "/"), ký tự điều khiển / xuống dòng.
 * @param {unknown} target giá trị từ người dùng (body, query, session)
 * @param {string} fallback đường dẫn dùng khi target không hợp lệ
 * @param {string} [prefix='/'] chỉ cho phép đường dẫn bắt đầu bằng tiền tố này (vd. '/admin/')
 * @returns {string}
 */
function safeRedirect(target, fallback, prefix = '/') {
  const s = typeof target === 'string' ? target : '';
  if (!s || s.length > 500) return fallback;
  if (!s.startsWith('/') || s.startsWith('//') || s.includes('\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(s)) return fallback; // eslint-disable-line no-control-regex -- chặn CR/LF, tab
  if (!s.startsWith(prefix) && s !== prefix.replace(/\/$/, '')) return fallback;
  return s;
}

/** Escape ký tự đặc biệt của RegExp. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * RegExp tìm kiếm "chứa chuỗi" từ dữ liệu người dùng: luôn escape + cắt độ dài → không thể tạo mẫu gây ReDoS.
 * @param {unknown} s
 * @param {number} [max=80]
 */
// eslint-disable-next-line security/detect-non-literal-regexp -- đầu vào đã escape toàn bộ ký tự đặc biệt và cắt ≤ 80 ký tự
const searchRegex = (s, max = 80) => new RegExp(escapeRegex(String(s ?? '').slice(0, max)), 'i');

module.exports = { safeRedirect, escapeRegex, searchRegex };
