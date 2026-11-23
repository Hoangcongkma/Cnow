const { User } = require('../models');

// Nạp người dùng hiện tại từ phiên
async function loadUser(req, res, next) {
  res.locals.me = null;
  if (req.session.userId) {
    const user = await User.findById(req.session.userId).select('-passwordHash');
    // Tài khoản bị khóa, bị xóa, hoặc đã đổi mật khẩu ở phiên khác → hủy phiên này
    // Admin bắt buộc đã qua bước xác thực thứ hai (mã quản trị hoặc TOTP) trong phiên này – vd. vừa được nâng quyền
    // lên admin khi đang đăng nhập → phải đăng nhập lại
    const missingSecondFactor = user && user.role === 'admin' && !req.session.f2;
    if (!user || user.locked || missingSecondFactor || (user.sessionVersion || 0) !== (req.session.ver || 0)) {
      return req.session.destroy(() => res.redirect('/login'));
    }
    req.user = user;
    res.locals.me = user;
  }
  next();
}

function requireLogin(req, res, next) {
  if (req.user) return next();
  req.session.returnTo = req.originalUrl.startsWith('/') && !req.originalUrl.startsWith('//') ? req.originalUrl : '/';
  res.redirect('/login');
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return requireLogin(req, res, next);
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .render('error', { title: 'Không có quyền truy cập', message: 'Tài khoản của bạn không có quyền vào trang này.' });
    }
    next();
  };
}

/**
 * Cấp phiên đăng nhập đầy đủ: phiên MỚI (chống session fixation), ghi version + bước xác thực thứ hai đã qua.
 * f2: 'pin' | 'totp' | 'recovery' | undefined (người dùng thường không bật 2FA).
 */
function startSession(req, user, f2) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.ver = user.sessionVersion || 0;
      if (f2) req.session.f2 = f2;
      resolve();
    });
  });
}

module.exports = { loadUser, requireLogin, requireRole, startSession };
