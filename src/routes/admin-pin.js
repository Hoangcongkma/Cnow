// Bước 2 khi đăng nhập tài khoản admin (chưa bật TOTP): nhập MÃ QUẢN TRỊ. Đúng mã mới cấp phiên đăng nhập đầy đủ.
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { startSession } = require('../middlewares/auth');
const { audit } = require('../services/audit');
const pin = require('../services/admin-pin');

const PENDING_MS = 5 * 60 * 1000; // thời gian cho bước nhập mã sau khi đúng mật khẩu
const GENERIC = 'Mã quản trị không đúng.';
const LOCKED = 'Bạn đã nhập sai mã quản trị quá nhiều lần. Bước xác thực này bị khóa 15 phút.';

const noStore = (res) => res.set('Cache-Control', 'no-store');
const render = (res, status, error) =>
  noStore(res).status(status).render('auth/admin-pin', { title: 'Nhập mã quản trị', error, noindex: true });

const pendingOf = (req) => {
  const p = req.session.pinPending;
  return p && Date.now() < p.exp ? p : null;
};

// Theo IP: tối đa 5 lần sai / 15 phút (lần đúng không bị tính); vượt quá → khóa bước này 15 phút với IP đó
const pinIpLimiter = rateLimit({
  windowMs: pin.WINDOW_MS,
  limit: pin.MAX_FAILS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: async (req, res) => {
    const p = pendingOf(req);
    await audit(req, 'ADMIN_PIN_LOCKED', { actor: null, target: p?.uid, meta: { reason: 'ip' } });
    render(res, 429, LOCKED);
  },
});

router.get('/login/admin-pin', (req, res) => {
  if (!pendingOf(req)) return res.redirect('/login');
  render(res, 200, null);
});

router.post('/login/admin-pin', pinIpLimiter, async (req, res) => {
  const p = pendingOf(req);
  if (!p) {
    delete req.session.pinPending;
    req.session.flash = { type: 'warn', text: 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại.' };
    return res.redirect('/login');
  }
  const user = await User.findById(p.uid);
  if (!user || user.locked || user.role !== 'admin') {
    delete req.session.pinPending;
    return res.redirect('/login');
  }
  // Giữ lượt (nguyên tử) trước khi so sánh: tài khoản đang khóa / đã sai 5 lần → không so sánh nữa
  if (!(await pin.reserveAttempt(user._id))) {
    await audit(req, 'ADMIN_PIN_LOCKED', { actor: null, target: user._id, meta: { reason: 'account' } });
    return render(res, 429, LOCKED);
  }
  const ok = await pin.verifyPin(user._id, req.body.pin);
  if (!ok) {
    await audit(req, 'ADMIN_PIN_FAIL', { actor: null, target: user._id, meta: { login: user.username } });
    if (await pin.afterFailure(user._id)) {
      await audit(req, 'ADMIN_PIN_LOCKED', { actor: null, target: user._id, meta: { reason: 'account' } });
      return render(res, 429, LOCKED);
    }
    return render(res, 401, GENERIC);
  }
  await pin.clearFailures(user._id);
  const returnTo = p.returnTo;
  await startSession(req, user, 'pin');
  await audit(req, 'ADMIN_PIN_OK', { actor: user._id, target: user._id });
  await audit(req, 'login.success', { actor: user._id, target: user._id, meta: { reason: 'admin_pin' } });
  res.redirect(returnTo);
});

/** Gọi từ route đăng nhập khi mật khẩu đúng, tài khoản là admin và chưa bật TOTP. */
async function startPinStep(req, res, user, returnTo) {
  if (!(await pin.hasPin(user._id))) {
    // Chưa đặt mã quản trị → KHÔNG cấp phiên, chỉ hướng dẫn cách đặt mã (phải có quyền truy cập máy chủ/CSDL)
    await audit(req, 'ADMIN_PIN_FAIL', { actor: null, target: user._id, meta: { reason: 'not_set', login: user.username } });
    return noStore(res).status(403).render('auth/admin-pin-missing', { title: 'Chưa đặt mã quản trị', username: user.username });
  }
  await new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
  req.session.pinPending = { uid: user.id, exp: Date.now() + PENDING_MS, returnTo };
  res.redirect('/login/admin-pin');
}

module.exports = router;
module.exports.startPinStep = startPinStep;
