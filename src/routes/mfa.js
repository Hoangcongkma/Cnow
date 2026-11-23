// Xác thực hai lớp: thiết lập/tắt trong /profile/2fa và bước nhập mã khi đăng nhập (/login/2fa)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { requireLogin } = require('../middlewares/auth');
const { audit } = require('../services/audit');
const mfa = require('../services/mfa');

const PENDING_MS = 5 * 60 * 1000; // thời gian cho bước nhập mã sau khi đúng mật khẩu
const MAX_TRIES = 5;
const SETUP_MS = 15 * 60 * 1000;

const withSecrets = (id) => User.findById(id).select('+mfaSecret +mfaRecovery');
const noStore = (res) => res.set('Cache-Control', 'no-store'); // trang có mã khôi phục / QR không được lưu đệm

// Kiểm tra mã: TOTP 6 số, hoặc mã khôi phục (xxxx-xxxx). Cập nhật user (chưa lưu). Trả về 'totp' | 'recovery' | null
async function checkSecondFactor(user, code) {
  const raw = String(code || '').trim();
  if (/^\d{6}$/.test(raw.replace(/\s+/g, ''))) {
    const r = await mfa.checkTotp(mfa.decrypt(user.mfaSecret), raw, user.mfaLastStep);
    if (r.ok) {
      user.mfaLastStep = r.step;
      return 'totp';
    }
    return null;
  }
  return mfa.useRecoveryCode(user, raw) ? 'recovery' : null;
}

// ---------- Trang thiết lập / quản lý ----------
async function renderPage(req, res, extra = {}) {
  const user = await withSecrets(req.user._id);
  let setup = null;
  if (!user.mfaEnabled) {
    const s = req.session.mfaSetup;
    if (!s || Date.now() - s.at > SETUP_MS) req.session.mfaSetup = { secret: mfa.newSecret(), at: Date.now() };
    const { dataUrl } = await mfa.qrFor(user, req.session.mfaSetup.secret);
    setup = { qr: dataUrl, secret: req.session.mfaSetup.secret.match(/.{1,4}/g).join(' ') };
  }
  noStore(res)
    .status(extra.status || 200)
    .render('user/mfa', {
      title: 'Xác thực hai lớp',
      enabled: user.mfaEnabled,
      left: mfa.recoveryLeft(user),
      setup,
      codes: null,
      error: null,
      isAdmin: user.role === 'admin',
      ...extra,
    });
}

router.get('/profile/2fa', requireLogin, (req, res) => renderPage(req, res));

// Bật 2FA: xác nhận mã đầu tiên từ ứng dụng Authenticator
router.post('/profile/2fa/enable', requireLogin, async (req, res, next) => {
  const s = req.session.mfaSetup;
  const user = await withSecrets(req.user._id);
  if (user.mfaEnabled) return res.redirect('/profile/2fa');
  if (!s || Date.now() - s.at > SETUP_MS)
    return renderPage(req, res, { error: 'Phiên thiết lập đã hết hạn, hãy quét lại mã QR mới.', status: 400 });
  const r = await mfa.checkTotp(s.secret, req.body.code, 0);
  if (!r.ok) return renderPage(req, res, { error: 'Mã không đúng. Kiểm tra giờ trên điện thoại và nhập mã đang hiển thị.', status: 400 });
  const { codes, records } = mfa.newRecoveryCodes();
  Object.assign(user, {
    mfaEnabled: true,
    mfaSecret: mfa.encrypt(s.secret),
    mfaLastStep: r.step,
    mfaRecovery: records,
    mfaEnabledAt: new Date(),
    sessionVersion: (user.sessionVersion || 0) + 1, // đăng xuất các phiên khác (chưa qua 2FA)
  });
  await user.save();
  await audit(req, 'mfa.enable', { target: user._id });
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.ver = user.sessionVersion;
    req.session.f2 = 'totp';
    noStore(res).render('user/mfa', {
      title: 'Xác thực hai lớp',
      enabled: true,
      left: codes.length,
      setup: null,
      codes,
      error: null,
      isAdmin: user.role === 'admin',
      justEnabled: true,
    });
  });
});

// Tạo lại mã khôi phục (cần mã TOTP hiện tại) – mã cũ hết hiệu lực
router.post('/profile/2fa/recovery', requireLogin, async (req, res) => {
  const user = await withSecrets(req.user._id);
  if (!user.mfaEnabled) return res.redirect('/profile/2fa');
  const r = await mfa.checkTotp(mfa.decrypt(user.mfaSecret), req.body.code, user.mfaLastStep);
  if (!r.ok) {
    await audit(req, 'mfa.failure', { target: user._id, meta: { reason: 'regenerate_codes' } });
    return renderPage(req, res, { error: 'Mã xác thực không đúng.', status: 400 });
  }
  const { codes, records } = mfa.newRecoveryCodes();
  Object.assign(user, { mfaRecovery: records, mfaLastStep: r.step });
  await user.save();
  await audit(req, 'mfa.recovery_regenerated', { target: user._id });
  noStore(res).render('user/mfa', {
    title: 'Xác thực hai lớp',
    enabled: true,
    left: codes.length,
    setup: null,
    codes,
    error: null,
    isAdmin: user.role === 'admin',
  });
});

