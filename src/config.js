// Kiểm thử tự động (NODE_ENV=test) KHÔNG đọc .env: mọi biến do test tự đặt, tránh dùng nhầm khóa PayPal/CSDL thật
if (process.env.NODE_ENV !== 'test') require('dotenv').config({ quiet: true });

// An toàn mặc định đóng (fail closed): mọi chế độ "nới lỏng" chỉ bật khi CHẮC CHẮN đang chạy trên máy cá nhân.
const env = process.env.NODE_ENV || 'development';
if (!['development', 'test', 'production'].includes(env)) {
  throw new Error(`NODE_ENV="${env}" không hợp lệ – chỉ chấp nhận development, test hoặc production`);
}
const isProd = env === 'production';
// Production phải khai báo rõ địa chỉ website và CSDL (không dùng giá trị mặc định localhost)
if (isProd) {
  for (const k of ['MONGODB_URI', 'BASE_URL']) if (!process.env[k]) throw new Error(`Production bắt buộc khai báo ${k}`);
}
const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');

let baseHost;
try {
  baseHost = new URL(baseUrl).hostname;
} catch {
  throw new Error(`BASE_URL="${baseUrl}" không phải URL hợp lệ`);
}
// Chạy trên máy cá nhân: BASE_URL trỏ về localhost và không phải production
const isLocal = !isProd && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(baseHost);
const isHttps = baseUrl.startsWith('https://');

const secret = process.env.SESSION_SECRET || '';
if (!isLocal && env !== 'test' && secret.length < 32) {
  throw new Error('SESSION_SECRET phải dài ít nhất 32 ký tự khi website không chạy trên localhost');
}

// Cổng thanh toán: demo (mặc định – PayPal/VNPay/MoMo MÔ PHỎNG, không trừ tiền thật, chạy được cả production)
// hoặc paypal (PayPal thật, cần khóa API).
const paymentMode = process.env.PAYMENT_MODE || 'demo';
if (!['demo', 'paypal'].includes(paymentMode)) {
  throw new Error(`PAYMENT_MODE="${paymentMode}" không hợp lệ – chỉ chấp nhận demo hoặc paypal`);
}
const paypalConfigured = paymentMode === 'paypal' && Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
if (isProd && paymentMode === 'paypal' && !paypalConfigured) {
  throw new Error('PAYMENT_MODE=paypal ở production bắt buộc cấu hình PAYPAL_CLIENT_ID và PAYPAL_CLIENT_SECRET');
}
if (isProd && paymentMode === 'paypal' && !['live', 'sandbox'].includes(process.env.PAYPAL_MODE)) {
  throw new Error('PAYMENT_MODE=paypal ở production bắt buộc khai báo rõ PAYPAL_MODE=live (hoặc sandbox)');
}
const usdVnd = process.env.DEMO_USD_VND ? Number(process.env.DEMO_USD_VND) : 26000;
if (!Number.isInteger(usdVnd) || usdVnd < 1000 || usdVnd > 1000000) {
  throw new Error('DEMO_USD_VND phải là số nguyên (VND cho 1 USD), ví dụ 26000');
}

module.exports = {
  env,
  isProd,
  isLocal,
  isHttps,
  port,
  baseUrl,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnow',
  // Thư mục upload CŨ (trước khi chuyển sang GridFS). Ảnh đại diện nay lưu trong GridFS; thư mục này chỉ được migration đọc để chuyển ảnh cũ.
  uploadDir: require('path').resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'),
  sessionSecret: secret || 'dev-only-secret-change-me-dev-only-secret', // chỉ dùng được khi isLocal/test (đã kiểm tra ở trên)
  trustProxy: isProd || process.env.TRUST_PROXY === '1',
  // Tiền tố __Host-: trình duyệt chỉ nhận cookie khi Secure, Path=/ và KHÔNG có Domain → không bị subdomain ghi đè
  sessionCookieName: isProd && isHttps ? '__Host-cnow.sid' : 'cnow.sid',
  paymentMode,
  demo: paymentMode === 'demo', // cổng demo: mọi đơn ghi rõ "DEMO – không phải giao dịch thật"
  usdVnd, // tỉ giá DEMO để hiển thị VND và tính tiền cổng VNPay/MoMo mô phỏng
  paypal: {
    configured: paypalConfigured, // chỉ true khi PAYMENT_MODE=paypal và có khóa API
    mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    currency: 'USD', // PayPal không hỗ trợ VND
  },
};
