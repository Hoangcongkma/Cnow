// Phân quyền tập trung (RBAC): MỘT bảng quyền + MỘT middleware cho mọi route HTTP.
// Mức truy cập:
//   public – ai cũng vào được (kể cả khách)
//   auth   – đã đăng nhập (mọi vai trò)
//   staff  – cộng tác viên hoặc quản trị viên
//   admin  – chỉ quản trị viên
// Kiểm tra theo ĐỐI TƯỢNG (khóa học của CTV nào, đơn hàng của ai…) vẫn nằm trong route/service vì cần dữ liệu cụ thể.
// Tài liệu: docs/SECURITY/rbac.md. Test: test/rbac.test.js gọi mọi route × mọi vai trò và kiểm tra route nào cũng có quy tắc.
const { match } = require('path-to-regexp');
const { safeRedirect } = require('../utils/security');

const LEVELS = {
  public: ['guest', 'user', 'collaborator', 'admin'],
  auth: ['user', 'collaborator', 'admin'],
  staff: ['collaborator', 'admin'],
  admin: ['admin'],
};

/** [phương thức, đường dẫn (cú pháp Express), mức truy cập] */
const RULES = [
  // Công khai
  ['GET', '/', 'public'],
  ['GET', '/courses', 'public'],
  ['GET', '/courses/:slug', 'public'],
  ['GET', '/gioi-thieu', 'public'],
  ['GET', '/chinh-sach-bao-mat', 'public'],
  ['GET', '/verify', 'public'],
  ['GET', '/verify/:code', 'public'],
  ['GET', '/avatars/:file', 'public'],
  ['GET', '/healthz', 'public'],
  ['GET', '/robots.txt', 'public'],
  ['GET', '/sitemap.xml', 'public'],
  // Xác thực (khách dùng được)
  ['GET', '/register', 'public'],
  ['POST', '/register', 'public'],
  ['GET', '/login', 'public'],
  ['POST', '/login', 'public'],
  ['POST', '/logout', 'public'],
  ['GET', '/login/2fa', 'public'],
  ['POST', '/login/2fa', 'public'],
  ['GET', '/login/admin-pin', 'public'],
  ['POST', '/login/admin-pin', 'public'],
  // Người học (mọi tài khoản đã đăng nhập)
  ['GET', '/my-courses', 'auth'],
  ['GET', '/wishlist', 'auth'],
  ['POST', '/wishlist/:courseId', 'auth'],
  ['GET', '/learn/:slug', 'auth'],
  ['POST', '/learn/:slug/complete', 'auth'],
  ['POST', '/learn/:slug/quiz', 'auth'],
  ['POST', '/learn/:slug/notes', 'auth'],
  ['POST', '/learn/:slug/qa', 'auth'],
  ['POST', '/notes/:id', 'auth'],
  ['POST', '/notes/:id/delete', 'auth'],
  ['POST', '/qa/:id/vote', 'auth'],
  ['POST', '/qa/:id/best', 'auth'],
  ['GET', '/courses/:slug/chat', 'auth'],
  ['POST', '/courses/:slug/comments', 'auth'],
  ['POST', '/courses/:slug/review', 'auth'],
  ['POST', '/courses/:slug/certificate', 'auth'],
  ['GET', '/certificate/:id', 'auth'],
  ['GET', '/notifications', 'auth'],
  ['POST', '/notifications/:id/open', 'auth'],
  ['POST', '/notifications/read-all', 'auth'],
  ['GET', '/profile', 'auth'],
  ['POST', '/profile', 'auth'],
  ['POST', '/profile/password', 'auth'],
  ['POST', '/profile/avatar', 'auth'],
  ['GET', '/profile/2fa', 'auth'],
  ['POST', '/profile/2fa/enable', 'auth'],
  ['POST', '/profile/2fa/recovery', 'auth'],
  ['POST', '/profile/2fa/disable', 'auth'],
  ['GET', '/profile/sessions', 'auth'],
  ['POST', '/profile/sessions/others', 'auth'],
  ['POST', '/profile/sessions/:id/revoke', 'auth'],
  ['GET', '/profile/export.json', 'auth'],
  ['GET', '/profile/delete', 'auth'],
  ['POST', '/profile/delete', 'auth'],
  ['POST', '/pay', 'auth'],
  ['GET', '/pay/success', 'auth'],
  ['GET', '/pay/cancel', 'auth'],
  ['GET', '/pay/demo/:ref', 'auth'],
  ['GET', '/pay/demo/:ref/:gw', 'auth'],
  ['POST', '/pay/demo/:ref/:gw', 'auth'],
  ['GET', '/orders', 'auth'],
  ['GET', '/orders/:id/invoice.pdf', 'auth'],
  // Cộng tác viên + quản trị viên
  ['GET', '/admin', 'staff'],
  ['GET', '/admin/courses', 'staff'],
  ['GET', '/admin/courses/new', 'staff'],
  ['POST', '/admin/courses', 'staff'],
  ['GET', '/admin/courses/:id/edit', 'staff'],
  ['POST', '/admin/courses/:id', 'staff'],
  ['GET', '/admin/courses/:id/lessons/:lessonId', 'staff'],
  ['POST', '/admin/courses/:id/lessons/:lessonId', 'staff'],
  ['GET', '/admin/learners', 'staff'],
  ['GET', '/admin/export/learners.csv', 'staff'],
  ['GET', '/admin/export/revenue.csv', 'staff'],
  // Chỉ quản trị viên
  ['POST', '/admin/courses/:id/approve', 'admin'],
  ['POST', '/admin/courses/:id/reject', 'admin'],
  ['POST', '/admin/courses/:id/delete', 'admin'],
  ['GET', '/admin/orders', 'admin'],
  ['POST', '/admin/orders/:id/refund', 'admin'],
  ['GET', '/admin/export/orders.csv', 'admin'],
  ['GET', '/admin/users', 'admin'],
  ['POST', '/admin/users/:id', 'admin'],
  ['GET', '/admin/export/users.csv', 'admin'],
  ['GET', '/admin/coupons', 'admin'],
  ['POST', '/admin/coupons', 'admin'],
  ['POST', '/admin/coupons/:id', 'admin'],
  ['POST', '/admin/coupons/:id/delete', 'admin'],
  ['GET', '/admin/audit', 'admin'],
  ['GET', '/admin/security', 'admin'],
  ['GET', '/admin/qa', 'admin'],
  ['POST', '/admin/qa/:id', 'admin'],
  ['GET', '/admin/comments', 'admin'],
  ['POST', '/admin/comments/:id', 'admin'],
];

