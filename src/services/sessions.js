// Quản lý phiên đăng nhập: thời hạn (không hoạt động 30 phút, tuyệt đối 7 ngày), danh sách phiên, đăng xuất từ xa,
// phát hiện đăng nhập từ IP mới (chỉ lưu HMAC của IP, không lưu IP gốc trong hồ sơ người dùng).
const crypto = require('crypto');
const config = require('../config');
const { User, UserSession } = require('../models');
const { notify } = require('./notify');
const { audit } = require('./audit');

const IDLE_MS = 30 * 60 * 1000;
const ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
const TOUCH_MS = 60 * 1000; // ghi lại "lần cuối hoạt động" tối đa 1 lần/phút (tránh ghi phiên mỗi request)
const KNOWN_IPS = 20;

const ipHash = (ip) => crypto.createHmac('sha256', config.sessionSecret).update(`ip:${ip}`).digest('hex').slice(0, 32);

/**
 * Gọi ngay sau khi cấp phiên đăng nhập mới (req.session đã regenerate): ghi mốc thời gian, lưu bản ghi phiên,
 * báo cho người dùng nếu đăng nhập từ IP chưa từng thấy.
 */
async function onLogin(req, user) {
  const now = Date.now();
  req.session.authAt = now;
  req.session.seenAt = now;
  await UserSession.create({
    user: user._id,
    sid: req.sessionID,
    ip: String(req.ip || '').slice(0, 64),
    userAgent: String(req.get('user-agent') || '').slice(0, 200),
    lastSeen: new Date(now),
    expiresAt: new Date(now + ABSOLUTE_MS),
  });
  const h = ipHash(req.ip);
  const u = await User.findById(user._id).select('+knownIpHashes');
  const known = u?.knownIpHashes || [];
  if (known.length && !known.includes(h)) {
    await notify(user._id, {
      type: 'security',
      text: `Tài khoản của bạn vừa đăng nhập từ một địa chỉ IP mới (${String(req.ip).slice(0, 45)}). Nếu không phải bạn, hãy đổi mật khẩu và đăng xuất các phiên lạ.`,
      link: '/profile/sessions',
    });
    await audit(req, 'login.new_ip', { actor: user._id, target: user._id });
  }
  if (!known.includes(h)) {
    await User.updateOne({ _id: user._id }, { $push: { knownIpHashes: { $each: [h], $slice: -KNOWN_IPS } } });
  }
}

/**
 * Kiểm tra thời hạn phiên đã đăng nhập. Trả về 'idle' | 'absolute' nếu hết hạn, null nếu còn hiệu lực
 * (và cập nhật mốc hoạt động).
 */
function checkExpiry(req, now = Date.now()) {
  const s = req.session;
  if (!s.authAt) s.authAt = now; // phiên tạo trước khi có quy định này: tính từ bây giờ
  if (!s.seenAt) s.seenAt = now;
  if (now - s.authAt > ABSOLUTE_MS) return 'absolute';
  if (now - s.seenAt > IDLE_MS) return 'idle';
  if (now - s.seenAt > TOUCH_MS) {
    s.seenAt = now;
    UserSession.updateOne({ sid: req.sessionID }, { $set: { lastSeen: new Date(now) } }).catch(() => {});
  }
  return null;
}

/** Danh sách phiên còn hoạt động của người dùng (phiên đã bị xóa khỏi store được dọn luôn). */
async function listSessions(req, userId) {
  const rows = await UserSession.find({ user: userId }).select('+sid').sort({ lastSeen: -1 }).limit(50);
  const out = [];
  for (const r of rows) {
    const alive = await new Promise((resolve) =>
      req.sessionStore.get(r.sid, (err, s) => resolve(!err && s && s.userId === String(userId))),
    );
    if (!alive) {
      await UserSession.deleteOne({ _id: r._id });
      continue;
    }
    out.push({
      id: String(r._id),
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      lastSeen: r.lastSeen,
      current: r.sid === req.sessionID,
    });
  }
  return out;
}

const destroySid = (req, sid) => new Promise((resolve) => req.sessionStore.destroy(sid, () => resolve()));

/** Đăng xuất 1 phiên (không phải phiên hiện tại) của chính người dùng. Trả về true nếu có hủy. */
async function revokeSession(req, userId, id) {
  const r = await UserSession.findOne({ _id: id, user: userId }).select('+sid');
  if (!r || r.sid === req.sessionID) return false;
  await destroySid(req, r.sid);
  await UserSession.deleteOne({ _id: r._id });
  await audit(req, 'session.revoke', { target: userId, meta: { reason: 'single' } });
  return true;
}

/** Đăng xuất mọi phiên khác của người dùng (giữ phiên hiện tại). Trả về số phiên đã hủy. */
async function revokeOthers(req, userId) {
  const rows = await UserSession.find({ user: userId }).select('+sid');
  let n = 0;
  for (const r of rows) {
    if (r.sid === req.sessionID) continue;
    await destroySid(req, r.sid);
    await UserSession.deleteOne({ _id: r._id });
    n++;
  }
  if (n) await audit(req, 'session.revoke', { target: userId, meta: { reason: 'others', amount: n } });
  return n;
}

/** Xóa bản ghi phiên khi đăng xuất. */
const forgetSession = (sid) => UserSession.deleteOne({ sid }).catch(() => {});

module.exports = { onLogin, checkExpiry, listSessions, revokeSession, revokeOthers, forgetSession };
