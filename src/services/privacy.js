// Quyền của người dùng với dữ liệu cá nhân: tải toàn bộ dữ liệu (JSON) và tự xóa tài khoản.
// Xóa tài khoản = ẨN DANH HÓA hồ sơ (giữ _id để đơn hàng / thống kê doanh thu không sai lệch) + xóa dữ liệu học tập riêng tư.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const M = require('../models');
const { removeAvatar } = require('./avatar');

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

/**
 * Gom toàn bộ dữ liệu cá nhân của một người dùng thành 1 object (không có bí mật: mật khẩu băm, khóa 2FA, mã quản trị…).
 * @param {import('mongoose').Types.ObjectId} userId
 */
async function exportData(userId) {
  const u = await M.User.findById(userId).lean();
  const byUser = { user: userId };
  const [enrollments, progress, orders, reviews, posts, comments, notes, certificates, notifications, chat, sessions, security] =
    await Promise.all([
      M.Enrollment.find(byUser).populate('course', 'title slug').lean(),
      M.Progress.find(byUser).populate('course', 'title slug').lean(),
      M.Order.find(byUser).populate('course', 'title slug').lean(),
      M.Review.find(byUser).populate('course', 'title slug').lean(),
      M.Post.find(byUser).populate('course', 'title slug').lean(),
      M.CourseComment.find(byUser).populate('course', 'title slug').lean(),
      M.Note.find(byUser).lean(),
      M.Certificate.find(byUser).lean(),
      M.Notification.find(byUser).lean(),
      M.ChatMessage.find(byUser).lean(),
      M.UserSession.find(byUser).lean(), // không có sid (select: false)
      M.AuditLog.find({ $or: [{ actor: userId }, { target: userId }] })
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean(),
    ]);
  const course = (c) => (c ? { title: c.title, slug: c.slug } : null);
  return {
    exportedAt: new Date().toISOString(),
    note: 'Dữ liệu cá nhân của bạn trên Cnow (định dạng JSON). Không bao gồm mật khẩu, khóa xác thực hai lớp và mã quản trị.',
    profile: pick(u, ['username', 'name', 'email', 'role', 'bio', 'locked', 'mfaEnabled', 'createdAt', 'updatedAt', 'passwordChangedAt']),
    wishlist: u.wishlist || [],
    enrollments: enrollments.map((e) => ({ course: course(e.course), enrolledAt: e.createdAt })),
    progress: progress.map((p) => ({
      course: course(p.course),
      completedLessons: p.completedLessons.length,
      quizResults: p.quizResults.map((r) => pick(r, ['correct', 'total', 'pct', 'passed', 'at'])),
      updatedAt: p.updatedAt,
    })),
    orders: orders.map((o) => ({
      course: course(o.course),
      ...pick(o, [
        'amount',
        'currency',
        'amountVnd',
        'provider',
        'gateway',
        'status',
        'couponCode',
        'discount',
        'captureId',
        'createdAt',
        'refundedAt',
      ]),
    })),
    reviews: reviews.map((r) => ({ course: course(r.course), rating: r.rating, content: r.content, updatedAt: r.updatedAt })),
    questionsAndAnswers: posts.map((p) => ({
      course: course(p.course),
      content: p.content,
      isAnswer: Boolean(p.parent),
      createdAt: p.createdAt,
    })),
    comments: comments.map((c) => ({ course: course(c.course), content: c.content, hidden: c.hidden, createdAt: c.createdAt })),
    notes: notes.map((n) => pick(n, ['text', 'seconds', 'createdAt'])),
    certificates: certificates.map((c) => pick(c, ['courseTitle', 'name', 'code', 'issuedAt'])),
    notifications: notifications.map((n) => pick(n, ['type', 'text', 'read', 'createdAt'])),
    chatMessages: chat.map((c) => pick(c, ['text', 'deleted', 'createdAt'])),
    activeSessions: sessions.map((s) => pick(s, ['ip', 'userAgent', 'createdAt', 'lastSeen'])),
    securityLog: security.map((a) => pick(a, ['action', 'ip', 'userAgent', 'createdAt'])),
  };
}

/**
 * Xóa tài khoản: ẩn danh hóa hồ sơ, xóa dữ liệu học tập riêng tư, hủy mọi phiên.
 * Giữ lại (đã ẩn danh): đơn hàng (thống kê doanh thu), câu hỏi/trả lời, bình luận, tin nhắn chat (hiện "Người dùng đã xóa"),
 * nhật ký bảo mật (bằng chứng an ninh). Trả về số bản ghi đã xóa theo loại.
 * @param {import('express').Request} req cần req.sessionStore để hủy phiên
 */
async function deleteAccount(req, userId) {
  const u = await M.User.findById(userId);
  const id = String(u._id);
  await removeAvatar(u.avatar);
  const byUser = { user: u._id };
  const sessions = await M.UserSession.find(byUser).select('+sid');
  for (const s of sessions) await new Promise((r) => req.sessionStore.destroy(s.sid, () => r()));
  const reviewCourses = await M.Review.distinct('course', byUser);
  const removed = {};
  for (const name of ['Enrollment', 'Progress', 'Note', 'Review', 'Certificate', 'Notification', 'UserSession']) {
    removed[name] = (await M[name].deleteMany(byUser)).deletedCount;
  }
  // Tính lại điểm đánh giá các khóa bị ảnh hưởng
  for (const c of reviewCourses) {
    const [agg] = await M.Review.aggregate([
      { $match: { course: c } },
      { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
    ]);
    await M.Course.updateOne({ _id: c }, { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.n : 0 } });
  }
  await M.Order.updateMany(byUser, { $unset: { payerEmail: '' } });
  await M.User.updateOne(
    { _id: u._id },
    {
      $set: {
        name: 'Người dùng đã xóa',
        username: `del_${id}`.slice(0, 30),
        email: `deleted-${id}@deleted.invalid`,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // không ai biết → không đăng nhập được
        locked: true,
        deletedAt: new Date(),
        wishlist: [],
        mfaEnabled: false,
        sessionVersion: (u.sessionVersion || 0) + 1,
      },
      $unset: {
        bio: '',
        avatar: '',
        mfaSecret: '',
        mfaRecovery: '',
        mfaLastStep: '',
        mfaEnabledAt: '',
        adminPinHash: '',
        adminPinSetAt: '',
        knownIpHashes: '',
        passwordChangedAt: '',
      },
    },
  );
  return removed;
}

module.exports = { exportData, deleteAccount };
