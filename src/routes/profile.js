// Hồ sơ cá nhân và đổi mật khẩu
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { requireLogin } = require('../middlewares/auth');
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

router.get('/profile', requireLogin, validate(S.none), (req, res) => render(res, 200));

router.post('/profile', requireLogin, validate(S.profile.update), async (req, res) => {
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

router.post('/profile/password', requireLogin, passwordLimiter, validate(S.profile.password), async (req, res, next) => {
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
  // Cấp phiên mới cho thiết bị hiện tại (chống session fixation) với version mới
  const f2 = req.session.f2; // giữ bước xác thực thứ hai đã qua (admin) sang phiên mới
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.ver = user.sessionVersion;
    if (f2) req.session.f2 = f2;
    req.session.flash = { type: 'success', text: 'Đã đổi mật khẩu. Các phiên đăng nhập trên thiết bị khác đã bị đăng xuất.' };
    res.redirect('/profile');
  });
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
  requireLogin,
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

module.exports = router;
