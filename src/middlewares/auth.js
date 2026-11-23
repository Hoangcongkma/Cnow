const { User } = require('../models');
const { safeRedirect } = require('../utils/security');
const sessions = require('../services/sessions');
const { audit } = require('../services/audit');

/**
 * Nạp người dùng hiện tại từ phiên. Hủy phiên khi: tài khoản bị khóa/xóa, đổi mật khẩu hoặc bị đổi vai trò ở nơi khác
 * (sessionVersion lệch), admin chưa qua bước xác thực thứ hai, hoặc phiên quá hạn (30 phút không hoạt động / 7 ngày).
 */
async function loadUser(req, res, next) {
  res.locals.me = null;
  if (req.session.userId) {
    const user = await User.findById(req.session.userId).select('-passwordHash');
    // Admin bắt buộc đã qua bước xác thực thứ hai (mã quản trị hoặc TOTP) trong phiên này
    const missingSecondFactor = user && user.role === 'admin' && !req.session.f2;
    if (!user || user.locked || missingSecondFactor || (user.sessionVersion || 0) !== (req.session.ver || 0)) {
      sessions.forgetSession(req.sessionID);
      return req.session.destroy(() => res.redirect('/login'));
    }
    const expired = sessions.checkExpiry(req);
    if (expired) {
      await audit(req, 'session.expired', { actor: user._id, target: user._id, meta: { reason: expired } });
      sessions.forgetSession(req.sessionID);
      return req.session.regenerate(() => {
        req.session.flash = { type: 'warn', text: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' };
        req.session.returnTo = safeRedirect(req.originalUrl, '/');
        res.redirect('/login');
      });
    }
    req.user = user;
    res.locals.me = user;
  }
  next();
}

/** Chưa đăng nhập → nhớ trang đang mở (chỉ đường dẫn nội bộ) rồi chuyển tới /login. */
function requireLogin(req, res, next) {
  if (req.user) return next();
  req.session.returnTo = safeRedirect(req.originalUrl, '/');
  res.redirect('/login');
}

const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));

/**
 * Cấp phiên đăng nhập đầy đủ: phiên MỚI (chống session fixation), ghi version + bước xác thực thứ hai đã qua,
 * lưu bản ghi phiên và báo nếu đăng nhập từ IP mới.
 * @param {import('express').Request} req
 * @param {object} user
 * @param {'pin'|'totp'|'recovery'} [f2]
 */
async function startSession(req, user, f2) {
  await regenerate(req);
  req.session.userId = user.id;
  req.session.ver = user.sessionVersion || 0;
  if (f2) req.session.f2 = f2;
  await sessions.onLogin(req, user);
}

/**
 * Đổi id phiên khi người dùng đang đăng nhập (bật 2FA, đổi mật khẩu…): giữ trạng thái đăng nhập, mốc thời gian
 * và bản ghi phiên, chỉ thay id (chống fixation sau khi thay đổi bảo mật).
 */
async function renewSession(req, user) {
  const keep = { f2: req.session.f2, authAt: req.session.authAt, seenAt: req.session.seenAt };
  const oldSid = req.sessionID;
  await regenerate(req);
  Object.assign(req.session, { userId: user.id, ver: user.sessionVersion || 0 });
  for (const [k, v] of Object.entries(keep)) if (v !== undefined) req.session[k] = v;
  await require('../models').UserSession.updateOne({ sid: oldSid }, { $set: { sid: req.sessionID } });
}

module.exports = { loadUser, requireLogin, startSession, renewSession };
