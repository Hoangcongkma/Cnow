// Hồ sơ cá nhân và đổi mật khẩu
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { trusted } = require('mongoose');
const { User, UserSession } = require('../models');
const { renewSession } = require('../middlewares/auth');
const sessions = require('../services/sessions');
const privacy = require('../services/privacy');
const { checkPassword } = require('../services/password');
const multer = require('multer');
const { audit } = require('../services/audit');
const { verifyCsrf } = require('../middlewares/security');
const { saveAvatar, removeAvatar, findAvatar, openAvatar, MAX_BYTES } = require('../services/avatar');

// Chống dò mật khẩu cũ: 5 lần sai / 15 phút cho mỗi tài khoản
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  requestWasSuccessful: (req, res) => !res.locals.wrongPassword, // chỉ đếm lần nhập SAI mật khẩu hiện tại
  keyGenerator: (req) => `pw:${req.session.userId || 'anon'}`,
  handler: (req, res) => {
    req.session.flash = { type: 'error', text: 'Bạn nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.' };
    res.redirect('/profile#password');
  },
});

const render = (res, status, extra = {}) =>
  res.status(status).render('user/profile', { title: 'Hồ sơ của tôi', form: null, errors: [], pwErrors: [], ...extra });

router.get('/profile', validate(S.none), (req, res) => render(res, 200));

router.post('/profile', validate(S.profile.update), async (req, res) => {
  const form = {
    name: String(req.body.name || '')
      .trim()
      .slice(0, 80),
    bio: String(req.body.bio || '')
      .trim()
      .replace(/\r\n/g, '\n')
      .slice(0, 500),
  };
  if (form.name.length < 2) return render(res, 400, { form, errors: ['Họ tên phải có ít nhất 2 ký tự.'] });
  await User.updateOne({ _id: req.user._id }, { $set: form });
  req.session.flash = { type: 'success', text: 'Đã cập nhật hồ sơ.' };
  res.redirect('/profile');
});

router.post('/profile/password', passwordLimiter, validate(S.profile.password), async (req, res) => {
  const user = await User.findById(req.user._id); // cần passwordHash (loadUser không nạp trường này)
  const current = String(req.body.current || '');
  const password = String(req.body.password || '');
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    res.locals.wrongPassword = true; // đếm là lần sai cho rate limit
    await audit(req, 'password.change_failed', { target: user._id, meta: { reason: 'wrong_current_password' } });
    return render(res, 400, { pwErrors: ['Mật khẩu hiện tại không đúng.'] });
  }
  const pwErrors = checkPassword(password, user);
  if (password !== String(req.body.confirm || '')) pwErrors.push('Mật khẩu nhập lại không khớp.');
  if (!pwErrors.length && (await bcrypt.compare(password, user.passwordHash))) pwErrors.push('Mật khẩu mới phải khác mật khẩu hiện tại.');
  if (pwErrors.length) return render(res, 422, { pwErrors });

  user.passwordHash = await bcrypt.hash(password, 12);
  user.sessionVersion = (user.sessionVersion || 0) + 1; // mọi phiên khác mất hiệu lực
  user.passwordChangedAt = new Date();
  await user.save();
  await audit(req, 'password.change', { target: user._id });
  // Cấp id phiên mới cho thiết bị hiện tại (chống session fixation) với version mới; các phiên khác đã mất hiệu lực
  await renewSession(req, user);
  await UserSession.deleteMany({ user: user._id, sid: trusted({ $ne: req.sessionID }) });
  req.session.flash = { type: 'success', text: 'Đã đổi mật khẩu. Các phiên đăng nhập trên thiết bị khác đã bị đăng xuất.' };
  res.redirect('/profile');
});

// ---------- Ảnh đại diện ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5, fieldSize: 1024 } }).single(
  'avatar',
);
const avatarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `av:${req.session.userId || 'anon'}`,
});

router.post(
  '/profile/avatar',
  avatarLimiter,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        // CSRF chưa kiểm tra được khi multer lỗi → không làm gì, chỉ báo lỗi
        req.session.flash = { type: 'error', text: err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 2MB.' : 'Không tải được ảnh lên.' };
        return res.redirect('/profile');
      }
      next();
    });
  },
  verifyCsrf,
  validate(S.profile.avatar),
  async (req, res) => {
    if (req.body.remove === '1') {
      await removeAvatar(req.user.avatar);
      await User.updateOne({ _id: req.user._id }, { $unset: { avatar: '' } });
      req.session.flash = { type: 'success', text: 'Đã xóa ảnh đại diện.' };
      return res.redirect('/profile');
    }
    try {
      const name = await saveAvatar(req.file?.buffer, req.user._id);
      await User.updateOne({ _id: req.user._id }, { $set: { avatar: name } });
      await removeAvatar(req.user.avatar);
      req.session.flash = { type: 'success', text: 'Đã cập nhật ảnh đại diện.' };
    } catch (e) {
      if (!e.userMessage) throw e;
      req.session.flash = { type: 'error', text: e.userMessage };
    }
    res.redirect('/profile');
  },
);

