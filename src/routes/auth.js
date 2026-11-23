const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { registerLimiter } = require('../middlewares/security');
const guard = require('../services/login-guard');
const { forgetSession } = require('../services/sessions');
const config = require('../config');
const { checkPassword } = require('../services/password');
const { audit } = require('../services/audit');
const { startPending } = require('./mfa');
const { startPinStep } = require('./admin-pin');
const { startSession } = require('../middlewares/auth');
const { safeRedirect } = require('../utils/security');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Băm giả để thời gian phản hồi như nhau dù tài khoản có tồn tại hay không
const DUMMY_HASH = bcrypt.hashSync('cnow-timing-guard', 12);

router.get('/register', validate(S.none), (req, res) => res.render('auth/register', { title: 'Đăng ký', form: {}, errors: [] }));

router.post('/register', registerLimiter, validate(S.auth.register), async (req, res) => {
  const form = {
    name: String(req.body.name || '').trim(),
    username: String(req.body.username || '')
      .trim()
      .toLowerCase(),
    email: String(req.body.email || '')
      .trim()
      .toLowerCase(),
  };
  const password = String(req.body.password || '');
  const errors = [];
  if (form.name.length < 2) errors.push('Họ tên phải có ít nhất 2 ký tự.');
  if (!/^[a-z0-9_.]{3,30}$/.test(form.username)) errors.push('Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch dưới.');
  if (!EMAIL.test(form.email)) errors.push('Email không hợp lệ.');
  errors.push(...checkPassword(password, form));
  if (password !== req.body.confirm) errors.push('Mật khẩu nhập lại không khớp.');
  if (!errors.length && (await User.exists({ $or: [{ username: form.username }, { email: form.email }] }))) {
    errors.push('Tên đăng nhập hoặc email đã được sử dụng.');
  }
  if (errors.length) return res.status(400).render('auth/register', { title: 'Đăng ký', form, errors });

  const user = await User.create({ ...form, passwordHash: await bcrypt.hash(password, 12) });
  await startSession(req, user);
  req.session.flash = { type: 'success', text: `Chào mừng ${user.name} đến với Cnow!` };
  res.redirect('/courses');
});

router.get('/login', validate(S.none), (req, res) => res.render('auth/login', { title: 'Đăng nhập', form: {}, error: null }));

/** Đang bị khóa lũy tiến → 429, báo số phút còn lại, ghi audit. */
async function blocked(req, res, login, ms) {
  await audit(req, 'login.rate_limited', { actor: null, meta: { login: login.slice(0, 120) } });
  res.set('Retry-After', String(Math.ceil(ms / 1000)));
  return res.status(429).render('auth/login', {
    title: 'Đăng nhập',
    form: { login },
    error: `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${guard.minutes(ms)} phút.`,
  });
}

router.post('/login', validate(S.auth.login), async (req, res, next) => {
  const login = String(req.body.login || '')
    .trim()
    .toLowerCase();
  const password = String(req.body.password || '');
  // Khóa lũy tiến theo tài khoản + IP (kiểm tra TRƯỚC khi so mật khẩu)
  const wait = await guard.lockedFor(login, req.ip);
  if (wait) return blocked(req, res, login, wait);
  const user = login ? await User.findOne({ $or: [{ username: login }, { email: login }] }) : null;
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH); // luôn băm → thời gian phản hồi đều
  if (!user || !ok) {
    await audit(req, 'login.failure', {
      actor: null,
      target: user?._id,
      meta: { login: login.slice(0, 120), reason: user ? 'wrong_password' : 'unknown_user' },
    });
    await guard.recordFailure(login, req.ip);
    return res.status(401).render('auth/login', { title: 'Đăng nhập', form: { login }, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }
  await guard.recordSuccess(login);
  if (user.locked) {
    await audit(req, 'login.locked', { actor: null, target: user._id, meta: { login: login.slice(0, 120) } });
    return res
      .status(403)
      .render('auth/login', { title: 'Đăng nhập', form: { login }, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
  }
  const returnTo = safeRedirect(req.session.returnTo, user.role === 'user' ? '/my-courses' : '/admin');
  // Đã bật 2FA (TOTP, mọi vai trò): chưa cấp phiên đăng nhập, chuyển sang bước nhập mã (5 phút, tối đa 5 lần)
  if (user.mfaEnabled) return startPending(req, res, next, user, returnTo);
  // Admin chưa bật TOTP: bắt buộc nhập MÃ QUẢN TRỊ trước khi có phiên đăng nhập
  if (user.role === 'admin') return startPinStep(req, res, user, returnTo);
  // Cấp phiên mới sau khi đăng nhập để chống session fixation
  await startSession(req, user);
  await audit(req, 'login.success', { actor: user._id, target: user._id });
  res.redirect(returnTo);
});

router.post('/logout', validate(S.auth.logout), (req, res) => {
  forgetSession(req.sessionID);
  req.session.destroy(() => {
    res.clearCookie(config.sessionCookieName, { path: '/' });
    res.redirect('/');
  });
});

module.exports = router;
