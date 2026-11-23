const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');
const { loadUser } = require('./middlewares/auth');
const { csrf, globalLimiter } = require('./middlewares/security');
const compression = require('compression');
const { asset, hashedStatic } = require('./services/assets');
const { PRIVATE } = require('./routes/seo');
const money = require('./services/money');
const orderLabels = require('./services/order-labels');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
app.locals.asset = asset; // có sẵn cả khi lỗi xảy ra trước middleware gán res.locals
app.locals.cspNonce = ''; // dự phòng khi trang lỗi render trước middleware tạo nonce
app.locals.demoMode = config.demo; // dải thông báo "website demo" trên mọi trang (kể cả trang lỗi)
if (config.trustProxy) app.set('trust proxy', 1); // Heroku/Render/Nginx đứng trước

// Nonce CSP ngẫu nhiên cho từng request: mọi thẻ <script> trong view đều mang nonce này
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});
const nonce = (req, res) => `'nonce-${res.locals.cspNonce}'`;
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https://i.ytimg.com'],
        'frame-src': ['https://www.youtube-nocookie.com'],
        'form-action': ["'self'", 'https://www.paypal.com', 'https://www.sandbox.paypal.com'],
        // CSP nghiêm ngặt (CSP3): chỉ script có nonce của request này được chạy, cùng các script do chúng nạp
        // ('strict-dynamic' – vd. app.js nạp YouTube IFrame API). 'self' + 2 đường dẫn YouTube chỉ là dự phòng cho trình duyệt cũ
        // (trình duyệt hỗ trợ 'strict-dynamic' bỏ qua chúng). Không có 'unsafe-inline' / 'unsafe-eval'.
        'script-src': [nonce, "'strict-dynamic'", "'self'", 'https://www.youtube.com/iframe_api', 'https://www.youtube.com/s/player/'],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", nonce],
        'object-src': ["'none'"],
        'base-uri': ["'none'"],
        'frame-ancestors': ["'none'"], // chống clickjacking
        // Chat realtime: Socket.IO dùng WebSocket tới chính website; ghi rõ ws(s):// cho trình duyệt cũ
        'connect-src': ["'self'", config.baseUrl.replace(/^http/, 'ws')],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
    strictTransportSecurity: config.isProd ? { maxAge: 365 * 24 * 3600, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // YouTube nhúng cần biết nguồn, không lộ đường dẫn/tham số
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  }),
);
// Tắt các API trình duyệt website không dùng (camera, micro, vị trí, thanh toán, USB…); toàn màn hình chỉ cho trang + video
app.use((req, res, next) => {
  res.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=(), ' +
      'fullscreen=(self "https://www.youtube-nocookie.com")',
  );
  next();
});
// Log truy cập gọn, không chứa bí mật: production chỉ ghi đường dẫn (bỏ toàn bộ chuỗi truy vấn), không ghi
// cookie/referrer/user-agent; dev bỏ query của URL thanh toán. Không log /healthz (nền tảng gọi liên tục).
morgan.token('safe-url', (req) => (config.isProd || req.originalUrl.startsWith('/pay/') ? req.originalUrl.split('?')[0] : req.originalUrl));
app.use(
  morgan(
    config.isProd
      ? ':remote-addr :method :safe-url :status :res[content-length] - :response-time ms'
      : ':method :safe-url :status :response-time ms - :res[content-length]',
    { skip: (req) => req.path === '/healthz' },
  ),
);
app.use(require('./routes/health')); // GET /healthz – trước phiên và giới hạn tần suất
// Request xử lý quá 25 giây (vd. CSDL treo) → trả 503 thay vì giữ kết nối mãi
app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) res.status(503).type('text/plain').send('Máy chủ đang bận, vui lòng thử lại sau.');
  }, 25 * 1000);
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});
// Bản demo công khai: yêu cầu công cụ tìm kiếm không lập chỉ mục (kèm meta robots + robots.txt "Disallow: /")
if (process.env.DEMO_NOINDEX === 'true') {
  app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
}
// Form khóa học gửi cả cấu trúc chương/bài (JSON) nên cần giới hạn lớn hơn; các route khác giữ 50kb
app.use('/admin/courses', express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(compression()); // nén gzip/brotli phản hồi văn bản (HTML, CSS, JS, JSON)
app.use(hashedStatic); // /css/style.<hash>.css → cache 1 năm (immutable)
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: config.isProd ? '1d' : 0 }));
app.use(require('./routes/seo')); // robots.txt, sitemap.xml (không cần phiên)
// Giới hạn chung theo IP cho các trang động (chống làm ngập phiên/CSDL bằng hàng loạt yêu cầu); file tĩnh không tính
app.use(globalLimiter);

