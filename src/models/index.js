const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// Chống NoSQL injection ở tầng ORM:
// - sanitizeFilter: mọi object có khóa "$…" trong bộ lọc bị bọc thành { $eq: … } (vd. ?login[$ne]= không còn là toán tử).
//   Toán tử do CODE tạo ra phải đánh dấu tường minh bằng mongoose.trusted({ $in: … }).
// - strictQuery: bỏ qua điều kiện lọc theo trường không có trong schema.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// ---------- Người dùng: 3 vai trò theo phân tích yêu cầu ----------
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9_.]{3,30}$/ },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'collaborator', 'admin'], default: 'user' },
    locked: { type: Boolean, default: false }, // xử lý vi phạm
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Course' }], // khóa học yêu thích
    bio: { type: String, trim: true, maxlength: 500 },
    avatar: { type: String, match: /^[a-f0-9]{32}\.webp$/ }, // tên file ngẫu nhiên trong GridFS (bucket avatars)
    // Tăng mỗi khi đổi mật khẩu → mọi phiên đăng nhập cũ (lưu ver khác) bị hủy ở middleware loadUser
    sessionVersion: { type: Number, default: 0 },
    passwordChangedAt: Date,
    // Xác thực hai lớp (TOTP): bí mật được mã hóa AES-256-GCM (services/mfa.js); mã khôi phục chỉ lưu hash
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaLastStep: { type: Number, default: 0 }, // bước 30 giây của mã đã dùng gần nhất (chống dùng lại mã)
    mfaRecovery: { type: [{ _id: false, hash: String, usedAt: Date }], select: false },
    mfaEnabledAt: Date,
    // Mã quản trị (bước xác thực thứ hai bắt buộc của admin khi chưa bật TOTP). Chỉ lưu hash bcrypt, đặt bằng `npm run set:admin-pin`.
    adminPinHash: { type: String, select: false },
    adminPinSetAt: Date,
    adminPinFails: { type: [Date], default: undefined }, // các lần nhập sai trong 15 phút gần nhất (giữ lượt nguyên tử)
    adminPinLockedUntil: Date,
    // HMAC của các IP đã từng đăng nhập (không lưu IP gốc) – để báo "đăng nhập từ IP mới"
    knownIpHashes: { type: [String], default: undefined, select: false },
    deletedAt: Date, // người dùng tự xóa tài khoản → hồ sơ đã ẩn danh hóa
  },
  { timestamps: true },
);

// ---------- Khóa học ----------
const quizItemSchema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 500 },
    options: { type: [{ type: String, trim: true, maxlength: 300 }], validate: (v) => v.length === 4 && v.every(Boolean) },
    answer: { type: Number, required: true, min: 0, max: 3 },
    explain: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

// _id của bài học được GIỮ NGUYÊN khi sửa khóa học (trình dựng chương/bài gửi kèm id) → dùng làm khóa cho tiến độ, ghi chú…
const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    youtubeId: { type: String, trim: true, match: /^[A-Za-z0-9_-]{11}$/ },
    minutes: { type: Number, min: 0, default: 10 },
    preview: { type: Boolean, default: false }, // bài học thử miễn phí
    // Ghi công tác giả video (lấy từ YouTube oEmbed bởi scripts/import-videos.js)
    sourceName: { type: String, trim: true, maxlength: 120 }, // tên kênh
    sourceUrl: { type: String, trim: true, maxlength: 200, match: /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\// }, // link gốc
    license: { type: String, trim: true, maxlength: 120 },
    materials: { type: String, maxlength: 40000 }, // Tài liệu Markdown (render + lọc XSS bằng services/markdown.js)
    quiz: [quizItemSchema], // Trắc nghiệm cuối bài – đáp án KHÔNG BAO GIỜ gửi xuống trình duyệt trước khi nộp
  },
  { _id: true },
);

