const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

async function loginBlocked(req, res) {
  await require('../services/audit').audit(req, 'login.rate_limited', {
    actor: null,
    meta: { login: String(req.body?.login || '').slice(0, 120) },
  });
  res.status(429).render('auth/login', {
    title: 'Đăng nhập',
    form: { login: String(req.body?.login || '').slice(0, 120) },
    error: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  });
}

// Vá lỗ hổng "Login page password-guessing attack" (Acunetix): tối đa 5 lần thử sai trong 15 phút / IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true, // chỉ đếm lần đăng nhập sai
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: loginBlocked,
});

// Thêm giới hạn THEO TÀI KHOẢN: chống dò mật khẩu một tài khoản từ nhiều IP (10 lần sai / 15 phút / tên đăng nhập)
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    `acct:${String(req.body?.login || '')
      .trim()
      .toLowerCase()
      .slice(0, 120)}`,
  handler: loginBlocked,
});

const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

// Giới hạn chung cho trang động theo IP (mặc định 600 yêu cầu/phút, đổi bằng GLOBAL_RATE_LIMIT)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.GLOBAL_RATE_LIMIT) || 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
});

// Phiên của khách chưa đăng nhập chỉ sống 2 giờ (tránh tích tụ phiên rác trong CSDL); đăng nhập sẽ cấp phiên mới 7 ngày
const ANON_SESSION_MS = 2 * 60 * 60 * 1000;

// Route nhận multipart/form-data (upload): body chỉ có sau khi multer chạy → kiểm tra CSRF trong route bằng verifyCsrf.
// Mọi route khác gửi multipart sẽ không có body → bị từ chối như thiếu token.
const MULTIPART_PATHS = new Set(['/profile/avatar']);

function tokenOk(req) {
  const sent = req.body?._csrf || req.get('x-csrf-token') || '';
  const a = Buffer.from(String(sent));
  const b = Buffer.from(req.session.csrf || '');
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
const reject = (res) =>
  res.status(403).render('error', {
    title: 'Yêu cầu không hợp lệ',
    message: 'Phiên làm việc đã hết hạn hoặc yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.',
  });

// CSRF: token đồng bộ lưu trong phiên, kiểm tra cho mọi request thay đổi dữ liệu
function csrf(req, res, next) {
  // Ảnh đại diện không có form → không tạo phiên chỉ để chứa token
  if (req.method === 'GET' && req.path.startsWith('/avatars/')) return next();
  if (!req.session.csrf) {
    req.session.csrf = crypto.randomBytes(32).toString('hex');
    if (!req.session.userId) req.session.cookie.maxAge = ANON_SESSION_MS;
  }
  res.locals.csrfToken = req.session.csrf;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.method === 'POST' && MULTIPART_PATHS.has(req.path) && req.is('multipart/form-data')) return next(); // kiểm tra sau multer
  if (!tokenOk(req)) return reject(res);
  next();
}

/** Dùng NGAY SAU multer trong các route thuộc MULTIPART_PATHS. */
function verifyCsrf(req, res, next) {
  if (!tokenOk(req)) return reject(res);
  next();
}

module.exports = { loginLimiter, loginAccountLimiter, registerLimiter, globalLimiter, csrf, verifyCsrf, ANON_SESSION_MS };