// Phục vụ ảnh từ GridFS: chỉ tên file đúng định dạng ngẫu nhiên <32 hex>.webp (không có đường dẫn nào để traversal)
router.get('/avatars/:file', validate(S.profile.avatarFile), async (req, res) => {
  const file = await findAvatar(req.params.file);
  if (!file) return res.status(404).end();
  res.set({
    'Cache-Control': 'public, max-age=31536000, immutable', // tên file đổi mỗi lần upload
    'Content-Type': 'image/webp',
    'Content-Length': String(file.length),
    'Content-Disposition': 'inline',
  });
  openAvatar(file)
    .once('error', () => (res.headersSent ? res.destroy() : res.status(404).end()))
    .pipe(res);
});

// ---------- Phiên đăng nhập: xem các thiết bị đang đăng nhập, đăng xuất từ xa ----------
router.get('/profile/sessions', validate(S.none), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('user/sessions', { title: 'Phiên đăng nhập', list: await sessions.listSessions(req, req.user._id) });
});

router.post('/profile/sessions/others', validate(S.profile.revokeOthers), async (req, res) => {
  const n = await sessions.revokeOthers(req, req.user._id);
  req.session.flash = { type: 'success', text: n ? `Đã đăng xuất ${n} phiên khác.` : 'Không có phiên nào khác.' };
  res.redirect('/profile/sessions');
});

router.post('/profile/sessions/:id/revoke', validate(S.profile.revoke), async (req, res) => {
  const ok = await sessions.revokeSession(req, req.user._id, req.params.id);
  req.session.flash = ok
    ? { type: 'success', text: 'Đã đăng xuất phiên đó.' }
    : { type: 'warn', text: 'Không tìm thấy phiên (hoặc đó là phiên hiện tại).' };
  res.redirect('/profile/sessions');
});

// ---------- Quyền riêng tư: tải dữ liệu cá nhân, tự xóa tài khoản ----------
router.get('/profile/export.json', validate(S.none), async (req, res) => {
  const data = await privacy.exportData(req.user._id);
  await audit(req, 'data.export', { target: req.user._id, meta: { format: 'json' } });
  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="cnow-du-lieu-${req.user.username}.json"`,
    'Cache-Control': 'no-store',
  });
  res.send(JSON.stringify(data, null, 2));
});

const CONFIRM_TEXT = 'XÓA TÀI KHOẢN';
const deletePage = (res, status, error = null) =>
  res
    .status(status)
    .set('Cache-Control', 'no-store')
    .render('user/delete-account', { title: 'Xóa tài khoản', error, confirmText: CONFIRM_TEXT });

router.get('/profile/delete', validate(S.none), (req, res) => deletePage(res, 200));

router.post('/profile/delete', passwordLimiter, validate(S.profile.deleteAccount), async (req, res) => {
  if (req.user.role === 'admin')
    return deletePage(res, 403, 'Tài khoản quản trị không tự xóa được – hãy nhờ quản trị viên khác hạ quyền trước.');
  const user = await User.findById(req.user._id);
  const okPw = await bcrypt.compare(String(req.body.password || ''), user.passwordHash);
  if (!okPw) {
    res.locals.wrongPassword = true; // tính vào giới hạn thử mật khẩu
    await audit(req, 'password.change_failed', { target: user._id, meta: { reason: 'delete_account_wrong_password' } });
    return deletePage(res, 400, 'Mật khẩu không đúng.');
  }
  if (String(req.body.confirm || '').trim() !== CONFIRM_TEXT) return deletePage(res, 400, `Hãy gõ đúng "${CONFIRM_TEXT}" để xác nhận.`);
  await audit(req, 'account.delete', { actor: user._id, target: user._id });
  await privacy.deleteAccount(req, user._id);
  req.session.regenerate(() => {
    req.session.flash = { type: 'success', text: 'Tài khoản của bạn đã được xóa. Cảm ơn bạn đã học cùng Cnow.' };
    res.redirect('/');
  });
});

module.exports = router;
