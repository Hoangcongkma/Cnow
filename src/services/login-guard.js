// Khóa đăng nhập LŨY TIẾN theo tài khoản và theo IP, lưu trong MongoDB (không mất khi khởi động lại, dùng được nhiều tiến trình).
// - Tài khoản: từ lần sai thứ 5 → khóa 5, 10, 20, 40, 60 phút (tối đa 60).
// - IP: từ lần sai thứ 10 (gộp mọi tài khoản) → cùng thang thời gian.
// - Bộ đếm tự quên sau 24 giờ không sai thêm (TTL index); đăng nhập đúng xóa bộ đếm của tài khoản.
const mongoose = require('mongoose');

const ACCOUNT_THRESHOLD = 5;
const IP_THRESHOLD = 10;
const BASE_LOCK_MS = 5 * 60 * 1000;
const MAX_LOCK_MS = 60 * 60 * 1000;
const FORGET_MS = 24 * 60 * 60 * 1000;

const schema = new mongoose.Schema(
  {
    _id: { type: String }, // "a:<tên đăng nhập>" | "i:<ip>"
    fails: { type: Number, default: 0 },
    lockedUntil: Date,
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false },
);
const LoginThrottle = mongoose.models.LoginThrottle || mongoose.model('LoginThrottle', schema);

const accountKey = (login) =>
  `a:${String(login || '')
    .trim()
    .toLowerCase()
    .slice(0, 120)}`;
const ipKey = (ip) => `i:${String(ip || '').slice(0, 64)}`;

/** Thời gian khóa sau `fails` lần sai với ngưỡng `threshold` (0 nếu chưa tới ngưỡng). */
function lockMs(fails, threshold) {
  if (fails < threshold) return 0;
  return Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** (fails - threshold));
}

/**
 * Còn bị khóa không? Trả về số mili-giây còn lại (0 = được thử).
 * @param {string} login
 * @param {string} ip
 */
async function lockedFor(login, ip, now = new Date()) {
  const docs = await LoginThrottle.find({ _id: mongoose.trusted({ $in: [accountKey(login), ipKey(ip)] }) }).lean();
  return Math.max(0, ...docs.map((d) => (d.lockedUntil ? +d.lockedUntil - +now : 0)));
}

async function bump(key, threshold, now) {
  const doc = await LoginThrottle.findOneAndUpdate(
    { _id: key },
    { $inc: { fails: 1 }, $set: { expiresAt: new Date(+now + FORGET_MS) } },
    { upsert: true, returnDocument: 'after', lean: true },
  );
  const ms = lockMs(doc.fails, threshold);
  if (ms) await LoginThrottle.updateOne({ _id: key }, { $set: { lockedUntil: new Date(+now + ms) } });
  return ms;
}

/** Ghi 1 lần sai cho cả tài khoản và IP. Trả về thời gian khóa mới (ms, 0 nếu chưa khóa). */
async function recordFailure(login, ip, now = new Date()) {
  const [a, i] = await Promise.all([bump(accountKey(login), ACCOUNT_THRESHOLD, now), bump(ipKey(ip), IP_THRESHOLD, now)]);
  return Math.max(a, i);
}

/** Đăng nhập đúng: xóa bộ đếm của tài khoản (bộ đếm IP tự hết hạn). */
const recordSuccess = (login) => LoginThrottle.deleteOne({ _id: accountKey(login) });

/** Số tài khoản / IP đang bị khóa (cho trang giám sát). */
async function activeLocks(now = new Date()) {
  return LoginThrottle.find({ lockedUntil: mongoose.trusted({ $gt: now }) })
    .sort({ lockedUntil: -1 })
    .limit(100)
    .lean();
}

/** Số phút (làm tròn lên, tối thiểu 1) để hiển thị thời gian còn bị khóa. */
const minutes = (ms) => Math.max(1, Math.ceil(ms / 60000));

module.exports = { lockedFor, recordFailure, recordSuccess, activeLocks, lockMs, minutes };
