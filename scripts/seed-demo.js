// Dữ liệu demo: học viên, đơn hàng, tiến độ, hỏi – đáp, bình luận, đánh giá, chat… để trình diễn trang quản trị.
//   npm run seed:demo                     (mặc định --seed=2026 --users=500)
//   npm run seed:demo -- --seed=7 --users=200
//   npm run unseed:demo                   (xóa SẠCH mọi bản ghi isDemo)
// An toàn:
//   - Mọi bản ghi tạo ra có isDemo: true; người dùng demo có email @demo.cnow.local, nội dung hiển thị nhãn "Dữ liệu mẫu".
//   - Chạy lại không nhân đôi (xóa demo cũ rồi tạo mới); cùng --seed → cùng bộ dữ liệu (ngày tính lùi từ hôm nay).
//   - Từ chối chạy khi NODE_ENV=production, trừ khi có --allow-production.
//   - Mật khẩu: 1 mật khẩu ngẫu nhiên dùng chung, chỉ băm 1 lần, KHÔNG in ra (không ai đăng nhập bằng tài khoản demo).
// Nội dung cộng đồng (câu hỏi, trả lời, bình luận, đánh giá, chat) viết sẵn theo từng bài trong data/demo/<slug>.json.
const { trusted } = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const M = require('../src/models');
const { priceWith } = require('../src/services/coupon');
const { toVnd } = require('../src/services/money');
const { listLessonFiles } = require('../src/services/content');

const DEMO_DOMAIN = 'demo.cnow.local';
const BATCH = 500;
const DAY = 24 * 3600 * 1000;
const DATA_DIR = path.join(__dirname, '..', 'data', 'demo');

// Các model có bản ghi demo (thứ tự xóa không quan trọng: mọi bản ghi demo đều có cờ isDemo)
const DEMO_MODELS = [
  'User',
  'Order',
  'Coupon',
  'Enrollment',
  'Progress',
  'Review',
  'Certificate',
  'Post',
  'CourseComment',
  'Notification',
  'ChatMessage',
  'AuditLog',
];

// ---------- Số ngẫu nhiên có seed (mulberry32) ----------
function rngFrom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted(pairs) {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let x = next() * total;
      for (const [v, w] of pairs) if ((x -= w) < 0) return v;
      return pairs[pairs.length - 1][0];
    },
    shuffle(arr) {
      const a2 = [...arr];
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    hex: (n) => Array.from({ length: n }, () => '0123456789ABCDEF'[Math.floor(next() * 16)]).join(''),
    objectId: () => new mongoose.Types.ObjectId(Array.from({ length: 24 }, () => '0123456789abcdef'[Math.floor(next() * 16)]).join('')),
  };
  return r;
}

// ---------- Tên tiếng Việt hư cấu (ghép ngẫu nhiên họ + đệm + tên phổ biến ở cả 3 miền) ----------
const HO = [
  ['Nguyễn', 30],
  ['Trần', 11],
  ['Lê', 9],
  ['Phạm', 7],
  ['Hoàng', 4],
  ['Huỳnh', 4],
  ['Phan', 4],
  ['Vũ', 3],
  ['Võ', 4],
  ['Đặng', 3],
  ['Bùi', 3],
  ['Đỗ', 3],
  ['Hồ', 2],
  ['Ngô', 2],
  ['Dương', 2],
  ['Lý', 1],
  ['Đinh', 1],
  ['Trịnh', 1],
  ['Lâm', 1],
  ['Mai', 1],
  ['Tô', 1],
  ['Châu', 1],
  ['Lương', 1],
  ['Tạ', 1],
  ['Kiều', 1],
];
const DEM = {
  m: [
    'Văn',
    'Hữu',
    'Đức',
    'Minh',
    'Quốc',
    'Thành',
    'Gia',
    'Công',
    'Tuấn',
    'Quang',
    'Xuân',
    'Bảo',
    'Anh',
    'Trọng',
    'Thanh',
    'Hoàng',
    'Nhật',
    'Đình',
  ],
  f: [
    'Thị',
    'Ngọc',
    'Thu',
    'Thanh',
    'Hồng',
    'Kim',
    'Mỹ',
    'Bảo',
    'Khánh',
    'Phương',
    'Diệu',
    'Minh',
    'Hoài',
    'Quỳnh',
    'Thùy',
    'Tường',
    'Ngọc Bảo',
    'Thảo',
  ],
};
const TEN = {
  m: [
    'An',
    'Bình',
    'Cường',
    'Dũng',
    'Đạt',
    'Duy',
    'Hải',
    'Hiếu',
    'Hòa',
    'Hùng',
    'Huy',
    'Khang',
    'Khoa',
    'Kiên',
    'Lâm',
    'Long',
    'Lộc',
    'Nam',
    'Nghĩa',
    'Nhân',
    'Phát',
    'Phong',
    'Phúc',
    'Quân',
    'Sơn',
    'Tài',
    'Tâm',
    'Thắng',
    'Thịnh',
    'Toàn',
    'Trí',
    'Trung',
    'Tùng',
    'Việt',
    'Vinh',
    'Vũ',
    'Hậu',
    'Lực',
    'Thuận',
    'Tín',
    'Khải',
    'Đông',
    'Tiến',
    'Quý',
    'Hưng',
    'Trường',
    'Định',
    'Thái',
    'Nhật',
    'Khôi',
  ],
  f: [
    'Anh',
    'Châu',
    'Chi',
    'Dung',
    'Duyên',
    'Giang',
    'Hà',
    'Hạnh',
    'Hằng',
    'Hiền',
    'Hoa',
    'Hương',
    'Huyền',
    'Lan',
    'Linh',
    'Loan',
    'Ly',
    'Mai',
    'My',
    'Nga',
    'Ngân',
    'Nhi',
    'Nhung',
    'Oanh',
    'Phương',
    'Quyên',
    'Quỳnh',
    'Thảo',
    'Thơ',
    'Thủy',
    'Trang',
    'Trâm',
    'Tuyết',
    'Uyên',
    'Vân',
    'Vy',
    'Xuân',
    'Yến',
    'Ánh',
    'Diễm',
    'Hân',
    'Ngọc',
    'Thư',
    'Tiên',
    'Như',
    'Lam',
    'Khuê',
    'Hồng',
    'Đào',
    'Liên',
  ],
};
const unaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function makePerson(rng, used) {
  const sex = rng.chance(0.52) ? 'm' : 'f';
  for (;;) {
    const ho = rng.weighted(HO);
    const dem = rng.pick(DEM[sex]);
    const ten = rng.pick(TEN[sex]);
    const name = `${ho} ${dem} ${ten}`;
    // username: chữ thường không dấu + số, ví dụ "thaonguyen2741"
    const base = unaccent(ten + ho).replace(/[^a-z]/g, '');
    const username = `${base}${rng.int(10, 9999)}`.slice(0, 30);
    if (used.has(username)) continue;
    used.add(username);
    return { name, username, email: `${username}@${DEMO_DOMAIN}` };
  }
}

