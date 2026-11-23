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
  for (const name of DEMO_MODELS) counts[name] = (await M[name].deleteMany({ isDemo: true })).deletedCount;
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

/**
 * Tạo bộ dữ liệu demo. Trả về báo cáo (số lượng, doanh thu theo tháng).
 * opts: seed (2026), users (500), collaborators (10), now (Date), log (hàm in)
 */
async function seedDemo(opts = {}) {
  const seed = Number.isInteger(opts.seed) ? opts.seed : 2026;
  const nUsers = opts.users || 500;
  const nCollab = opts.collaborators ?? 10;
  const log = opts.log || (() => {});
  const now0 = opts.now ? new Date(opts.now) : new Date();
  const now = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate(), 20, 0, 0); // cố định trong ngày → chạy lại ra cùng dữ liệu
  const rng = rngFrom(seed);
  const months = monthWindows(now);

  const removed = await unseedDemo(); // chạy lại không nhân đôi
  const texts = loadTexts();
  const courses = await M.Course.find({ published: true }).sort({ createdAt: 1, _id: 1 });
  if (!courses.length) throw new Error('Chưa có khóa học đã xuất bản – chạy "npm run seed" trước.');
  const free = courses.filter((c) => c.price === 0);
  const paid = courses.filter((c) => c.price > 0);
  const admin = await M.User.findOne({ role: 'admin', isDemo: { $ne: true } }).sort({ createdAt: 1 });
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('base64url'), 10); // dùng chung, không in ra

  // ---------- Người dùng ----------
  const usedNames = new Set((await M.User.find().select('username').lean()).map((u) => u.username));
  const learners = [];
  for (let i = 0; i < nUsers; i++) {
    const p = makePerson(rng, usedNames);
    learners.push({ _id: rng.objectId(), ...p, role: 'user', passwordHash, createdAt: randomDate(rng, months, null, now, 'regWeight') });
  }
  learners.sort((a, b) => a.createdAt - b.createdAt);
  for (const u of learners) {
    u.updatedAt = u.createdAt;
    u.locked = rng.chance(0.05); // xử lý vi phạm
  }
  const collabs = [];
  for (let i = 0; i < nCollab; i++) {
    const p = makePerson(rng, usedNames);
    const createdAt = new Date(+months[0].start + rng.next() * 20 * DAY);
    collabs.push({
      _id: rng.objectId(),
      ...p,
      username: `ctv.${p.username}`.slice(0, 30),
      role: 'collaborator',
      passwordHash,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // ---------- Mã giảm giá demo (bỏ qua mã trùng tên mã thật) ----------
  const couponDefs = [
    { code: 'CHAOBAN10', type: 'percent', value: 10, note: 'Chào bạn mới (demo)' },
    { code: 'NHAPHOC20', type: 'percent', value: 20, note: 'Mùa nhập học (demo)', months: [8, 9] },
    { code: 'CUOINAM15', type: 'percent', value: 15, note: 'Cuối năm (demo)', months: [12] },
    { code: 'GIAM5USD', type: 'amount', value: 5, note: 'Giảm 5 USD (demo)' },
  ];
  const taken = new Set((await M.Coupon.find({ code: { $in: couponDefs.map((c) => c.code) } }).lean()).map((c) => c.code));
  const coupons = couponDefs
    .filter((c) => !taken.has(c.code))
    .map((c) => ({ _id: rng.objectId(), ...c, active: true, usedCount: 0, createdBy: admin?._id, createdAt: months[0].start }));
  const couponFor = (date, usedByUser) => {
    const m = date.getMonth() + 1;
    const ok = coupons.filter((c) => !usedByUser.has(c.code) && (!c.months || c.months.includes(m)));
    return ok.length ? rng.pick(ok) : null;
  };

  // ---------- Đơn hàng + ghi danh ----------
  const orders = [];
  const enrollments = [];
  const orderNo = () => 'DEMO-ORD-' + rng.hex(16);
  const gw = () =>
    rng.weighted([
      ['paypal', 40],
      ['vnpay', 35],
      ['momo', 25],
    ]);
  const usedCoupons = new Map(); // user → Set(mã đã dùng thành công)
  function paidOrder(u, course, at, status, extra = {}) {
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
      gateway: gw(),
      providerOrderId: orderNo(),
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
    orders.push(o);
    return o;
  }

  // Thời điểm mua: 55% trong 3 tuần đầu sau khi đăng ký, còn lại rải theo mùa (cao điểm tháng 9, 12)
  const buyAt = (u) => (rng.chance(0.55) ? later(rng, u.createdAt, 3600 * 1000, 21 * DAY, now) : randomDate(rng, months, u.createdAt, now));
  const purchases = []; // đơn thanh toán thành công (một phần sẽ chuyển thành hoàn tiền)
  for (const u of learners) {
    const freeOnly = rng.chance(0.25); // ~25% chỉ học khóa miễn phí
    const takeFree = free.length && (freeOnly || rng.chance(0.55));
    if (takeFree) {
      const c = rng.pick(free);
      const at = randomDate(rng, months, u.createdAt, now);
      const o = {
        _id: rng.objectId(),
        user: u._id,
        course: c._id,
        amount: '0.00',
        currency: 'USD',
        provider: 'free',
        status: 'COMPLETED',
        createdAt: at,
        updatedAt: at,
      };
      orders.push(o);
      enrollments.push({ user: u._id, course: c._id, order: o._id, createdAt: at, updatedAt: at });
    }
    if (freeOnly || !paid.length) continue;
    const k = Math.min(
      paid.length,
      rng.weighted([
        [1, 12],
        [2, 28],
        [3, 32],
        [4, 18],
        [5, 10],
      ]),
    );
    for (const c of rng.shuffle(paid).slice(0, k)) {
      const at = buyAt(u);
      purchases.push({ u, c, o: paidOrder(u, c, at, 'COMPLETED') });
    }
  }
  // Tỉ lệ toàn bộ đơn: ~85% thành công / 8% thất bại / 5% hủy / 2% hoàn tiền
  const base = orders.length;
  const total = Math.round(base / 0.87);
  const nFail = Math.round(total * 0.08);
  const nCancel = Math.round(total * 0.05);
  const nRefund = Math.round(total * 0.02);
  const refunded = new Set(
    rng
      .shuffle(purchases)
      .slice(0, nRefund)
      .map((p) => p.o._id),
  );
  for (const p of purchases) {
    if (refunded.has(p.o._id)) {
      Object.assign(p.o, { status: 'REFUNDED', refundedAt: later(rng, p.o.createdAt, DAY, 10 * DAY, now), refundedBy: admin?._id });
    } else {
      enrollments.push({ user: p.u._id, course: p.c._id, order: p.o._id, createdAt: p.o.updatedAt, updatedAt: p.o.updatedAt });
    }
  }
  const owns = new Set(orders.map((o) => `${o.user}:${o.course}`));
  const buyers = learners.filter((u) => purchases.some((p) => p.u === u));
  const extra = (status, reason) => {
    // 70% là lần thử trước một đơn thành công (cùng người, cùng khóa); 30% là lần thử rồi bỏ
    if (purchases.length && rng.chance(0.7)) {
      const p = rng.pick(purchases);
      const at = new Date(+p.o.createdAt - rng.int(5, 120) * 60 * 1000);
      return paidOrder(p.u, p.c, at < p.u.createdAt ? p.u.createdAt : at, status, { failureReason: reason, gateway: gw() });
    }
    const u = rng.pick(buyers.length ? buyers : learners);
    const options = paid.filter((c) => !owns.has(`${u._id}:${c._id}`));
    const c = options.length ? rng.pick(options) : rng.pick(paid);
    return paidOrder(u, c, randomDate(rng, months, u.createdAt, now), status, { failureReason: reason });
  };
  if (paid.length) {
    for (let i = 0; i < nFail; i++) extra('FAILED', 'demo_declined');
    for (let i = 0; i < nCancel; i++) extra('CANCELLED', 'demo_cancelled');
  }
  for (const o of orders) if (o.provider === 'free') delete o.gateway;
  orders.sort((a, b) => a.createdAt - b.createdAt);

  // ---------- Tiến độ, trắc nghiệm, chứng nhận ----------
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  const progress = [];
  const certificates = [];
  const learnerById = new Map(learners.map((u) => [String(u._id), u]));
  const enrolledBy = new Map(); // courseId → [{ u, at, pct }]
  for (const e of enrollments) {
    const course = byId.get(String(e.course));
    const lessons = course.lessons;
    const u = learnerById.get(String(e.user));
    const state = rng.weighted([
      ['none', 22],
      ['doing', 58],
      ['done', 20],
    ]);
    let doneCount = 0;
    if (state === 'done') doneCount = lessons.length;
    else if (state === 'doing') doneCount = rng.int(1, Math.max(1, lessons.length - 1));
    const list = enrolledBy.get(String(e.course)) || [];
    list.push({ u, at: e.createdAt, pct: lessons.length ? doneCount / lessons.length : 0 });
    enrolledBy.set(String(e.course), list);
    if (state === 'none' && rng.chance(0.5)) continue;
    const done = lessons.slice(0, doneCount);
    const at = later(rng, e.createdAt, DAY, 60 * DAY, now);
    const quizResults = done
      .filter((l) => l.quiz?.length)
      .map((l) => {
        const total = l.quiz.length;
        const correct = Math.max(Math.ceil(total * 0.7), total - rng.int(0, 1));
        const answers = l.quiz.map((q, i) => (i < correct ? q.answer : (q.answer + 1) % 4));
        return { lesson: l._id, correct, total, pct: Math.round((correct / total) * 100), passed: true, answers, at };
      });
    const next = lessons[Math.min(doneCount, lessons.length - 1)];
    progress.push({
      user: e.user,
      course: e.course,
      completedLessons: done.map((l) => l._id),
      lastLesson: next ? next._id : undefined,
      quizResults,
      createdAt: e.createdAt,
      updatedAt: at,
    });
    if (lessons.length && doneCount === lessons.length) {
      certificates.push({
        user: e.user,
        course: e.course,
        code: rng.hex(16),
        name: u.name,
        courseTitle: course.title,
        issuedAt: at,
        createdAt: at,
        updatedAt: at,
      });
    }
  }

  // ---------- Đánh giá (~70% số học viên có số liệu, tối đa ~350 với 500 người) ----------
  const reviews = [];
  const reviewTarget = Math.round(nUsers * 0.7);
  const candidates = rng.shuffle(
    [...enrolledBy.entries()].flatMap(([cid, list]) => list.filter((x) => x.pct >= 0.3).map((x) => ({ cid, ...x }))),
  );
  const bankUse = new Map();
  for (const x of candidates.slice(0, reviewTarget)) {
    const course = byId.get(x.cid);
    const rating = rng.weighted([
      [5, 55],
      [4, 28],
      [3, 10],
      [2, 5],
      [1, 2],
    ]);
    const bank = texts[course.slug]?.reviews?.[String(rating)] || [];
    const key = `${course.slug}:${rating}`;
    const n = bankUse.get(key) || 0;
    bankUse.set(key, n + 1);
    const content = n < bank.length && rng.chance(0.85) ? bank[n] : undefined; // hết câu viết sẵn → chỉ chấm sao
    const at = later(rng, x.at, 3 * DAY, 90 * DAY, now);
    reviews.push({ user: x.u._id, course: course._id, rating, content, createdAt: at, updatedAt: at });
  }

  // ---------- Hỏi – Đáp theo bài (~300 câu hỏi: 9/bài), ~70% có trả lời, ~30% có câu hay nhất của giảng viên ----------
  const posts = [];
  const notifications = [];
  const voters = (list, max) => rng.shuffle(list.map((x) => x.u._id)).slice(0, rng.int(0, max));
  for (const course of courses) {
    const data = texts[course.slug];
    const enrolled = enrolledBy.get(String(course._id)) || [];
    if (!data || enrolled.length < 3) continue;
    const files = listLessonFiles(course.slug).map((f) => path.basename(f, '.md'));
    files.forEach((stem, idx) => {
      const lesson = course.lessons[idx];
      const bank = data.lessons?.[stem];
      if (!lesson || !bank) return;
      for (const item of bank.slice(0, 9)) {
        const asker = rng.pick(enrolled);
        const qAt = later(rng, asker.at, 2 * 3600 * 1000, 120 * DAY, now);
        const q = {
          _id: rng.objectId(),
          course: course._id,
          lesson: lesson._id,
          user: asker.u._id,
          parent: null,
          content: item.q,
          votes: voters(enrolled, 6),
          createdAt: qAt,
          updatedAt: qAt,
        };
        posts.push(q);
        if (!rng.chance(0.7)) continue; // ~30% chưa có ai trả lời
        const withTeacher = rng.chance(0.43) || !item.answers?.length;
        let t = qAt;
        for (const a of item.answers || []) {
          const who = rng.pick(enrolled.filter((x) => x.u !== asker.u)) || asker;
          t = later(rng, t, 20 * 60 * 1000, 3 * DAY, now);
          posts.push({
            course: course._id,
            lesson: lesson._id,
            user: who.u._id,
            parent: q._id,
            content: a,
            votes: voters(enrolled, 4),
            createdAt: t,
            updatedAt: t,
          });
        }
        if (withTeacher) {
          t = later(rng, qAt, 3600 * 1000, 2 * DAY, now);
          const best = rng.chance(0.7);
          posts.push({
            course: course._id,
            lesson: lesson._id,
            user: rng.pick(collabs)?._id || admin?._id,
            parent: q._id,
            content: item.instructor,
            votes: voters(enrolled, best ? 12 : 6),
            best,
            createdAt: t,
            updatedAt: t,
          });
        }
        notifications.push({
          user: asker.u._id,
          type: 'qa_reply',
          text: `Có câu trả lời mới cho câu hỏi của bạn trong bài “${lesson.title}”.`.slice(0, 300),
          link: `/learn/${course.slug}?lesson=${idx}#qa`,
          read: rng.chance(0.6),
          createdAt: t,
        });
      }
    });
  }
  for (const p of posts) if (!p.user) p.user = admin?._id; // khóa học không có CTV demo nào: gán admin
  const validPosts = posts.filter((p) => p.user);

  // ---------- Bình luận khóa học (~400; vài bình luận spam/thô bị admin ẩn) ----------
  const comments = [];
  const perCourse = Math.round((nUsers * 0.8) / Math.max(1, courses.filter((c) => texts[c.slug]).length));
  for (const course of courses) {
    const bank = texts[course.slug]?.comments || [];
    const enrolled = enrolledBy.get(String(course._id)) || [];
    if (!bank.length || !enrolled.length) continue;
    // "spam": bình luận quảng cáo / thiếu lịch sự viết sẵn → luôn đưa vào và để ở trạng thái admin đã ẩn
    const spamBank = texts[course.slug]?.spam || [];
    const chosen = [...bank.slice(0, Math.max(0, perCourse - spamBank.length)).map((c) => [c, false]), ...spamBank.map((c) => [c, true])];
    chosen.forEach(([content, spam]) => {
      const who = rng.pick(enrolled);
      const at = later(rng, who.at, 3600 * 1000, 150 * DAY, now);
      comments.push({ course: course._id, user: who.u._id, content, hidden: spam, createdAt: at, updatedAt: at });
    });
  }

  // ---------- Chat: 20–40 tin trong phòng của 3 khóa đông học viên nhất (30 ngày gần đây) ----------
  const chat = [];
  const popular = [...enrolledBy.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  for (const [cid, enrolled] of popular) {
    const course = byId.get(cid);
    const lines = texts[course.slug]?.chat || [];
    const n = Math.min(lines.length, rng.int(20, 40));
    let t = new Date(+now - 30 * DAY);
    for (const text of lines.slice(0, n)) {
      t = new Date(Math.min(+now - 60 * 1000, +t + rng.int(10, 60 * 24) * 60 * 1000));
      chat.push({ course: course._id, user: rng.pick(enrolled).u._id, text, createdAt: t });
    }
  }

  // ---------- Thông báo thanh toán / hoàn tiền + nhật ký bảo mật tương ứng ----------
  const audits = [];
  for (const o of orders) {
    const course = byId.get(String(o.course));
    if (o.status === 'COMPLETED' && o.provider === 'demo') {
      notifications.push({
        user: o.user,
        type: 'payment',
        text: `Thanh toán thành công $${o.amount} (demo) cho khóa học “${course.title}”. Chúc bạn học tốt!`.slice(0, 300),
        link: `/learn/${course.slug}`,
        read: rng.chance(0.8),
        createdAt: o.updatedAt,
      });
    }
    if (o.status === 'REFUNDED') {
      notifications.push({
        user: o.user,
        type: 'refund',
        text: `Đơn hàng khóa “${course.title}” ($${o.amount}) đã được hoàn tiền (demo). Quyền học khóa này đã được thu hồi.`.slice(0, 300),
        link: '/orders',
        read: rng.chance(0.5),
        createdAt: o.refundedAt,
      });
      audits.push({
        action: 'order.refund',
        actor: admin?._id,
        target: o.user,
        ip: '127.0.0.1',
        userAgent: 'seed:demo',
        meta: { orderId: String(o._id), amount: o.amount, currency: 'USD', courseId: String(course._id), reason: 'demo' },
        createdAt: o.refundedAt,
      });
    }
  }
  for (const u of learners.filter((x) => x.locked)) {
    audits.push({
      action: 'user.lock',
      actor: admin?._id,
      target: u._id,
      ip: '127.0.0.1',
      userAgent: 'seed:demo',
      createdAt: later(rng, u.createdAt, DAY, 60 * DAY, now),
    });
  }
  // Thông báo chỉ giữ 90 ngày (TTL) → chỉ tạo thông báo trong 90 ngày gần nhất
  const recentNotes = notifications.filter((x) => x.createdAt && +x.createdAt > +now - 85 * DAY);

  // ---------- Ghi CSDL ----------
  const created = {
    User: await insertAll(M.User, [...learners, ...collabs]),
    Coupon: await insertAll(M.Coupon, coupons),
    Order: await insertAll(M.Order, orders),
    Enrollment: await insertAll(M.Enrollment, enrollments),
    Progress: await insertAll(M.Progress, progress),
    Certificate: await insertAll(M.Certificate, certificates),
    Review: await insertAll(M.Review, reviews),
    Post: await insertAll(M.Post, validPosts),
    CourseComment: await insertAll(M.CourseComment, comments),
    ChatMessage: await insertAll(M.ChatMessage, chat),
    Notification: await insertAll(M.Notification, recentNotes),
    AuditLog: await insertAll(M.AuditLog, audits),
  };
  await refreshRatings();

  // ---------- Báo cáo ----------
  const byStatus = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  const revenue = Object.fromEntries(months.map((m) => [m.key, 0]));
  for (const o of orders) {
    if (o.status !== 'COMPLETED' || o.provider === 'free') continue;
    const k = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (k in revenue) revenue[k] = Math.round((revenue[k] + Number(o.amount)) * 100) / 100;
  }
  const report = {
    seed,
    removed,
    created,
    users: { learners: learners.length, collaborators: collabs.length, locked: learners.filter((u) => u.locked).length },
    orders: { total: orders.length, ...byStatus, withCoupon: orders.filter((o) => o.couponCode).length },
    revenue,
    qa: {
      questions: validPosts.filter((p) => !p.parent).length,
      answers: validPosts.filter((p) => p.parent).length,
      best: validPosts.filter((p) => p.best).length,
    },
    comments: { total: comments.length, hidden: comments.filter((c) => c.hidden).length },
    reviews: reviews.length,
    certificates: certificates.length,
  };
  log(report);
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

if (require.main === module) {
  const args = process.argv.slice(2);
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const unseed = args.includes('--unseed');
  (async () => {
    const config = require('../src/config');
    if (config.isProd && !args.includes('--allow-production')) {
      throw new Error('NODE_ENV=production: từ chối tạo/xóa dữ liệu demo. Thêm --allow-production nếu thực sự muốn (bản demo công khai).');
    }
    await mongoose.connect(config.mongoUri);
    await require('../src/migrations').runMigrations({ log: () => {} });
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    if (unseed) {
      const counts = await unseedDemo();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      console.log(`✓ Đã xóa ${total} bản ghi demo:`);
      for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(14)} ${v}`);
    } else {
      const seed = flag('seed') !== undefined ? Number.parseInt(flag('seed'), 10) : 2026;
      const users = flag('users') !== undefined ? Number.parseInt(flag('users'), 10) : 500;
      if (!Number.isInteger(seed) || !Number.isInteger(users) || users < 10 || users > 20000)
        throw new Error('Tham số: --seed=<số nguyên> --users=<10..20000>');
      const t0 = Date.now();
      const r = await seedDemo({ seed, users });
      printReport(r);
      console.log(
        `  (đã xóa demo cũ: ${Object.values(r.removed).reduce((a, b) => a + b, 0)} bản ghi; thời gian ${((Date.now() - t0) / 1000).toFixed(1)} giây)`,
      );
    }
    await mongoose.disconnect();
  })().catch(async (e) => {
    console.error(`✗ ${e.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