// Chương: nhóm các bài học theo thứ tự
const sectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    lessons: [lessonSchema],
  },
  { _id: true },
);

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9-]+$/ },
    summary: { type: String, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 5000 },
    level: { type: String, enum: ['Cơ bản', 'Trung cấp', 'Nâng cao'], default: 'Cơ bản' },
    price: { type: Number, required: true, min: 0, max: 10000 }, // USD
    color: { type: String, default: '#f05123', match: /^#[0-9a-fA-F]{6}$/ },
    tag: { type: String, trim: true, maxlength: 20 },
    sections: [sectionSchema],
    ratingAvg: { type: Number, default: 0 }, // tính lại từ Review mỗi khi có đánh giá mới/sửa
    ratingCount: { type: Number, default: 0 },
    // Quy trình duyệt: Nháp → Chờ duyệt → Đã xuất bản (hoặc Bị từ chối kèm lý do). `published` được đồng bộ từ status.
    status: { type: String, enum: ['draft', 'pending', 'published', 'rejected'], default: 'published' },
    rejectReason: { type: String, trim: true, maxlength: 500 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    published: { type: Boolean, default: true }, // = (status === 'published'); mọi truy vấn công khai lọc theo trường này
    author: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
courseSchema.pre('validate', function () {
  if (this.isNew || this.isModified('status')) this.published = this.status === 'published';
});
courseSchema.statics.STATUS_LABELS = { draft: 'Nháp', pending: 'Chờ duyệt', published: 'Đã xuất bản', rejected: 'Bị từ chối' };
// Danh sách bài học phẳng theo thứ tự chương → bài. Trang học truy cập bài theo CHỈ SỐ trong danh sách này (?lesson=i).
courseSchema.virtual('lessons').get(function () {
  return (this.sections || []).flatMap((s) => s.lessons);
});
courseSchema.methods.findLesson = function (id) {
  const i = this.lessons.findIndex((l) => String(l._id) === String(id));
  return i < 0 ? null : { lesson: this.lessons[i], index: i };
};
courseSchema.virtual('totalMinutes').get(function () {
  return this.lessons.reduce((s, l) => s + (l.minutes || 0), 0);
});
// Index cho các truy vấn hay dùng: danh sách /courses (lọc + sắp xếp), trang quản trị theo tác giả/trạng thái
courseSchema.index({ published: 1, createdAt: -1 });
courseSchema.index({ published: 1, price: 1 });
courseSchema.index({ published: 1, ratingAvg: -1, ratingCount: -1 });
courseSchema.index({ author: 1, status: 1 });

// ---------- Đơn hàng / hóa đơn thanh toán ----------
const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    amount: { type: String, required: true }, // chuỗi "19.99" đúng định dạng PayPal
    currency: { type: String, default: 'USD' },
    // paypal = PayPal thật; demo = cổng mô phỏng (PAYMENT_MODE=demo); mock = PayPal mô phỏng đời cũ (đơn cũ); free = 0đ
    provider: { type: String, enum: ['paypal', 'demo', 'mock', 'free'], required: true },
    gateway: { type: String, enum: ['paypal', 'vnpay', 'momo'] }, // cổng demo người dùng chọn
    amountVnd: Number, // số tiền quy đổi VND (tỉ giá DEMO lúc tạo đơn) – cổng VNPay/MoMo demo tính bằng VND
    providerOrderId: { type: String, unique: true, sparse: true },
    captureId: String,
    payerEmail: String,
    status: { type: String, enum: ['CREATED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'], default: 'CREATED', index: true },
    failureReason: String,
    refundedAt: Date,
    refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // Mã giảm giá đã dùng (amount ở trên là số tiền SAU giảm, tính ở server)
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: String,
    originalAmount: String, // giá gốc "19.99"
    discount: String, // số tiền được giảm "5.00"
    couponReleased: { type: Boolean, default: false }, // đã trả lại lượt dùng khi đơn hủy/thất bại
  },
  { timestamps: true },
);
orderSchema.index({ createdAt: -1 }); // danh sách đơn mới nhất, thống kê theo khoảng ngày
orderSchema.index({ course: 1, status: 1, createdAt: -1 }); // doanh thu theo khóa học
orderSchema.index({ user: 1, createdAt: -1 }); // lịch sử thanh toán của người học

// ---------- Mã giảm giá ----------
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,32}$/ },
    type: { type: String, enum: ['percent', 'amount'], required: true }, // % hoặc số tiền USD
    value: { type: Number, required: true, min: 0.01, max: 10000 },
    expiresAt: Date, // để trống = không hết hạn
    maxUses: { type: Number, min: 1 }, // để trống = không giới hạn
    usedCount: { type: Number, default: 0, min: 0 },
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }], // rỗng = áp dụng mọi khóa có phí
    active: { type: Boolean, default: true },
    note: { type: String, trim: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
couponSchema.pre('validate', function () {
  if (this.type === 'percent' && this.value > 100) this.invalidate('value', 'Phần trăm giảm tối đa 100');
});

// ---------- Ghi danh: quyền vào học ----------
const enrollmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true },
);
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, createdAt: -1 }); // người học theo khóa, thống kê ghi danh

