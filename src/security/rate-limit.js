// Giới hạn tần suất theo nhóm route. Bộ đếm lưu trong MongoDB (collection "ratelimits", TTL) → không mất khi khởi động lại
// và dùng chung được khi chạy nhiều tiến trình. Đăng nhập dùng khóa lũy tiến riêng (services/login-guard.js).
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const config = require('../config');

/** Store cho express-rate-limit (v7) dựa trên MongoDB. */
class MongoRateStore {
  constructor(name) {
    this.prefix = `${name}:`;
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  get col() {
    return mongoose.connection.collection('ratelimits');
  }

  async ensureIndex() {
    if (MongoRateStore.indexed) return;
    MongoRateStore.indexed = true;
    await this.col.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
  }

  async increment(key) {
    await this.ensureIndex();
    const now = new Date();
    const fresh = new Date(+now + this.windowMs);
    // Hết cửa sổ (hoặc bản ghi mới) → bắt đầu lại từ 1; còn trong cửa sổ → cộng thêm. Một lệnh nguyên tử.
    const doc = await this.col.findOneAndUpdate(
      { _id: this.prefix + key },
      [
        {
          $set: {
            hits: { $cond: [{ $gt: [{ $ifNull: ['$resetAt', now] }, now] }, { $add: ['$hits', 1] }, 1] },
            resetAt: { $cond: [{ $gt: [{ $ifNull: ['$resetAt', now] }, now] }, '$resetAt', fresh] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' },
    );
    const d = doc?.value ?? doc; // driver v5/v6
    return { totalHits: d.hits, resetTime: d.resetAt };
  }

  async decrement(key) {
    await this.col.updateOne({ _id: this.prefix + key, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await this.col.deleteOne({ _id: this.prefix + key });
  }
}

const byUser = (req) => (req.user ? `u:${req.user._id}` : `ip:${req.ip}`);

/** Trang 429 dùng chung (route-level: đã có phiên/CSRF để render). */
const tooMany = (message) => (req, res) =>
  res
    .status(429)
    .render('error', { title: 'Thao tác quá nhanh', message: message || 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.' });

/**
 * Tạo limiter cho 1 nhóm route.
 * @param {{ name: string, windowMs: number, limit: number, per?: 'ip'|'user', message?: string, handler?: Function,
 *   skipSuccessfulRequests?: boolean, requestWasSuccessful?: Function, keyGenerator?: Function }} o
 */
function limiter(o) {
  return rateLimit({
    windowMs: o.windowMs,
    limit: o.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new MongoRateStore(o.name),
    keyGenerator: o.keyGenerator || (o.per === 'user' ? byUser : (req) => req.ip),
    skipSuccessfulRequests: Boolean(o.skipSuccessfulRequests),
    ...(o.requestWasSuccessful ? { requestWasSuccessful: o.requestWasSuccessful } : {}),
    handler: o.handler || tooMany(o.message),
    validate: { ip: false, trustProxy: false, xForwardedForHeader: false },
  });
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Các nhóm giới hạn (xem docs/SECURITY/threat-model.md, T-16). */
const limits = {
  // Trang động chung theo IP – trước phiên nên trả văn bản thuần
  global: () =>
    rateLimit({
      windowMs: MIN,
      limit: config.globalRateLimit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      store: new MongoRateStore('global'),
      message: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
      validate: { ip: false, trustProxy: false, xForwardedForHeader: false },
    }),
  register: () => limiter({ name: 'register', windowMs: HOUR, limit: 10, message: 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau.' }),
  community: () =>
    limiter({ name: 'community', windowMs: HOUR, limit: 30, per: 'user', message: 'Bạn đăng bài quá nhanh. Vui lòng thử lại sau.' }),
  payment: () =>
    limiter({
      name: 'payment',
      windowMs: 10 * MIN,
      limit: 20,
      per: 'user',
      message: 'Bạn thao tác thanh toán quá nhiều lần. Vui lòng thử lại sau ít phút.',
    }),
  export: () => limiter({ name: 'export', windowMs: HOUR, limit: 20, per: 'user', message: 'Bạn xuất dữ liệu quá nhiều lần trong 1 giờ.' }),
  verify: () =>
    limiter({ name: 'verify', windowMs: 10 * MIN, limit: 60, message: 'Bạn tra cứu chứng nhận quá nhiều lần. Vui lòng thử lại sau.' }),
  avatar: () => limiter({ name: 'avatar', windowMs: HOUR, limit: 20, per: 'user', message: 'Bạn đổi ảnh quá nhiều lần trong 1 giờ.' }),
  mfa: () => limiter({ name: 'mfa', windowMs: 15 * MIN, limit: 30, message: 'Bạn nhập mã quá nhiều lần. Vui lòng thử lại sau.' }),
};

module.exports = { MongoRateStore, limiter, limits };
