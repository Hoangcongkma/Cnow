// Số liệu quản trị: khoảng ngày (giờ Việt Nam), phạm vi khóa học theo quyền, dữ liệu biểu đồ tổng quan, dòng xuất CSV.
// Mọi số liệu tính bằng aggregate trong MongoDB (không tải toàn bộ đơn hàng vào bộ nhớ).
const { trusted } = require('mongoose');
const { User, Course, Order, Enrollment, Progress } = require('../models');
const { summarize } = require('./progress');
const orderLabels = require('./order-labels');

const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 24 * 3600 * 1000;
/** Ngày dạng YYYY-MM-DD theo giờ Việt Nam */
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
/** Ngày giờ theo giờ Việt Nam để hiển thị / xuất CSV ("" nếu không có). */
const vnTime = (d) => (d ? new Date(d).toLocaleString('vi-VN', { timeZone: TZ }) : '');
/** Ngày hôm nay (YYYY-MM-DD, giờ Việt Nam) – dùng đặt tên file xuất. */
const stamp = () => ymd(new Date());
const round2 = (n) => Math.round(n * 100) / 100;

/** Khoảng ngày từ query (YYYY-MM-DD, giờ Việt Nam); mặc định 12 tháng gần nhất, tối đa 5 năm. Trả về [from, toExclusive]. */
function dateRange(q) {
  const parse = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? new Date(`${s}T00:00:00+07:00`) : null);
  const now = new Date();
  let to = parse(q.to);
  let from = parse(q.from);
  if (!to || Number.isNaN(+to)) to = parse(ymd(now));
  to = new Date(+to + DAY);
  if (!from || Number.isNaN(+from) || from >= to) {
    from = parse(ymd(now));
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
  }
  if (to - from > 5 * 366 * DAY) from = new Date(+to - 5 * 366 * DAY);
  return [from, to];
}

/** Danh sách tháng YYYY-MM trong khoảng (để biểu đồ có cả tháng doanh thu = 0). */
function monthsBetween(from, to) {
  const out = [];
  const [fy, fm] = ymd(from).split('-').map(Number);
  const [ty, tm] = ymd(new Date(+to - 1))
    .split('-')
    .map(Number);
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, (m = 1)) : m++) out.push(`${y}-${String(m).padStart(2, '0')}`);
  return out;
}

/** id khóa học trong phạm vi quyền: admin = null (tất cả), CTV = khóa do mình tạo. */
async function scopeCourseIds(user) {
  if (user.role === 'admin') return null;
  return (await Course.find({ author: user.id }).select('_id')).map((c) => c._id);
}

/** Khóa học trong phạm vi quyền (cho ô lọc theo khóa học). */
const scopedCourses = (user) =>
  Course.find(user.role === 'admin' ? {} : { author: user.id })
    .select('title')
    .sort({ title: 1 })
    .lean();

