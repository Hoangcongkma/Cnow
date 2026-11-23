// Số liệu giám sát bảo mật trong 24 giờ gần nhất cho trang /admin/security (chỉ admin).
// Mọi số liệu lấy bằng aggregate trên audit log (có index action + createdAt), không tải toàn bộ bản ghi.
const { trusted } = require('mongoose');
const { AuditLog, User } = require('../models');
const { activeLocks } = require('./login-guard');

const FAIL_ACTIONS = ['login.failure', 'ADMIN_PIN_FAIL', 'mfa.failure'];
const COUNT_ACTIONS = [
  'login.success',
  'login.failure',
  'login.rate_limited',
  'login.locked',
  'ADMIN_PIN_FAIL',
  'ADMIN_PIN_LOCKED',
  'mfa.failure',
  'login.new_ip',
  'session.revoke',
  'session.expired',
  'password.change',
  'user.role_change',
  'user.lock',
  'order.refund',
  'export.csv',
  'data.export',
  'account.delete',
];
/** IP đáng ngờ: ≥ 5 lần thất bại hoặc thử ≥ 3 tài khoản khác nhau trong 24 giờ */
const SUSPICIOUS_FAILS = 5;
const SUSPICIOUS_ACCOUNTS = 3;

const failMatch = (since) => ({ $match: { createdAt: { $gte: since }, action: { $in: FAIL_ACTIONS } } });

/** Số lần thất bại theo giờ (giờ Việt Nam). */
const failuresByHour = (since) =>
  AuditLog.aggregate([
    failMatch(since),
    { $group: { _id: { $dateToString: { format: '%H:00', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

/** 20 IP có nhiều lần thất bại nhất, đánh dấu đáng ngờ. */
async function topFailingIps(since) {
  const rows = await AuditLog.aggregate([
    failMatch(since),
    {
      $group: {
        _id: '$ip',
        n: { $sum: 1 },
        logins: { $addToSet: '$meta.login' },
        targets: { $addToSet: '$target' },
        last: { $max: '$createdAt' },
      },
    },
    { $sort: { n: -1 } },
    { $limit: 20 },
  ]);
  return rows.map((x) => {
    const accounts = new Set([...x.logins.filter(Boolean), ...x.targets.filter(Boolean).map(String)]).size;
    return {
      ip: x._id || '(không rõ)',
      fails: x.n,
      accounts,
      last: x.last,
      suspicious: x.n >= SUSPICIOUS_FAILS || accounts >= SUSPICIOUS_ACCOUNTS,
    };
  });
}

/** 10 tên đăng nhập / email bị nhập sai nhiều nhất (email đã được che khi ghi audit). */
async function topTargets(since) {
  const rows = await AuditLog.aggregate([
    { $match: { createdAt: { $gte: since }, action: 'login.failure' } },
    { $group: { _id: '$meta.login', n: { $sum: 1 }, ips: { $addToSet: '$ip' }, last: { $max: '$createdAt' } } },
    { $sort: { n: -1 } },
    { $limit: 10 },
  ]);
  return rows.map((x) => ({ login: x._id || '(trống)', fails: x.n, ips: x.ips.length, last: x.last }));
}

async function currentLocks(now) {
  const locks = await activeLocks(now);
  return locks.map((l) => ({
    kind: l._id.startsWith('a:') ? 'Tài khoản' : 'IP',
    key: l._id.slice(2),
    fails: l.fails,
    until: l.lockedUntil,
  }));
}

const LOCKED = () => ({ locked: true, deletedAt: trusted({ $exists: false }) });

/**
 * Số liệu giám sát 24 giờ gần nhất.
 * @param {Date} [now]
 * @returns {Promise<{ since: Date, counts: object, failures: number, hourly: object[], topIps: object[], targets: object[],
 *   locks: object[], lockedUsers: object[], lockedCount: number }>}
 */
async function securitySummary(now = new Date()) {
  const since = new Date(+now - 24 * 3600 * 1000);
  const [byAction, hourly, topIps, targets, locks, lockedUsers, lockedCount] = await Promise.all([
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since }, action: { $in: COUNT_ACTIONS } } },
      { $group: { _id: '$action', n: { $sum: 1 } } },
    ]),
    failuresByHour(since),
    topFailingIps(since),
    topTargets(since),
    currentLocks(now),
    User.find(LOCKED()).sort({ updatedAt: -1 }).limit(10).select('name username updatedAt isDemo').lean(),
    User.countDocuments(LOCKED()),
  ]);
  const counts = Object.fromEntries(byAction.map((x) => [x._id, x.n]));
  const failures = FAIL_ACTIONS.reduce((s, a) => s + (counts[a] || 0), 0);
  return { since, counts, failures, hourly, topIps, targets, locks, lockedUsers, lockedCount };
}

module.exports = { securitySummary };
