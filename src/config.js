// Cấu hình tập trung: MỌI biến môi trường được đọc và kiểm tra (zod) tại đây, một lần khi khởi động.
// Sai định dạng / thiếu biến bắt buộc → dừng ngay với thông báo rõ ràng (KHÔNG in giá trị – có thể là bí mật).
// Kiểm thử tự động (NODE_ENV=test) KHÔNG đọc .env: mọi biến do test tự đặt, tránh dùng nhầm khóa PayPal/CSDL thật.
if (process.env.NODE_ENV !== 'test') require('dotenv').config({ quiet: true });
const path = require('path');
const { z } = require('zod');

// Ô trống trong .env (vd. `TRUST_PROXY=`) coi như không khai báo
const opt = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

const schema = z.object({
  NODE_ENV: opt(z.enum(['development', 'test', 'production'], 'chỉ chấp nhận development, test hoặc production')),
  PORT: opt(z.coerce.number().int().min(1).max(65535)),
  BASE_URL: opt(z.url({ protocol: /^https?$/, error: 'phải là URL http(s) hợp lệ' })),
  MONGODB_URI: opt(z.string().regex(/^mongodb(\+srv)?:\/\//, 'phải bắt đầu bằng mongodb:// hoặc mongodb+srv://')),
  SESSION_SECRET: opt(z.string()),
  MFA_KEY: opt(z.string()),
  TRUST_PROXY: opt(z.enum(['0', '1'], 'chỉ chấp nhận 0 hoặc 1')),
  GLOBAL_RATE_LIMIT: opt(z.coerce.number().int().min(10).max(100000)),
  LOG_LEVEL: opt(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])),
  UPLOAD_DIR: opt(z.string()),
  PAYMENT_MODE: opt(z.enum(['demo', 'paypal'], 'chỉ chấp nhận demo hoặc paypal')),
  PAYPAL_MODE: opt(z.enum(['live', 'sandbox'], 'chỉ chấp nhận live hoặc sandbox')),
  PAYPAL_CLIENT_ID: opt(z.string()),
  PAYPAL_CLIENT_SECRET: opt(z.string()),
  DEMO_USD_VND: opt(z.coerce.number().int().min(1000).max(1000000)),
  DEMO_NOINDEX: opt(z.enum(['true', 'false'], 'chỉ chấp nhận true hoặc false')),
  SECURITY_CONTACT: opt(z.string().regex(/^(mailto:[^@\s]+@[^@\s]+|https:\/\/\S+)$/, 'phải dạng mailto:email hoặc https://…')),
});

/** Kiểm tra process.env; lỗi → Error liệt kê TÊN biến + lý do (không kèm giá trị). */
function parseEnv(source) {
  const r = schema.safeParse(source);
  if (r.success) return r.data;
  const lines = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Cấu hình môi trường không hợp lệ:\n${lines.join('\n')}`);
}

/** Ràng buộc giữa các biến (an toàn mặc định đóng: chế độ "nới lỏng" chỉ khi CHẮC CHẮN chạy trên máy cá nhân). */
function checkRules(e, { env, isProd, isLocal }) {
  // Production phải khai báo rõ địa chỉ website và CSDL (không dùng giá trị mặc định localhost)
  if (isProd) for (const k of ['MONGODB_URI', 'BASE_URL']) if (!e[k]) throw new Error(`Production bắt buộc khai báo ${k}`);
  if (!isLocal && env !== 'test' && (e.SESSION_SECRET || '').length < 32) {
    throw new Error('SESSION_SECRET phải dài ít nhất 32 ký tự khi website không chạy trên localhost');
  }
  if (isProd && e.PAYMENT_MODE === 'paypal') {
    if (!(e.PAYPAL_CLIENT_ID && e.PAYPAL_CLIENT_SECRET))
      throw new Error('PAYMENT_MODE=paypal ở production bắt buộc cấu hình PAYPAL_CLIENT_ID và PAYPAL_CLIENT_SECRET');
    if (!e.PAYPAL_MODE) throw new Error('PAYMENT_MODE=paypal ở production bắt buộc khai báo rõ PAYPAL_MODE=live (hoặc sandbox)');
  }
}

/** Dựng object cấu hình từ biến môi trường (dùng lại được trong kiểm thử). */
function buildConfig(source = process.env) {
  const e = parseEnv(source);
  const env = e.NODE_ENV || 'development';
  const isProd = env === 'production';
  const port = e.PORT || 3000;
  const baseUrl = (e.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
  // Chạy trên máy cá nhân: BASE_URL trỏ về localhost và không phải production
  const isLocal = !isProd && LOCAL_HOSTS.includes(new URL(baseUrl).hostname);
  const isHttps = baseUrl.startsWith('https://');
  checkRules(e, { env, isProd, isLocal });
  // Cổng thanh toán: demo (mặc định – PayPal/VNPay/MoMo MÔ PHỎNG, không trừ tiền thật) hoặc paypal (PayPal thật, cần khóa API)
  const paymentMode = e.PAYMENT_MODE || 'demo';
  const sessionSecret = e.SESSION_SECRET || 'dev-only-secret-change-me-dev-only-secret'; // chỉ dùng được khi isLocal/test (đã kiểm tra)
  return {
    env,
    isProd,
    isLocal,
    isHttps,
    port,
    baseUrl,
    mongoUri: e.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnow',
    // Thư mục upload CŨ (trước GridFS): chỉ migration đọc để chuyển ảnh cũ
    uploadDir: path.resolve(__dirname, '..', e.UPLOAD_DIR || 'uploads'),
    sessionSecret,
    // Khóa mã hóa bí mật TOTP: MFA_KEY nếu có, nếu không suy ra từ SESSION_SECRET
    mfaKey: e.MFA_KEY || sessionSecret,
    trustProxy: isProd || e.TRUST_PROXY === '1',
    // Tiền tố __Host-: trình duyệt chỉ nhận cookie khi Secure, Path=/ và KHÔNG có Domain → không bị subdomain ghi đè
    sessionCookieName: isProd && isHttps ? '__Host-cnow.sid' : 'cnow.sid',
    logLevel: e.LOG_LEVEL || { production: 'info', test: 'silent' }[env] || 'debug',
    globalRateLimit: e.GLOBAL_RATE_LIMIT || 600,
    noindex: e.DEMO_NOINDEX === 'true', // bản demo công khai: chặn máy tìm kiếm
    securityContact: e.SECURITY_CONTACT || `${baseUrl}/gioi-thieu`,
    paymentMode,
    demo: paymentMode === 'demo', // cổng demo: mọi đơn ghi rõ "DEMO – không phải giao dịch thật"
    usdVnd: e.DEMO_USD_VND || 26000, // tỉ giá DEMO để hiển thị VND và tính tiền cổng VNPay/MoMo mô phỏng
    paypal: {
      configured: paymentMode === 'paypal' && Boolean(e.PAYPAL_CLIENT_ID && e.PAYPAL_CLIENT_SECRET), // thiếu khóa → /pay trả 503
      mode: e.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
      clientId: e.PAYPAL_CLIENT_ID,
      clientSecret: e.PAYPAL_CLIENT_SECRET,
      currency: 'USD', // PayPal không hỗ trợ VND
    },
  };
}

module.exports = buildConfig();
module.exports.buildConfig = buildConfig;