// ---------- Tiến độ học: tham chiếu bài học bằng lesson._id (ổn định khi sửa khóa học) ----------
const progressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    completedLessons: [{ type: Schema.Types.ObjectId }],
    lastLesson: { type: Schema.Types.ObjectId },
    // Kết quả trắc nghiệm gần nhất của từng bài; passed = đã từng đạt ≥ 70%
    quizResults: [
      new Schema(
        {
          lesson: { type: Schema.Types.ObjectId, required: true },
          correct: Number,
          total: Number,
          pct: Number,
          passed: { type: Boolean, default: false },
          answers: [Number], // lựa chọn của người học ở lần nộp gần nhất (-1 = bỏ trống)
          at: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    ],
    // Các lần nộp trắc nghiệm trong 1 giờ gần nhất (giới hạn làm lại; bản ghi cũ hơn 1 giờ bị dọn khi nộp)
    quizAttempts: [
      new Schema({ lesson: { type: Schema.Types.ObjectId, required: true }, at: { type: Date, required: true } }, { _id: false }),
    ],
  },
  { timestamps: true },
);
progressSchema.index({ user: 1, course: 1 }, { unique: true });

// ---------- Ghi chú cá nhân theo mốc thời gian video ----------
const noteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, required: true },
    seconds: { type: Number, min: 0, max: 86400, default: 0 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);
noteSchema.index({ user: 1, course: 1, lesson: 1, seconds: 1 });

// ---------- Đánh giá khóa học: mỗi học viên 1 đánh giá, sửa được ----------
const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);
reviewSchema.index({ user: 1, course: 1 }, { unique: true });
reviewSchema.index({ course: 1, updatedAt: -1 });

// ---------- Chứng nhận hoàn thành: lưu ảnh chụp tên người học + tên khóa tại thời điểm cấp ----------
const certificateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    code: { type: String, required: true, unique: true, match: /^[0-9A-F]{16}$/ }, // mã xác thực ngẫu nhiên
    name: { type: String, required: true },
    courseTitle: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
certificateSchema.index({ user: 1, course: 1 }, { unique: true });
certificateSchema.virtual('displayCode').get(function () {
  return this.code.match(/.{4}/g).join('-');
});

// ---------- Hỏi – Đáp theo bài học (thay cho bình luận chung) ----------
// parent = null: câu hỏi; parent = id câu hỏi: câu trả lời (chỉ lồng 1 cấp)
const postSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    hidden: { type: Boolean, default: false }, // kiểm duyệt
    votes: [{ type: Schema.Types.ObjectId, ref: 'User' }], // người học bấm "Hữu ích"
    best: { type: Boolean, default: false }, // giảng viên đánh dấu câu trả lời hay nhất
  },
  { timestamps: true },
);
postSchema.index({ course: 1, lesson: 1, parent: 1, createdAt: -1 });
postSchema.index({ parent: 1 });
postSchema.index({ user: 1, createdAt: -1 }); // giới hạn số bài viết/giờ

// ---------- Thông báo (chuông trên thanh menu); tự xóa sau 90 ngày ----------
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['qa_reply', 'new_lesson', 'payment', 'refund', 'security'], required: true },
    text: { type: String, required: true, maxlength: 300 },
    link: { type: String, maxlength: 300, match: /^\/(?!\/)/ }, // chỉ đường dẫn nội bộ
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

// ---------- Chat theo khóa học (Socket.IO): mỗi khóa giữ 200 tin gần nhất ----------
const chatMessageSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
chatMessageSchema.index({ course: 1, createdAt: -1 });

