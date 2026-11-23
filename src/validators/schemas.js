// Schema đầu vào theo từng route (tên = <module>.<thao tác>). Giới hạn độ dài ở đây là giới hạn CẤU TRÚC (chặn dữ liệu bất
// thường); giới hạn nghiệp vụ chặt hơn (vd. bình luận ≤ 500 ký tự) vẫn kiểm tra trong route để báo lỗi thân thiện.
const { z, optStr, oid, slug, flag, list, q, qs } = require('./index');

const P = {
  id: z.object({ id: oid }),
  slug: z.object({ slug }),
  courseId: z.object({ courseId: oid }),
  courseLesson: z.object({ id: oid, lessonId: oid }),
  demoRef: z.object({ ref: z.string().regex(/^DEMO-ORD-[0-9A-F]{16}$/) }),
  demoGw: z.object({ ref: z.string().regex(/^DEMO-ORD-[0-9A-F]{16}$/), gw: z.enum(['paypal', 'vnpay', 'momo']) }),
  avatar: z.object({ file: z.string().regex(/^[a-f0-9]{32}\.webp$/) }),
  certCode: z.object({ code: z.string().max(40) }),
};
const empty = z.object({});
const back = optStr(300);
const quizAnswers = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`q${i}`, optStr(2)]));

module.exports = {
  /** Trang GET không nhận tham số: loại mọi query lạ */
  none: { query: empty },

  // ---------- Xác thực ----------
  auth: {
    register: {
      body: z.object({ name: optStr(200), username: optStr(100), email: optStr(200), password: optStr(200), confirm: optStr(200) }),
    },
    login: { body: z.object({ login: optStr(200), password: optStr(200) }) },
    logout: { body: empty },
  },
  mfa: {
    code: { body: z.object({ code: optStr(40) }) },
    disable: { body: z.object({ password: optStr(200), code: optStr(40) }) },
  },
  adminPin: { submit: { body: z.object({ pin: optStr(200) }) } },

  // ---------- Hồ sơ ----------
  profile: {
    update: { body: z.object({ name: optStr(200), bio: optStr(2000) }) },
    password: { body: z.object({ current: optStr(200), password: optStr(200), confirm: optStr(200) }) },
    avatar: { body: z.object({ remove: flag }) },
    avatarFile: { params: P.avatar, bare: true },
  },

  // ---------- Khóa học, học tập ----------
  courses: {
    list: {
      query: z.object({
        q: qs(200),
        level: qs(30),
        price: q(z.enum(['free', 'paid'])),
        rating: q(z.enum(['3', '4', '4.5'])),
        sort: qs(20),
        page: qs(6),
      }),
    },
    detail: { params: P.slug, query: z.object({ coupon: qs(64), cpage: qs(6) }) },
    learn: { params: P.slug, query: z.object({ lesson: qs(5), retry: qs(5) }) },
    chat: { params: P.slug },
    complete: { params: P.slug, body: z.object({ lessonId: optStr(24), undo: flag }) },
    quiz: { params: P.slug, body: z.object({ lessonId: optStr(24), ...quizAnswers }) },
    noteCreate: { params: P.slug, body: z.object({ lessonId: optStr(24), seconds: optStr(12), text: optStr(4000) }) },
    noteUpdate: { params: P.id, body: z.object({ text: optStr(4000), seconds: optStr(12) }) },
    noteDelete: { params: P.id, body: empty },
    wishlist: { params: P.courseId, body: z.object({ back }) },
  },
  qa: {
    post: { params: P.slug, body: z.object({ lessonId: optStr(24), content: optStr(4000), parent: optStr(24) }) },
    action: { params: P.id, body: empty },
  },
  comments: { create: { params: P.slug, body: z.object({ content: optStr(2000) }) } },
  reviews: {
    review: { params: P.slug, body: z.object({ rating: optStr(2), content: optStr(4000) }) },
    claim: { params: P.slug, body: empty },
    certificate: { params: P.id },
    verifyQuery: { query: z.object({ code: qs(60) }) },
    verifyCode: { params: P.certCode },
  },
  notifications: { open: { params: P.id, body: empty }, readAll: { body: empty } },

  // ---------- Thanh toán ----------
  pay: {
    create: { body: z.object({ courseId: optStr(24), coupon: optStr(64) }) },
    paypalReturn: { query: z.object({ token: qs(100), PayerID: qs(100) }) },
    demoChoose: { params: P.demoRef },
    demoGateway: { params: P.demoGw },
    demoSubmit: { params: P.demoGw, body: z.object({ action: optStr(20), amount: optStr(20), currency: optStr(5) }) },
    invoice: { params: P.id },
  },

  // ---------- Quản trị ----------
  admin: {
    dashboard: { query: z.object({ from: qs(10), to: qs(10) }) },
    courseList: { query: z.object({ status: qs(20) }) },
    courseForm: {
      body: z.object({
        title: optStr(500),
        slug: optStr(200),
        summary: optStr(2000),
        description: optStr(20000),
        level: optStr(30),
        price: optStr(20),
        tag: optStr(100),
        color: optStr(10),
        status: optStr(20),
        intent: optStr(20),
        structure: optStr(900000),
      }),
    },
    courseEdit: { params: P.id },
    courseSave: { params: P.id },
    courseAction: { params: P.id, body: empty },
    courseReject: { params: P.id, body: z.object({ reason: optStr(2000) }) },
    lessonForm: { params: P.courseLesson },
    lessonSave: {
      params: P.courseLesson,
      body: z.object({
        title: optStr(500),
        youtubeId: optStr(300),
        minutes: optStr(10),
        preview: z.enum(['on']).optional(),
        materials: optStr(60000),
        question: list(1000),
        optA: list(1000),
        optB: list(1000),
        optC: list(1000),
        optD: list(1000),
        answer: list(2),
        explain: list(2000),
      }),
    },
    learners: { query: z.object({ q: qs(200), course: qs(24), sort: qs(10), page: qs(6) }) },
    orders: {
      query: z.object({
        q: qs(200),
        status: qs(20),
        course: qs(24),
        method: qs(20),
        from: qs(10),
        to: qs(10),
        sort: qs(10),
        page: qs(6),
      }),
    },
    refund: { params: P.id, body: z.object({ back }) },
    users: { query: z.object({ q: qs(200), role: qs(20), status: qs(20), demo: qs(10), sort: qs(10), page: qs(6) }) },
    userUpdate: { params: P.id, body: z.object({ role: optStr(20), locked: flag, back }) },
    revenueCsv: { query: z.object({ from: qs(10), to: qs(10) }) },
    coupons: { query: empty },
    couponCreate: {
      body: z.object({
        code: optStr(64),
        type: optStr(20),
        value: optStr(20),
        maxUses: optStr(10),
        expiresAt: optStr(30),
        note: optStr(500),
        courses: list(24, 500),
      }),
    },
    couponToggle: { params: P.id, body: z.object({ active: flag }) },
    couponDelete: { params: P.id, body: empty },
    audit: {
      query: z.object({ action: qs(60), user: qs(200), from: qs(10), to: qs(10), ip: qs(64), page: qs(6) }),
    },
    moderation: { query: z.object({ show: qs(10), course: qs(24), q: qs(200), page: qs(6) }) },
    moderate: { params: P.id, body: z.object({ hidden: flag, back }) },
  },
};