// ---------- Thời gian: 12 tháng gần nhất, xu hướng tăng; tháng 9 (nhập học) và tháng 12 (cuối năm) cao hơn ----------
function monthWindows(now) {
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = i === 0 ? now : new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const m = start.getMonth() + 1;
    const bump = m === 9 ? 1.8 : m === 12 ? 1.6 : 1;
    // Đăng ký tăng nhẹ theo thời gian; đơn hàng còn cộng thêm mùa cao điểm (tháng 9, tháng 12)
    const regWeight = (1 + (11 - i) * 0.07) * (m === 9 ? 1.4 : m === 12 ? 1.3 : 1);
    const weight = (1 + (11 - i) * 0.05) * bump;
    out.push({ start, end, weight, regWeight, key: `${start.getFullYear()}-${String(m).padStart(2, '0')}` });
  }
  return out;
}
/** Thời điểm ngẫu nhiên ≥ after, chọn tháng theo trọng số (chỉ các tháng còn hợp lệ). */
function randomDate(rng, months, after = null, now = new Date(), key = 'weight') {
  const ok = months.filter((m) => !after || m.end > after);
  if (!ok.length) return new Date(Math.min(+now, +after + DAY));
  const m = rng.weighted(ok.map((x) => [x, x[key]]));
  const lo = Math.max(+m.start, after ? +after + 60 * 1000 : 0);
  return new Date(lo + rng.next() * Math.max(60 * 1000, +m.end - lo));
}
const later = (rng, d, minMs, maxMs, now) => new Date(Math.min(+now - 60 * 1000, +d + minMs + rng.next() * (maxMs - minMs)));

// ---------- Ghi hàng loạt: dựng document qua Model (default + kiểm tra schema), giữ nguyên createdAt, insert theo lô ----------
async function insertAll(Model, docs) {
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH).map((d) => {
      const doc = new Model({ ...d, isDemo: true });
      const err = doc.validateSync();
      if (err) throw new Error(`${Model.modelName}: ${err.message}`);
      return doc.toObject({ depopulate: true, virtuals: false });
    });
    if (batch.length) await Model.collection.insertMany(batch, { ordered: false });
  }
  return docs.length;
}

function loadTexts() {
  const out = {};
  if (!fs.existsSync(DATA_DIR)) return out;
  for (const f of fs.readdirSync(DATA_DIR).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    out[d.slug] = d;
  }
  return out;
}

/** Xóa sạch mọi bản ghi demo; tính lại điểm đánh giá khóa học. Trả về số bản ghi đã xóa theo model. */
async function unseedDemo() {
  const counts = {};
  for (const name of DEMO_MODELS) {
    // Nhật ký bảo mật chặn xóa qua Mongoose (chỉ ghi thêm) → xóa bản ghi DEMO bằng driver, có chủ đích
    const target = name === 'AuditLog' ? M.AuditLog.collection : M[name];
    counts[name] = (await target.deleteMany({ isDemo: true })).deletedCount;
  }
  await refreshRatings();
  return counts;
}