function dashboardQueries(ids, from, to) {
  const courseMatch = ids ? { course: trusted({ $in: ids }) } : {};
  const inRange = { createdAt: trusted({ $gte: from, $lt: to }) };
  const paid = { ...courseMatch, ...inRange, provider: trusted({ $ne: 'free' }) };
  const byMonth = {
    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } },
    revenue: { $sum: { $toDouble: '$amount' } },
  };
  return Promise.all([
    Order.aggregate([{ $match: { ...paid, status: 'COMPLETED' } }, { $group: byMonth }]),
    Enrollment.aggregate([
      { $match: { ...courseMatch, ...inRange } },
      { $group: { _id: '$course', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'c' } },
      { $project: { n: 1, title: { $ifNull: [{ $arrayElemAt: ['$c.title', 0] }, '(đã xóa)'] } } },
    ]),
    Order.aggregate([{ $match: paid }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ids ? Enrollment.distinct('user', courseMatch).then((x) => x.length) : User.countDocuments({ role: 'user' }),
    Course.countDocuments(ids ? { _id: trusted({ $in: ids }) } : {}),
    Order.find(courseMatch).sort({ createdAt: -1 }).limit(8).populate('user', 'name').populate('course', 'title'),
  ]);
}

/**
 * Dữ liệu trang tổng quan (CTV chỉ thấy số liệu khóa học của mình): biểu đồ doanh thu theo tháng, ghi danh theo khóa,
 * tỉ lệ thanh toán, đơn gần nhất.
 */
async function dashboardData(user, query) {
  const [from, to] = dateRange(query);
  const ids = await scopeCourseIds(user);
  const [byMonth, byCourse, byStatus, learners, courses, recent] = await dashboardQueries(ids, from, to);
  const months = monthsBetween(from, to);
  const mm = new Map(byMonth.map((x) => [x._id, x]));
  const revenueSeries = months.map((m) => round2(mm.get(m)?.revenue || 0));
  const status = Object.fromEntries(byStatus.map((x) => [x._id, x.n]));
  const ok = status.COMPLETED || 0;
  const fail = (status.FAILED || 0) + (status.CANCELLED || 0);
  const charts = {
    revenue: { type: 'bar', labels: months.map((m) => m.split('-').reverse().join('/')), data: revenueSeries, label: 'Doanh thu (USD)' },
    enroll: { type: 'bar', horizontal: true, labels: byCourse.map((x) => x.title), data: byCourse.map((x) => x.n), label: 'Số ghi danh' },
    status: { type: 'doughnut', labels: ['Thành công', 'Thất bại / hủy', 'Đang chờ'], data: [ok, fail, status.CREATED || 0] },
  };
  return {
    charts,
    recent,
    scoped: Boolean(ids),
    range: { from: ymd(from), to: ymd(new Date(+to - 1)) },
    stats: {
      revenue: revenueSeries.reduce((a, b) => a + b, 0),
      orders: ok,
      learners,
      courses,
      successRate: ok + fail ? Math.round((ok / (ok + fail)) * 100) : null,
    },
  };
}

/** Dòng CSV doanh thu theo khóa học (kèm dòng TỔNG) trong khoảng ngày của query. */
async function revenueReport(user, query) {
  const [from, to] = dateRange(query);
  const ids = await scopeCourseIds(user);
  const courses = await Course.find(ids ? { _id: trusted({ $in: ids }) } : {})
    .select('title price author')
    .populate('author', 'name');
  const cids = courses.map((c) => c._id);
  const range = { course: trusted({ $in: cids }), createdAt: trusted({ $gte: from, $lt: to }) };
  const [rev, enr] = await Promise.all([
    Order.aggregate([
      { $match: { ...range, status: 'COMPLETED', provider: trusted({ $ne: 'free' }) } },
      { $group: { _id: '$course', orders: { $sum: 1 }, revenue: { $sum: { $toDouble: '$amount' } } } },
    ]),
    Enrollment.aggregate([{ $match: range }, { $group: { _id: '$course', n: { $sum: 1 } } }]),
  ]);
  const rm = new Map(rev.map((x) => [String(x._id), x]));
  const em = new Map(enr.map((x) => [String(x._id), x.n]));
  const rows = courses
    .map((c) => [c.title, c.author?.name, c.price, em.get(c.id) || 0, rm.get(c.id)?.orders || 0, round2(rm.get(c.id)?.revenue || 0)])
    .sort((a, b) => b[5] - a[5]);
  const sum = (i) => rows.reduce((t, r) => t + r[i], 0);
  rows.push(['TỔNG', '', '', sum(3), sum(4), round2(sum(5))]);
  return { rows, name: `cnow-doanh-thu-${ymd(from)}-${ymd(new Date(+to - 1))}` };
}

/** Dòng CSV người học (kèm tiến độ) cho các bản ghi ghi danh đã populate user + course. */
async function learnerRows(enrollments) {
  const courseIds = [...new Set(enrollments.map((e) => String(e.course?._id)))].filter((x) => x !== 'undefined');
  const progress = await Progress.find({ course: trusted({ $in: courseIds }) }).lean();
  const pmap = new Map(progress.map((p) => [`${p.user}:${p.course}`, p]));
  return enrollments
    .filter((e) => e.user && e.course)
    .map((e) => {
      const s = summarize(e.course, pmap.get(`${e.user._id}:${e.course._id}`));
      return [e.user.name, e.user.username, e.user.email, e.course.title, vnTime(e.createdAt), s.pct, `${s.completed}/${s.total}`];
    });
}

const ORDER_HEADERS = [
  'Thời gian',
  'Mã đơn',
  'Học viên',
  'Tên đăng nhập',
  'Email',
  'Khóa học',
  'Số tiền',
  'Tiền tệ',
  'Cổng',
  'DEMO',
  'Số tiền VND (demo)',
  'Trạng thái',
  'Mã đơn cổng',
  'Mã giao dịch',
  'Lý do lỗi',
];
/** Dòng CSV đơn hàng (đã populate user + course). */
const orderRow = (o) => [
  vnTime(o.createdAt),
  o.id,
  o.user?.name,
  o.user?.username,
  o.user?.email,
  o.course?.title,
  Number(o.amount),
  o.currency,
  orderLabels.methodLabel(o),
  orderLabels.isDemo(o) ? 'DEMO – không phải giao dịch thật' : '',
  o.amountVnd ?? '',
  o.status,
  o.providerOrderId,
  o.captureId,
  o.failureReason,
];

module.exports = {
  vnTime,
  stamp,
  dateRange,
  scopedCourses,
  dashboardData,
  revenueReport,
  learnerRows,
  ORDER_HEADERS,
  orderRow,
};