// Tắt 2FA: cần mật khẩu + mã (TOTP hoặc mã khôi phục). TOTP là tùy chọn với mọi vai trò (admin tắt thì quay về dùng mã quản trị).
router.post('/profile/2fa/disable', requireLogin, async (req, res) => {
  const user = await withSecrets(req.user._id).select('+passwordHash');
  if (!user.mfaEnabled) return res.redirect('/profile/2fa');
  const okPw = await bcrypt.compare(String(req.body.password || ''), user.passwordHash);
  const how = okPw ? await checkSecondFactor(user, req.body.code) : null;
  if (!okPw || !how) {
    await audit(req, 'mfa.failure', { target: user._id, meta: { reason: 'disable' } });
    return renderPage(req, res, { error: 'Mật khẩu hoặc mã xác thực không đúng.', status: 400 });
  }
  Object.assign(user, { mfaEnabled: false, mfaSecret: undefined, mfaRecovery: [], mfaLastStep: 0, mfaEnabledAt: undefined });
  await user.save();
  await audit(req, 'mfa.disable', { target: user._id });
  req.session.flash = { type: 'success', text: 'Đã tắt xác thực hai lớp.' };
  res.redirect('/profile/2fa');
});

// ---------- Bước 2 khi đăng nhập ----------
const pendingOf = (req) => {
  const p = req.session.mfaPending;
  return p && Date.now() < p.exp ? p : null;
};
// Chống dò mã trên diện rộng: 30 lần nhập mã / 15 phút / IP (mỗi phiên chờ vẫn chỉ được 5 lần)
const mfaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

router.get('/login/2fa', (req, res) => {
  if (!pendingOf(req)) return res.redirect('/login');
  noStore(res).render('auth/login-2fa', { title: 'Xác thực hai lớp', error: null });
});

router.post('/login/2fa', mfaLimiter, async (req, res, next) => {
  const p = pendingOf(req);
  if (!p) {
    delete req.session.mfaPending;
    req.session.flash = { type: 'warn', text: 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại.' };
    return res.redirect('/login');
  }
  const user = await withSecrets(p.uid);
  if (!user || user.locked || !user.mfaEnabled) {
    delete req.session.mfaPending;
    return res.redirect('/login');
  }
  const how = await checkSecondFactor(user, req.body.code);
  if (!how) {
    p.tries = (p.tries || 0) + 1;
    await audit(req, 'mfa.failure', { actor: null, target: user._id, meta: { reason: 'login', login: user.username } });
    if (p.tries >= MAX_TRIES) {
      delete req.session.mfaPending;
      req.session.flash = { type: 'error', text: 'Nhập sai mã quá 5 lần. Vui lòng đăng nhập lại từ đầu.' };
      return res.redirect('/login');
    }
    return noStore(res)
      .status(401)
      .render('auth/login-2fa', { title: 'Xác thực hai lớp', error: `Mã không đúng. Bạn còn ${MAX_TRIES - p.tries} lần thử.` });
  }
  await user.save(); // lưu bước TOTP đã dùng / mã khôi phục đã dùng
  const returnTo = p.returnTo;
  req.session.regenerate(async (err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.ver = user.sessionVersion || 0;
    req.session.f2 = how; // 'totp' | 'recovery' – thay cho mã quản trị với admin
    if (how === 'recovery') {
      await audit(req, 'mfa.recovery_used', { actor: user._id, target: user._id });
      req.session.flash = {
        type: 'warn',
        text: `Bạn vừa dùng 1 mã khôi phục, còn ${mfa.recoveryLeft(user)} mã. Hãy tạo mã mới nếu sắp hết.`,
      };
    }
    await audit(req, 'login.success', {
      actor: user._id,
      target: user._id,
      meta: { reason: how === 'recovery' ? 'mfa_recovery' : 'mfa_totp' },
    });
    res.redirect(returnTo);
  });
});

/** Gọi từ route đăng nhập khi mật khẩu đúng và người dùng bật 2FA. */
function startPending(req, res, next, user, returnTo) {
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.mfaPending = { uid: user.id, exp: Date.now() + PENDING_MS, tries: 0, returnTo };
    res.redirect('/login/2fa');
  });
}

module.exports = router;
module.exports.startPending = startPending;