async function refreshRatings() {
  const agg = await M.Review.aggregate([{ $group: { _id: '$course', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  const map = new Map(agg.map((x) => [String(x._id), x]));
  for (const c of await M.Course.find().select('_id')) {
    const x = map.get(String(c._id));
    await M.Course.updateOne({ _id: c._id }, { $set: { ratingAvg: x ? Math.round(x.avg * 10) / 10 : 0, ratingCount: x ? x.n : 0 } });
  }
}

// ===== Các bước tạo dữ liệu demo. Mọi bước dùng chung trạng thái `x` và gọi rng theo đúng một thứ tự cố định
// (cùng seed → cùng dữ liệu), nên KHÔNG đổi thứ tự các bước hay thứ tự lời gọi rng bên trong. =====

/** Học viên (~5% bị khóa) và cộng tác viên demo; mật khẩu băm dùng chung, không in ra. */
async function makeUsers(x) {
  const { rng, months, now } = x;
  const usedNames = new Set((await M.User.find().select('username').lean()).map((u) => u.username));
  x.learners = [];
  for (let i = 0; i < x.nUsers; i++) {
    const p = makePerson(rng, usedNames);
    x.learners.push({
      _id: rng.objectId(),
      ...p,
      role: 'user',
      passwordHash: x.passwordHash,
      createdAt: randomDate(rng, months, null, now, 'regWeight'),
    });
  }
  x.learners.sort((a, b) => a.createdAt - b.createdAt);
  for (const u of x.learners) {
    u.updatedAt = u.createdAt;
    u.locked = rng.chance(0.05); // xử lý vi phạm
  }
  x.collabs = [];
  for (let i = 0; i < x.nCollab; i++) {
    const p = makePerson(rng, usedNames);
    const createdAt = new Date(+months[0].start + rng.next() * 20 * DAY);
    x.collabs.push({
      _id: rng.objectId(),
      ...p,
      username: `ctv.${p.username}`.slice(0, 30),
      role: 'collaborator',
      passwordHash: x.passwordHash,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

const COUPON_DEFS = [
  { code: 'CHAOBAN10', type: 'percent', value: 10, note: 'Chào bạn mới (demo)' },
  { code: 'NHAPHOC20', type: 'percent', value: 20, note: 'Mùa nhập học (demo)', months: [8, 9] },
  { code: 'CUOINAM15', type: 'percent', value: 15, note: 'Cuối năm (demo)', months: [12] },
  { code: 'GIAM5USD', type: 'amount', value: 5, note: 'Giảm 5 USD (demo)' },
];

/** Mã giảm giá demo (bỏ qua mã trùng tên mã thật). */
async function makeCoupons(x) {
  const taken = new Set((await M.Coupon.find({ code: trusted({ $in: COUPON_DEFS.map((c) => c.code) }) }).lean()).map((c) => c.code));
  x.coupons = COUPON_DEFS.filter((c) => !taken.has(c.code)).map((c) => ({
    _id: x.rng.objectId(),
    ...c,
    active: true,
    usedCount: 0,
    createdBy: x.admin?._id,
    createdAt: x.months[0].start,
  }));
}

const gateway = (rng) =>
  rng.weighted([
    ['paypal', 40],
    ['vnpay', 35],
    ['momo', 25],
  ]);

/** Hàm tạo 1 đơn trả tiền (có thể kèm mã giảm giá đúng mùa, mỗi người dùng một mã tối đa 1 lần). */
function orderFactory(x) {
  const { rng } = x;
  const usedCoupons = new Map(); // user → Set(mã đã dùng thành công)
  const couponFor = (date, usedByUser) => {
    const m = date.getMonth() + 1;
    const ok = x.coupons.filter((c) => !usedByUser.has(c.code) && (!c.months || c.months.includes(m)));
    return ok.length ? rng.pick(ok) : null;
  };
  return function paidOrder(u, course, at, status, extra = {}) {
    const used = usedCoupons.get(String(u._id)) || new Set();
    const c = rng.chance(0.15) ? couponFor(at, used) : null;
    const price = priceWith(course, c);
    const o = {
      _id: rng.objectId(),
      user: u._id,
      course: course._id,
      amount: price.final,
      amountVnd: toVnd(price.final),
      currency: 'USD',
      provider: 'demo',
      gateway: gateway(rng),
      providerOrderId: 'DEMO-ORD-' + rng.hex(16),
      status,
      createdAt: at,
      updatedAt: new Date(+at + rng.int(1, 10) * 60 * 1000),
      ...(c ? { coupon: c._id, couponCode: c.code, originalAmount: price.original, discount: price.discount } : {}),
      ...extra,
    };
    if (status === 'COMPLETED' || status === 'REFUNDED') {
      o.captureId = 'DEMO-' + rng.hex(8);
      if (c) {
        used.add(c.code);
        usedCoupons.set(String(u._id), used);
        c.usedCount++;
      }
    } else if (c) o.couponReleased = true; // đơn thất bại/hủy đã trả lượt mã
    if (price.finalCents === 0) Object.assign(o, { provider: 'free', gateway: undefined, amountVnd: undefined });
    x.orders.push(o);
    return o;
  };
}

/** Ghi danh khóa miễn phí (đơn "free" hoàn tất ngay). */
function freeEnrollment(x, u) {
  const c = x.rng.pick(x.free);
  const at = randomDate(x.rng, x.months, u.createdAt, x.now);
  const o = {
    _id: x.rng.objectId(),
    user: u._id,
    course: c._id,
    amount: '0.00',
    currency: 'USD',
    provider: 'free',
    status: 'COMPLETED',
    createdAt: at,
    updatedAt: at,
  };
  x.orders.push(o);
  x.enrollments.push({ user: u._id, course: c._id, order: o._id, createdAt: at, updatedAt: at });
}

/** Đơn thành công của từng học viên: ~25% chỉ học khóa miễn phí, còn lại mua 1–5 khóa có phí. */
function purchaseOrders(x, paidOrder) {
  const { rng } = x;
  // Thời điểm mua: 55% trong 3 tuần đầu sau khi đăng ký, còn lại rải theo mùa (cao điểm tháng 9, 12)
  const buyAt = (u) =>
    rng.chance(0.55) ? later(rng, u.createdAt, 3600 * 1000, 21 * DAY, x.now) : randomDate(rng, x.months, u.createdAt, x.now);
  x.purchases = []; // đơn thanh toán thành công (một phần sẽ chuyển thành hoàn tiền)
  for (const u of x.learners) {
    const freeOnly = rng.chance(0.25);
    if (x.free.length && (freeOnly || rng.chance(0.55))) freeEnrollment(x, u);
    if (freeOnly || !x.paid.length) continue;
    const k = Math.min(
      x.paid.length,
      rng.weighted([
        [1, 12],
        [2, 28],
        [3, 32],
        [4, 18],
        [5, 10],
      ]),
    );
    for (const c of rng.shuffle(x.paid).slice(0, k)) x.purchases.push({ u, c, o: paidOrder(u, c, buyAt(u), 'COMPLETED') });
  }
}

/** Một phần đơn thành công → hoàn tiền (không ghi danh); phần còn lại → ghi danh. */
function applyRefunds(x, nRefund) {
  const refunded = new Set(
    x.rng
      .shuffle(x.purchases)
      .slice(0, nRefund)
      .map((p) => p.o._id),
  );
  for (const p of x.purchases) {
    if (refunded.has(p.o._id)) {
      Object.assign(p.o, { status: 'REFUNDED', refundedAt: later(x.rng, p.o.createdAt, DAY, 10 * DAY, x.now), refundedBy: x.admin?._id });
    } else {
      x.enrollments.push({ user: p.u._id, course: p.c._id, order: p.o._id, createdAt: p.o.updatedAt, updatedAt: p.o.updatedAt });
    }
  }
}

/** Đơn thất bại / hủy: 70% là lần thử trước một đơn thành công (cùng người, cùng khóa); 30% là lần thử rồi bỏ. */
function failedOrders(x, paidOrder, nFail, nCancel) {
  const { rng } = x;
  const owns = new Set(x.orders.map((o) => `${o.user}:${o.course}`));
  const buyers = x.learners.filter((u) => x.purchases.some((p) => p.u === u));
  const extra = (status, reason) => {
    if (x.purchases.length && rng.chance(0.7)) {
      const p = rng.pick(x.purchases);
      const at = new Date(+p.o.createdAt - rng.int(5, 120) * 60 * 1000);
      return paidOrder(p.u, p.c, at < p.u.createdAt ? p.u.createdAt : at, status, { failureReason: reason, gateway: gateway(rng) });
    }
    const u = rng.pick(buyers.length ? buyers : x.learners);
    const options = x.paid.filter((c) => !owns.has(`${u._id}:${c._id}`));
    const c = options.length ? rng.pick(options) : rng.pick(x.paid);
    return paidOrder(u, c, randomDate(rng, x.months, u.createdAt, x.now), status, { failureReason: reason });
  };
  if (!x.paid.length) return;
  for (let i = 0; i < nFail; i++) extra('FAILED', 'demo_declined');
  for (let i = 0; i < nCancel; i++) extra('CANCELLED', 'demo_cancelled');
}

/** Đơn hàng + ghi danh. Tỉ lệ toàn bộ đơn: ~85% thành công / 8% thất bại / 5% hủy / 2% hoàn tiền. */
function makeOrders(x) {
  x.orders = [];
  x.enrollments = [];
  const paidOrder = orderFactory(x);
  purchaseOrders(x, paidOrder);
  const total = Math.round(x.orders.length / 0.87);
  applyRefunds(x, Math.round(total * 0.02));
  failedOrders(x, paidOrder, Math.round(total * 0.08), Math.round(total * 0.05));
  for (const o of x.orders) if (o.provider === 'free') delete o.gateway;
  x.orders.sort((a, b) => a.createdAt - b.createdAt);
}

/** Kết quả trắc nghiệm (đạt) cho các bài đã học xong. */
function quizResultsFor(rng, done, at) {
  return done
    .filter((l) => l.quiz?.length)
    .map((l) => {
      const total = l.quiz.length;
      const correct = Math.max(Math.ceil(total * 0.7), total - rng.int(0, 1));
      const answers = l.quiz.map((q, i) => (i < correct ? q.answer : (q.answer + 1) % 4));
      return { lesson: l._id, correct, total, pct: Math.round((correct / total) * 100), passed: true, answers, at };
    });
}

/** Tiến độ + chứng nhận cho 1 lượt ghi danh: 22% chưa học, 58% đang học, 20% học xong. */
function progressFor(x, e) {
  const { rng } = x;
  const course = x.byId.get(String(e.course));
  const lessons = course.lessons;
  const state = rng.weighted([
    ['none', 22],
    ['doing', 58],
    ['done', 20],
  ]);
  let doneCount = 0;
  if (state === 'done') doneCount = lessons.length;
  else if (state === 'doing') doneCount = rng.int(1, Math.max(1, lessons.length - 1));
  const list = x.enrolledBy.get(String(e.course)) || [];
  list.push({ u: x.learnerById.get(String(e.user)), at: e.createdAt, pct: lessons.length ? doneCount / lessons.length : 0 });
  x.enrolledBy.set(String(e.course), list);
  if (state === 'none' && rng.chance(0.5)) return;
  const done = lessons.slice(0, doneCount);
  const at = later(rng, e.createdAt, DAY, 60 * DAY, x.now);
  const quizResults = quizResultsFor(rng, done, at);
  const next = lessons[Math.min(doneCount, lessons.length - 1)];
  x.progress.push({
    user: e.user,
    course: e.course,
    completedLessons: done.map((l) => l._id),
    lastLesson: next ? next._id : undefined,
    quizResults,
    createdAt: e.createdAt,
    updatedAt: at,
  });
  if (lessons.length && doneCount === lessons.length) {
    const name = x.learnerById.get(String(e.user)).name;
    x.certificates.push({
      user: e.user,
      course: e.course,
      code: rng.hex(16),
      name,
      courseTitle: course.title,
      issuedAt: at,
      createdAt: at,
      updatedAt: at,
    });
  }
}

/** Tiến độ, trắc nghiệm, chứng nhận; đồng thời gom học viên theo khóa (enrolledBy) cho các bước sau. */
function makeProgress(x) {
  x.byId = new Map(x.courses.map((c) => [String(c._id), c]));
  x.learnerById = new Map(x.learners.map((u) => [String(u._id), u]));
  x.enrolledBy = new Map(); // courseId → [{ u, at, pct }]
  x.progress = [];
  x.certificates = [];
  for (const e of x.enrollments) progressFor(x, e);
}

/** Đánh giá (~70% số học viên có số liệu): chỉ người đã học ≥ 30%; hết câu viết sẵn → chỉ chấm sao. */
function makeReviews(x) {
  const { rng } = x;
  x.reviews = [];
  const candidates = rng.shuffle(
    [...x.enrolledBy.entries()].flatMap(([cid, list]) => list.filter((e) => e.pct >= 0.3).map((e) => ({ cid, ...e }))),
  );
  const bankUse = new Map();
  for (const e of candidates.slice(0, Math.round(x.nUsers * 0.7))) {
    const course = x.byId.get(e.cid);
    const rating = rng.weighted([
      [5, 55],
      [4, 28],
      [3, 10],
      [2, 5],
      [1, 2],
    ]);
    const bank = x.texts[course.slug]?.reviews?.[String(rating)] || [];
    const key = `${course.slug}:${rating}`;
    const n = bankUse.get(key) || 0;
    bankUse.set(key, n + 1);
    const content = n < bank.length && rng.chance(0.85) ? bank[n] : undefined;
    const at = later(rng, e.at, 3 * DAY, 90 * DAY, x.now);
    x.reviews.push({ user: e.u._id, course: course._id, rating, content, createdAt: at, updatedAt: at });
  }
}

/** Trả lời của học viên khác + (tùy) giảng viên cho 1 câu hỏi. Trả về thời điểm trả lời cuối. */
function qaAnswers(x, ctx, item, q, asker) {
  const { rng, now } = x;
  const { course, lesson, enrolled } = ctx;
  const voters = (max) => rng.shuffle(enrolled.map((e) => e.u._id)).slice(0, rng.int(0, max));
  const withTeacher = rng.chance(0.43) || !item.answers?.length;
  let t = q.createdAt;
  for (const a of item.answers || []) {
    const who = rng.pick(enrolled.filter((e) => e.u !== asker.u)) || asker;
    t = later(rng, t, 20 * 60 * 1000, 3 * DAY, now);
    x.posts.push({
      course: course._id,
      lesson: lesson._id,
      user: who.u._id,
      parent: q._id,
      content: a,
      votes: voters(4),
      createdAt: t,
      updatedAt: t,
    });
  }
  if (withTeacher) {
    t = later(rng, q.createdAt, 3600 * 1000, 2 * DAY, now);
    const best = rng.chance(0.7);
    const user = rng.pick(x.collabs)?._id || x.admin?._id;
    x.posts.push({
      course: course._id,
      lesson: lesson._id,
      user,
      parent: q._id,
      content: item.instructor,
      votes: voters(best ? 12 : 6),
      best,
      createdAt: t,
      updatedAt: t,
    });
  }
  return t;
}

/** Hỏi – Đáp của 1 bài: tối đa 9 câu hỏi, ~70% có trả lời (kèm thông báo cho người hỏi). */
function qaForLesson(x, ctx, bank, idx) {
  const { rng, now } = x;
  const { course, lesson, enrolled } = ctx;
  for (const item of bank.slice(0, 9)) {
    const asker = rng.pick(enrolled);
    const qAt = later(rng, asker.at, 2 * 3600 * 1000, 120 * DAY, now);
    const _id = rng.objectId();
    const votes = rng.shuffle(enrolled.map((e) => e.u._id)).slice(0, rng.int(0, 6));
    const q = {
      _id,
      course: course._id,
      lesson: lesson._id,
      user: asker.u._id,
      parent: null,
      content: item.q,
      votes,
      createdAt: qAt,
      updatedAt: qAt,
    };
    x.posts.push(q);
    if (!rng.chance(0.7)) continue; // ~30% chưa có ai trả lời
    const t = qaAnswers(x, ctx, item, q, asker);
    x.notifications.push({
      user: asker.u._id,
      type: 'qa_reply',
      text: `Có câu trả lời mới cho câu hỏi của bạn trong bài “${lesson.title}”.`.slice(0, 300),
      link: `/learn/${course.slug}?lesson=${idx}#qa`,
      read: rng.chance(0.6),
      createdAt: t,
    });
  }
}

/** Hỏi – Đáp theo bài (~9 câu/bài), ~30% có câu hay nhất của giảng viên. */
function makeQa(x) {
  x.posts = [];
  x.notifications = [];
  for (const course of x.courses) {
    const data = x.texts[course.slug];
    const enrolled = x.enrolledBy.get(String(course._id)) || [];
    if (!data || enrolled.length < 3) continue;
    listLessonFiles(course.slug).forEach((f, idx) => {
      const lesson = course.lessons[idx];
      const bank = data.lessons?.[path.basename(f, '.md')];
      if (lesson && bank) qaForLesson(x, { course, lesson, enrolled }, bank, idx);
    });
  }
  for (const p of x.posts) if (!p.user) p.user = x.admin?._id; // khóa học không có CTV demo nào: gán admin
  x.validPosts = x.posts.filter((p) => p.user);
}

/** Bình luận khóa học (~0,8/học viên); bình luận spam/thiếu lịch sự viết sẵn → luôn có và ở trạng thái admin đã ẩn. */
function makeComments(x) {
  x.comments = [];
  const perCourse = Math.round((x.nUsers * 0.8) / Math.max(1, x.courses.filter((c) => x.texts[c.slug]).length));
  for (const course of x.courses) {
    const bank = x.texts[course.slug]?.comments || [];
    const enrolled = x.enrolledBy.get(String(course._id)) || [];
    if (!bank.length || !enrolled.length) continue;
    const spamBank = x.texts[course.slug]?.spam || [];
    const chosen = [...bank.slice(0, Math.max(0, perCourse - spamBank.length)).map((c) => [c, false]), ...spamBank.map((c) => [c, true])];
    for (const [content, spam] of chosen) {
      const who = x.rng.pick(enrolled);
      const at = later(x.rng, who.at, 3600 * 1000, 150 * DAY, x.now);
      x.comments.push({ course: course._id, user: who.u._id, content, hidden: spam, createdAt: at, updatedAt: at });
    }
  }
}

/** Chat: 20–40 tin trong phòng của 3 khóa đông học viên nhất (30 ngày gần đây). */
function makeChat(x) {
  const { rng, now } = x;
  x.chat = [];
  const popular = [...x.enrolledBy.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  for (const [cid, enrolled] of popular) {
    const course = x.byId.get(cid);
    const lines = x.texts[course.slug]?.chat || [];
    const n = Math.min(lines.length, rng.int(20, 40));
    let t = new Date(+now - 30 * DAY);
    for (const text of lines.slice(0, n)) {
      t = new Date(Math.min(+now - 60 * 1000, +t + rng.int(10, 60 * 24) * 60 * 1000));
      x.chat.push({ course: course._id, user: rng.pick(enrolled).u._id, text, createdAt: t });
    }
  }
}

const seedAudit = (fields) => ({ ip: '127.0.0.1', userAgent: 'seed:demo', ...fields });

/** Thông báo thanh toán / hoàn tiền + nhật ký bảo mật tương ứng (hoàn tiền, khóa tài khoản). */
function makeEvents(x) {
  const { rng } = x;
  x.audits = [];
  for (const o of x.orders) {
    const course = x.byId.get(String(o.course));
    if (o.status === 'COMPLETED' && o.provider === 'demo') {
      const text = `Thanh toán thành công $${o.amount} (demo) cho khóa học “${course.title}”. Chúc bạn học tốt!`.slice(0, 300);
      x.notifications.push({
        user: o.user,
        type: 'payment',
        text,
        link: `/learn/${course.slug}`,
        read: rng.chance(0.8),
        createdAt: o.updatedAt,
      });
    }
    if (o.status !== 'REFUNDED') continue;
    const text = `Đơn hàng khóa “${course.title}” ($${o.amount}) đã được hoàn tiền (demo). Quyền học khóa này đã được thu hồi.`.slice(
      0,
      300,
    );
    x.notifications.push({ user: o.user, type: 'refund', text, link: '/orders', read: rng.chance(0.5), createdAt: o.refundedAt });
    const meta = { orderId: String(o._id), amount: o.amount, currency: 'USD', courseId: String(course._id), reason: 'demo' };
    x.audits.push(seedAudit({ action: 'order.refund', actor: x.admin?._id, target: o.user, meta, createdAt: o.refundedAt }));
  }
  for (const u of x.learners.filter((l) => l.locked)) {
    const createdAt = later(rng, u.createdAt, DAY, 60 * DAY, x.now);
    x.audits.push(seedAudit({ action: 'user.lock', actor: x.admin?._id, target: u._id, createdAt }));
  }
}

/** Ghi mọi bản ghi vào CSDL. Thông báo chỉ giữ 90 ngày (TTL) → chỉ ghi thông báo trong 85 ngày gần nhất. */
async function writeAll(x) {
  const recentNotes = x.notifications.filter((n) => n.createdAt && +n.createdAt > +x.now - 85 * DAY);
  const created = {
    User: await insertAll(M.User, [...x.learners, ...x.collabs]),
    Coupon: await insertAll(M.Coupon, x.coupons),
    Order: await insertAll(M.Order, x.orders),
    Enrollment: await insertAll(M.Enrollment, x.enrollments),
    Progress: await insertAll(M.Progress, x.progress),
    Certificate: await insertAll(M.Certificate, x.certificates),
    Review: await insertAll(M.Review, x.reviews),
    Post: await insertAll(M.Post, x.validPosts),
    CourseComment: await insertAll(M.CourseComment, x.comments),
    ChatMessage: await insertAll(M.ChatMessage, x.chat),
    Notification: await insertAll(M.Notification, recentNotes),
    AuditLog: await insertAll(M.AuditLog, x.audits),
  };
  await refreshRatings();
  return created;
}

/** Báo cáo: số lượng theo loại, doanh thu theo tháng (đơn thành công, không tính khóa miễn phí). */
function buildReport(x, removed, created) {
  const byStatus = {};
  for (const o of x.orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  const revenue = Object.fromEntries(x.months.map((m) => [m.key, 0]));
  for (const o of x.orders) {
    if (o.status !== 'COMPLETED' || o.provider === 'free') continue;
    const k = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (k in revenue) revenue[k] = Math.round((revenue[k] + Number(o.amount)) * 100) / 100;
  }
  const posts = x.validPosts;
  return {
    seed: x.seed,
    removed,
    created,
    users: { learners: x.learners.length, collaborators: x.collabs.length, locked: x.learners.filter((u) => u.locked).length },
    orders: { total: x.orders.length, ...byStatus, withCoupon: x.orders.filter((o) => o.couponCode).length },
    revenue,
    qa: {
      questions: posts.filter((p) => !p.parent).length,
      answers: posts.filter((p) => p.parent).length,
      best: posts.filter((p) => p.best).length,
    },
    comments: { total: x.comments.length, hidden: x.comments.filter((c) => c.hidden).length },
    reviews: x.reviews.length,
    certificates: x.certificates.length,
  };
}

/**
 * Tạo bộ dữ liệu demo (xóa demo cũ trước → chạy lại không nhân đôi; cùng seed + cùng ngày → cùng dữ liệu).
 * @param {{ seed?: number, users?: number, collaborators?: number, now?: Date, log?: Function }} [opts]
 *   mặc định seed 2026, 500 học viên, 10 CTV, hôm nay
 * @returns {Promise<object>} báo cáo (số lượng, doanh thu theo tháng)
 */
async function seedDemo(opts = {}) {
  const now0 = opts.now ? new Date(opts.now) : new Date();
  const now = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate(), 20, 0, 0); // cố định trong ngày
  const seed = Number.isInteger(opts.seed) ? opts.seed : 2026;
  const x = { seed, nUsers: opts.users || 500, nCollab: opts.collaborators ?? 10, now, rng: rngFrom(seed), months: monthWindows(now) };
  const removed = await unseedDemo();
  x.texts = loadTexts();
  x.courses = await M.Course.find({ published: true }).sort({ createdAt: 1, _id: 1 });
  if (!x.courses.length) throw new Error('Chưa có khóa học đã xuất bản – chạy "npm run seed" trước.');
  x.free = x.courses.filter((c) => c.price === 0);
  x.paid = x.courses.filter((c) => c.price > 0);
  x.admin = await M.User.findOne({ role: 'admin', isDemo: trusted({ $ne: true }) }).sort({ createdAt: 1 });
  x.passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('base64url'), 10); // dùng chung, không in ra
  await makeUsers(x);
  await makeCoupons(x);
  makeOrders(x);
  makeProgress(x);
  makeReviews(x);
  makeQa(x);
  makeComments(x);
  makeChat(x);
  makeEvents(x);
  const report = buildReport(x, removed, await writeAll(x));
  (opts.log || (() => {}))(report);
  return report;
}

function printReport(r) {
  const line = (k, v) => console.log(`  ${k.padEnd(26)} ${v}`);
  console.log(`\n✓ Dữ liệu demo (seed=${r.seed})`);
  line('Học viên / CTV / bị khóa', `${r.users.learners} / ${r.users.collaborators} / ${r.users.locked}`);
  line(
    'Đơn hàng',
    `${r.orders.total} (thành công ${r.orders.COMPLETED || 0}, thất bại ${r.orders.FAILED || 0}, hủy ${r.orders.CANCELLED || 0}, hoàn tiền ${r.orders.REFUNDED || 0}; dùng mã ${r.orders.withCoupon})`,
  );
  line('Ghi danh / tiến độ', `${r.created.Enrollment} / ${r.created.Progress}`);
  line('Chứng nhận', r.certificates);
  line('Hỏi – Đáp', `${r.qa.questions} câu hỏi, ${r.qa.answers} trả lời (${r.qa.best} hay nhất)`);
  line('Bình luận', `${r.comments.total} (${r.comments.hidden} bị ẩn)`);
  line('Đánh giá', r.reviews);
  line('Tin nhắn chat / thông báo', `${r.created.ChatMessage} / ${r.created.Notification}`);
  console.log('  Doanh thu theo tháng (USD, đơn thành công, không tính khóa miễn phí):');
  let sum = 0;
  for (const [k, v] of Object.entries(r.revenue)) {
    sum += v;
    console.log(`    ${k}  ${v.toFixed(2).padStart(9)}  ${'█'.repeat(Math.round(v / 40))}`);
  }
  console.log(`    Tổng     ${sum.toFixed(2).padStart(9)}`);
}

module.exports = { seedDemo, unseedDemo, DEMO_MODELS, rngFrom };

async function cliUnseed() {
  const counts = await unseedDemo();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`✓ Đã xóa ${total} bản ghi demo:`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(14)} ${v}`);
}

async function cliSeed(args) {
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const seed = flag('seed') !== undefined ? Number.parseInt(flag('seed'), 10) : 2026;
  const users = flag('users') !== undefined ? Number.parseInt(flag('users'), 10) : 500;
  if (!Number.isInteger(seed) || !Number.isInteger(users) || users < 10 || users > 20000)
    throw new Error('Tham số: --seed=<số nguyên> --users=<10..20000>');
  const t0 = Date.now();
  const r = await seedDemo({ seed, users });
  printReport(r);
  const removed = Object.values(r.removed).reduce((a, b) => a + b, 0);
  console.log(`  (đã xóa demo cũ: ${removed} bản ghi; thời gian ${((Date.now() - t0) / 1000).toFixed(1)} giây)`);
}

async function main(args) {
  const config = require('../src/config');
  if (config.isProd && !args.includes('--allow-production')) {
    throw new Error('NODE_ENV=production: từ chối tạo/xóa dữ liệu demo. Thêm --allow-production nếu thực sự muốn (bản demo công khai).');
  }
  await mongoose.connect(config.mongoUri);
  await require('../src/migrations').runMigrations({ log: () => {} });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  if (args.includes('--unseed')) await cliUnseed();
  else await cliSeed(args);
  await mongoose.disconnect();
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(async (e) => {
    console.error(`✗ ${e.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
