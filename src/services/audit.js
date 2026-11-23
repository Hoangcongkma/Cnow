// Ghi nhật ký bảo mật. Không bao giờ làm hỏng request chính và không bao giờ ghi bí mật.
const { AuditLog } = require('../models');
const { maskEmail } = require('../utils/mask');

// Chỉ những khóa này được lưu trong meta → mật khẩu, token, số thẻ… không thể lọt vào log dù truyền nhầm
const META_KEYS = [
  'login',
  'reason',
  'from',
  'to',
  'role',
  'orderId',
  'amount',
  'currency',
  'courseId',
  'courseTitle',
  'code',
  'format',
  'rows',
];

function cleanMeta(meta) {
  if (!meta || typeof meta !== 'object') return undefined;
  const out = {};
  for (const k of META_KEYS) {
    if (meta[k] === undefined || meta[k] === null) continue;
    // Email (vd. người dùng đăng nhập bằng email) được che trước khi lưu: c***@gmail.com
    out[k] = typeof meta[k] === 'number' ? meta[k] : maskEmail(String(meta[k]).slice(0, 200));
  }
  return Object.keys(out).length ? out : undefined;
}

/** audit(req, 'login.failure', { actor, target, meta: { login } }) */
async function audit(req, action, { actor, target, meta } = {}) {
  try {
    await AuditLog.create({
      action,
      actor: actor === undefined ? req.user?._id : actor || undefined,
      target: target || undefined,
      ip: String(req.ip || '').slice(0, 64),
      userAgent: String(req.get?.('user-agent') || '').slice(0, 200),
      meta: cleanMeta(meta),
    });
  } catch (e) {
    console.error('[audit] không ghi được nhật ký:', action, e.message);
  }
}

module.exports = { audit, cleanMeta, META_KEYS };