const compiled = RULES.map(([method, path, level]) => ({ method, path, level, test: match(path, { decode: false }) }));

/** Quy tắc khớp với request (HEAD dùng quy tắc của GET). */
function ruleFor(method, path) {
  const m = method === 'HEAD' ? 'GET' : method;
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path; // Express mặc định bỏ qua "/" cuối
  return compiled.find((r) => r.method === m && r.test(p)) || null;
}

/** Vai trò của request hiện tại: guest | user | collaborator | admin */
const roleOf = (req) => (req.user ? req.user.role : 'guest');

/**
 * Middleware phân quyền duy nhất. Không có quy tắc → cho qua để trả 404 (test đảm bảo mọi route đều có quy tắc).
 * Khách vào trang cần đăng nhập → /login (nhớ trang đang mở); sai vai trò → 403.
 */
function authorize(req, res, next) {
  const rule = ruleFor(req.method, req.path);
  if (!rule || LEVELS[rule.level].includes(roleOf(req))) return next();
  if (!req.user) {
    req.session.returnTo = safeRedirect(req.originalUrl, '/');
    return res.redirect('/login');
  }
  res.set('X-Authz', 'denied'); // giúp test phân biệt 403 do bảng quyền với 403 khác (CSRF…)
  return res.status(403).render('error', { title: 'Không có quyền truy cập', message: 'Tài khoản của bạn không có quyền vào trang này.' });
}

module.exports = { RULES, LEVELS, ruleFor, roleOf, authorize };
