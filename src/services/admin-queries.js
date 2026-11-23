// Bộ lọc / sắp xếp cho các danh sách quản trị (dùng chung cho trang danh sách và xuất CSV cùng bộ lọc).
// Mọi tham số query đã qua zod; ở đây chỉ nhận giá trị thuộc whitelist, chuỗi tìm kiếm được escape (services/listing).
const { trusted } = require('mongoose');
const { User, AUDIT_ACTIONS } = require('../models');
const listing = require('./listing');
const orderLabels = require('./order-labels');
const { dateRange, scopedCourses } = require('./reporting');

const ROLE_LABELS = { user: 'Người học', collaborator: 'Cộng tác viên', admin: 'Quản trị viên' };
const NEWEST = { createdAt: -1, _id: -1 };
const OLDEST = { createdAt: 1, _id: 1 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const courseIdsOf = (courses) => courses.map((c) => String(c._id));

/** Phương thức thanh toán để lọc: cổng demo theo từng cổng, PayPal thật, miễn phí */
const METHODS = {
  'demo-paypal': {
    label: 'PayPal (mô phỏng)',
    match: { provider: trusted({ $in: ['demo', 'mock'] }), gateway: trusted({ $in: ['paypal', null] }) },
  },
  'demo-vnpay': { label: 'VNPay (mô phỏng)', match: { provider: 'demo', gateway: 'vnpay' } },
  'demo-momo': { label: 'Ví MoMo (mô phỏng)', match: { provider: 'demo', gateway: 'momo' } },
  paypal: { label: 'PayPal (thật)', match: { provider: 'paypal' } },
  free: { label: 'Miễn phí', match: { provider: 'free' } },
};

/** Người học (bản ghi ghi danh) trong phạm vi khóa học của người xem. */
async function learnersQuery(req) {
  const courses = await scopedCourses(req.user);
  const f = {
    q: listing.one(req.query.q).slice(0, 80),
    course: listing.pick(req.query.course, courseIdsOf(courses)),
    sort: listing.pick(req.query.sort, ['new', 'old'], 'new'),
  };
  const filter = { course: f.course ? f.course : trusted({ $in: courses.map((c) => c._id) }) };
  if (f.q) filter.user = trusted({ $in: await listing.userIdsMatching(f.q) });
  return { f, filter, sort: f.sort === 'old' ? OLDEST : NEWEST, courses };
}

/** Đơn hàng: trạng thái, khóa học, phương thức, khoảng ngày, tìm theo học viên. */
async function ordersQuery(req) {
  const courses = await scopedCourses(req.user);
  const date = (v) => (DATE_RE.test(listing.one(v)) ? listing.one(v) : '');
  const f = {
    q: listing.one(req.query.q).slice(0, 80),
    status: listing.pick(req.query.status, orderLabels.STATUSES),
    course: listing.pick(req.query.course, courseIdsOf(courses)),
    method: listing.pick(req.query.method, Object.keys(METHODS)),
    from: date(req.query.from),
    to: date(req.query.to),
    sort: listing.pick(req.query.sort, ['new', 'old'], 'new'),
  };
  const filter = {};
  if (f.status) filter.status = f.status;
  if (f.course) filter.course = f.course;
  if (f.method) Object.assign(filter, METHODS[f.method].match);
  if (f.q) filter.user = trusted({ $in: await listing.userIdsMatching(f.q) });
  if (f.from || f.to) {
    const [from, to] = dateRange({ from: f.from || '2000-01-01', to: f.to });
    filter.createdAt = trusted({ $gte: from, $lt: to });
  }
  return { f, filter, sort: f.sort === 'old' ? OLDEST : NEWEST, courses };
}

/** Thành viên: tìm tên/email/username, vai trò, trạng thái khóa, dữ liệu mẫu. */
function usersQuery(query) {
  const f = {
    q: listing.one(query.q).slice(0, 80),
    role: listing.pick(query.role, Object.keys(ROLE_LABELS)),
    status: listing.pick(query.status, ['active', 'locked']),
    demo: listing.pick(query.demo, ['real', 'demo']),
    sort: listing.pick(query.sort, ['new', 'old', 'name'], 'new'),
  };
  const filter = {};
  if (f.q) {
    const rx = listing.textRx(f.q);
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }
  if (f.role) filter.role = f.role;
  if (f.status) filter.locked = f.status === 'locked' ? true : trusted({ $ne: true });
  if (f.demo) filter.isDemo = f.demo === 'demo' ? true : trusted({ $ne: true });
  const sort = { new: NEWEST, old: OLDEST, name: { name: 1, _id: 1 } }[f.sort];
  return { f, filter, sort };
}

/** Kiểm duyệt (Hỏi – Đáp, Bình luận): hiện/ẩn, khóa học, tìm theo nội dung / người viết. */
async function moderationQuery(req) {
  const courses = await scopedCourses(req.user);
  const f = {
    show: listing.pick(req.query.show, ['visible', 'hidden']),
    course: listing.pick(req.query.course, courseIdsOf(courses)),
    q: listing.one(req.query.q).slice(0, 80),
  };
  const filter = {};
  if (f.show) filter.hidden = f.show === 'hidden';
  if (f.course) filter.course = f.course;
  if (f.q) {
    const rx = listing.textRx(f.q);
    filter.$or = [{ content: rx }, { user: trusted({ $in: await listing.userIdsMatching(f.q) }) }];
  }
  return { f, filter, courses };
}

/** Nhật ký bảo mật: loại sự kiện, người dùng (actor/target/tên đăng nhập đã nhập), khoảng ngày, IP. */
async function auditQuery(query) {
  const one = listing.one;
  const f = {
    action: one(query.action),
    user: one(query.user).slice(0, 80),
    from: one(query.from),
    to: one(query.to),
    ip: one(query.ip).slice(0, 64),
  };
  const filter = {};
  if (AUDIT_ACTIONS[f.action]) filter.action = f.action;
  else f.action = '';
  const date = (s, end) => {
    if (!DATE_RE.test(s)) return null;
    const d = new Date(`${s}T00:00:00`);
    if (Number.isNaN(+d)) return null;
    if (end) d.setDate(d.getDate() + 1);
    return d;
  };
  const from = date(f.from);
  const to = date(f.to, true);
  if (!from) f.from = '';
  if (!to) f.to = '';
  if (from || to) filter.createdAt = trusted({ ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) });
  if (f.ip) filter.ip = f.ip;
  if (f.user) {
    const rx = listing.textRx(f.user);
    const ids = (
      await User.find({ $or: [{ username: rx }, { email: rx }, { name: rx }] })
        .select('_id')
        .limit(200)
    ).map((u) => u._id);
    filter.$or = [{ actor: trusted({ $in: ids }) }, { target: trusted({ $in: ids }) }, { 'meta.login': rx }];
  }
  return { f, filter };
}

module.exports = { ROLE_LABELS, METHODS, learnersQuery, ordersQuery, usersQuery, moderationQuery, auditQuery };
