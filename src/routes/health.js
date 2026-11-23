// Health check cho nền tảng triển khai (Render healthCheckPath): 200 khi kết nối được MongoDB, ngược lại 503.
// Không cần phiên, không ghi log truy cập, không lộ thông tin cấu hình.
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const mongoose = require('mongoose');

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

router.get('/healthz', validate(S.none), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('not connected');
    await withTimeout(mongoose.connection.db.admin().ping(), 2000);
    res.json({ status: 'ok', db: 'up' }); // không trả phiên bản / thời gian chạy (giảm thông tin cho kẻ dò quét)
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

module.exports = router;