// Dùng chung cho HTTP và Socket.IO (src/realtime.js) để xác thực kết nối chat bằng phiên đăng nhập hiện có
const sessionMiddleware = session({
  name: config.sessionCookieName,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    client: mongoose.connection.getClient(),
    ttl: 7 * 24 * 3600,
    autoRemove: 'interval',
    autoRemoveInterval: 10,
  }),
  // secure khi website chạy HTTPS (không chỉ dựa vào NODE_ENV)
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.isHttps, maxAge: 7 * 24 * 3600 * 1000 },
});
app.use(sessionMiddleware);
app.set('sessionMiddleware', sessionMiddleware);
app.use((req, res, next) => {
  res.locals.me = null;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.path = req.path;
  res.locals.currentUrl = req.originalUrl.slice(0, 300);
  res.locals.demoMode = config.demo;
  res.locals.usd = money.usd;
  res.locals.vnd = (usdAmount) => money.formatVnd(money.toVnd(usdAmount)); // giá USD → "519.740 ₫" (tỉ giá DEMO)
  res.locals.fmtVnd = money.formatVnd; // số VND đã có (vd. order.amountVnd)
  res.locals.orderView = orderLabels; // nhãn trạng thái/cổng, isDemo, billable, refundable
  res.locals.fmtTime = (s) => {
    s = Math.max(0, Math.floor(Number(s) || 0));
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };
  res.locals.baseUrl = config.baseUrl;
  res.locals.asset = asset;
  // SEO: mặc định; từng trang có thể ghi đè description, ogImage… khi render
  res.locals.canonical = config.baseUrl + (req.path === '/' ? '/' : req.path);
  res.locals.noindex = process.env.DEMO_NOINDEX === 'true' || PRIVATE.some((p) => req.path === p || req.path.startsWith(p + '/'));
  res.locals.stars = (n) => {
    const r = Math.round(Number(n) || 0);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };
  next();
});
app.use(loadUser);
app.use(csrf);
app.use(require('./security/rbac').authorize); // phân quyền tập trung theo bảng RULES (docs/SECURITY/rbac.md)

app.use(require('./routes/notifications').unreadCount); // số thông báo chưa đọc cho chuông trên thanh menu
app.use(require('./routes/auth'));
app.use(require('./routes/mfa'));
app.use(require('./routes/admin-pin')); // bước nhập mã quản trị của admin
app.use(require('./routes/notifications'));
app.use(require('./routes/courses'));
app.use(require('./routes/qa'));
app.use(require('./routes/reviews'));
app.use(require('./routes/comments'));
app.use(require('./routes/pages'));
app.use(require('./routes/profile'));
app.use(require('./routes/pay'));
app.use('/admin', require('./routes/admin'));

// Trang 404 thân thiện: gợi ý tìm kiếm và vài khóa học
app.use(async (req, res) => {
  const { Course } = require('./models');
  const suggest = await Course.find({ published: true })
    .sort({ ratingAvg: -1, createdAt: -1 })
    .limit(3)
    .select('title slug')
    .lean()
    .catch(() => []);
  res.status(404).render('error', {
    title: 'Không tìm thấy trang',
    message: 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.',
    notFound: true,
    suggest,
    noindex: true,
  });
});
// Xử lý lỗi tập trung: không bao giờ lộ stack trace / thông điệp lỗi nội bộ ra trình duyệt
const CLIENT_ERRORS = {
  'entity.too.large': [413, 'Dữ liệu gửi lên quá lớn.'],
  'entity.parse.failed': [400, 'Dữ liệu gửi lên không hợp lệ.'],
  'parameters.too.many': [413, 'Biểu mẫu có quá nhiều trường.'],
  'charset.unsupported': [415, 'Bảng mã dữ liệu không được hỗ trợ.'],
};
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const known = CLIENT_ERRORS[err.type] || (err instanceof URIError ? [400, 'Đường dẫn không hợp lệ.'] : null);
  const status = known ? known[0] : 500;
  if (status >= 500) console.error(err);
  if (res.headersSent) return res.end();
  res.status(status);
  // Lỗi xảy ra trước khi có phiên/CSRF (vd. body hỏng) → chưa đủ biến để render layout → trả văn bản thuần
  if (!res.locals.csrfToken) return res.type('text/plain').send(known ? known[1] : 'Đã có lỗi xảy ra.');
  res.render('error', {
    title: status >= 500 ? 'Lỗi hệ thống' : 'Yêu cầu không hợp lệ',
    message: known ? known[1] : 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
  });
});

module.exports = app;