// ---------- Nhật ký bảo mật (audit log) – KHÔNG BAO GIỜ ghi mật khẩu, token, dữ liệu thẻ ----------
const AUDIT_ACTIONS = {
  'login.success': 'Đăng nhập thành công',
  'login.failure': 'Đăng nhập thất bại',
  'login.locked': 'Đăng nhập bị chặn (tài khoản khóa)',
  'login.rate_limited': 'Đăng nhập bị giới hạn (sai quá nhiều)',
  'password.change': 'Đổi mật khẩu',
  'password.change_failed': 'Đổi mật khẩu thất bại (sai mật khẩu cũ)',
  'mfa.enable': 'Bật 2FA',
  'mfa.disable': 'Tắt 2FA',
  'mfa.recovery_regenerated': 'Tạo lại mã khôi phục 2FA',
  'mfa.recovery_used': 'Đăng nhập bằng mã khôi phục 2FA',
  'mfa.failure': 'Nhập sai mã 2FA',
  'login.new_ip': 'Đăng nhập từ địa chỉ IP mới',
  'session.revoke': 'Đăng xuất phiên từ xa',
  'session.expired': 'Phiên hết hạn (không hoạt động / quá hạn tuyệt đối)',
  'data.export': 'Tải dữ liệu cá nhân',
  'account.delete': 'Tự xóa tài khoản',
  'export.csv': 'Xuất dữ liệu CSV (quản trị)',
  ADMIN_PIN_OK: 'Mã quản trị đúng',
  ADMIN_PIN_FAIL: 'Nhập sai mã quản trị',
  ADMIN_PIN_LOCKED: 'Khóa bước nhập mã quản trị (sai quá nhiều)',
  'user.role_change': 'Đổi vai trò',
  'user.lock': 'Khóa tài khoản',
  'user.unlock': 'Mở khóa tài khoản',
  'order.refund': 'Hoàn tiền',
  'course.approve': 'Duyệt khóa học',
  'course.reject': 'Từ chối khóa học',
  'coupon.create': 'Tạo mã giảm giá',
  'coupon.update': 'Bật/tắt mã giảm giá',
  'coupon.delete': 'Xóa mã giảm giá',
};
const auditLogSchema = new Schema(
  {
    action: { type: String, enum: Object.keys(AUDIT_ACTIONS), required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' }, // người thực hiện (null nếu chưa đăng nhập)
    target: { type: Schema.Types.ObjectId, ref: 'User' }, // tài khoản bị tác động
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 200 },
    meta: { type: Schema.Types.Mixed }, // chỉ các khóa trong whitelist của services/audit.js
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ target: 1, createdAt: -1 });

// ---------- Bình luận khóa học (CŨ – chỉ giữ để migration sang Hỏi – Đáp, không còn dùng) ----------
const commentSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    hidden: { type: Boolean, default: false },
    migrated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ---------- Phiên đăng nhập đang hoạt động (trang "Phiên đăng nhập", đăng xuất từ xa) ----------
const userSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sid: { type: String, required: true, select: false }, // id phiên trong store – chỉ dùng để hủy phiên, không bao giờ hiển thị
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 200 },
    lastSeen: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // = hạn tuyệt đối của phiên; TTL tự dọn
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
userSessionSchema.index({ user: 1, lastSeen: -1 });
userSessionSchema.index({ sid: 1 }, { unique: true });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------- Bình luận ngắn theo khóa học (cảm nhận, góp ý, hỏi nhanh) – hiển thị ở trang khóa học, admin ẩn được ----------
const courseCommentSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    hidden: { type: Boolean, default: false }, // kiểm duyệt
  },
  { timestamps: true },
);
courseCommentSchema.index({ course: 1, hidden: 1, createdAt: -1 });
courseCommentSchema.index({ user: 1, createdAt: -1 }); // giới hạn số bình luận/giờ
courseCommentSchema.index({ createdAt: -1 }); // trang kiểm duyệt

// ---------- Dữ liệu mẫu: mọi bản ghi do `npm run seed:demo` tạo có isDemo = true để xóa sạch bằng `unseed:demo`
// và hiển thị nhãn "Dữ liệu mẫu". Index sparse: chỉ chứa bản ghi demo, không tốn chỗ cho dữ liệu thật.
for (const s of [
  userSchema,
  orderSchema,
  couponSchema,
  enrollmentSchema,
  progressSchema,
  reviewSchema,
  certificateSchema,
  postSchema,
  courseCommentSchema,
  notificationSchema,
  chatMessageSchema,
  auditLogSchema,
]) {
  s.add({ isDemo: { type: Boolean } });
  s.index({ isDemo: 1 }, { sparse: true });
}

// Index cho các trang quản trị có lọc/sắp xếp/phân trang
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ locked: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ gateway: 1, createdAt: -1 });
enrollmentSchema.index({ createdAt: -1 });
enrollmentSchema.index({ user: 1, createdAt: -1 });

module.exports = {
  UserSession: model('UserSession', userSessionSchema),
  CourseComment: model('CourseComment', courseCommentSchema),
  User: model('User', userSchema),
  Course: model('Course', courseSchema),
  Order: model('Order', orderSchema),
  Enrollment: model('Enrollment', enrollmentSchema),
  Progress: model('Progress', progressSchema),
  Note: model('Note', noteSchema),
  Comment: model('Comment', commentSchema),
  Post: model('Post', postSchema),
  Review: model('Review', reviewSchema),
  Certificate: model('Certificate', certificateSchema),
  AuditLog: model('AuditLog', auditLogSchema),
  ChatMessage: model('ChatMessage', chatMessageSchema),
  Notification: model('Notification', notificationSchema),
  Coupon: model('Coupon', couponSchema),
  AUDIT_ACTIONS,
};
