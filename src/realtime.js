// Chat realtime theo khóa học (Socket.IO)
// - Xác thực bằng phiên đăng nhập hiện có (express-session dùng chung với HTTP), kiểm tra lại khóa tài khoản/sessionVersion
// - Chỉ nhận kết nối từ đúng origin của website (chống Cross-Site WebSocket Hijacking – WebSocket không có CSRF token)
// - Mỗi khóa học một phòng; vào phòng: học viên đã ghi danh hoặc giảng viên (tác giả khóa học, admin)
// - Lưu 200 tin gần nhất/khóa, chống spam 5 tin/10 giây/người, giảng viên/admin xóa được tin
const { Server } = require('socket.io');
const config = require('./config');
const { User, Course, Enrollment, ChatMessage } = require('./models');
const { isInstructor } = require('./services/access');

const KEEP = 200;
const HISTORY = 100;
const MAX_LEN = 500;
const RATE = { count: 5, windowMs: 10 * 1000 };

const recent = new Map(); // userId → [thời điểm gửi]
function allowed(userId) {
  const now = Date.now();
  const list = (recent.get(userId) || []).filter((t) => now - t < RATE.windowMs);
  if (list.length >= RATE.count) {
    recent.set(userId, list);
    return false;
  }
  list.push(now);
  recent.set(userId, list);
  return true;
}

const clean = (s) =>
  String(s ?? '')
    // eslint-disable-next-line no-control-regex -- cố ý: loại bỏ ký tự điều khiển khỏi tin nhắn
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // bỏ ký tự điều khiển
    .trim();

const shape = (m, user) => ({
  id: String(m._id),
  text: m.deleted ? '' : m.text,
  deleted: m.deleted,
  at: m.createdAt,
  user: user ? { id: String(user._id), name: user.name, role: user.role, demo: Boolean(user.isDemo) } : null,
});

/** Người dùng hiện tại từ phiên của socket (đọc lại mỗi lần để tôn trọng khóa tài khoản / đổi mật khẩu). */
async function currentUser(socket) {
  const sess = socket.request.session;
  if (!sess || !sess.userId) return null;
  const user = await User.findById(sess.userId)
    .select('name role locked sessionVersion')
    .catch(() => null);
  if (!user || user.locked || (user.sessionVersion || 0) !== (sess.ver || 0)) return null;
  return user;
}

function attachRealtime(server, app) {
  const origin = new URL(config.baseUrl).origin;
  const io = new Server(server, {
    serveClient: true, // /socket.io/socket.io.js – cùng origin nên hợp lệ với CSP script-src 'self'
    transports: ['websocket'], // bắt tay WebSocket luôn gửi Origin (yêu cầu polling cùng origin thì có thể không)
    maxHttpBufferSize: 8 * 1024,
    cors: { origin, credentials: true },
    // Chỉ nhận kết nối có Origin đúng website (kể cả WebSocket – CORS không bảo vệ WebSocket)
    allowRequest: (req, cb) => cb(null, req.headers.origin === origin),
  });
  io.engine.use(app.get('sessionMiddleware'));

  io.use(async (socket, next) => {
    const user = await currentUser(socket);
    if (!user) return next(new Error('unauthorized'));
    socket.data.userId = String(user._id);
    next();
  });

  io.on('connection', (socket) => {
    // Vào phòng của một khóa học: trả về lịch sử (100 tin gần nhất) và quyền xóa tin
    socket.on('join', async (slug, ack) => {
      if (typeof ack !== 'function') return;
      const user = await currentUser(socket);
      if (!user) return ack({ error: 'Phiên đăng nhập đã hết hạn.' });
      const course = await Course.findOne({ slug: String(slug || '').slice(0, 100), published: true }).select('title slug author');
      if (!course) return ack({ error: 'Khóa học không tồn tại.' });
      const teacher = isInstructor(user, course);
      if (!teacher && !(await Enrollment.exists({ user: user._id, course: course._id }))) {
        return ack({ error: 'Chỉ học viên đã ghi danh và giảng viên mới vào được phòng chat.' });
      }
      for (const r of socket.rooms) if (r.startsWith('course:')) socket.leave(r);
      const room = `course:${course.id}`;
      socket.join(room);
      Object.assign(socket.data, { courseId: course.id, room });
      const msgs = await ChatMessage.find({ course: course._id })
        .sort({ createdAt: -1 })
        .limit(HISTORY)
        .populate('user', 'name role isDemo');
      ack({ ok: true, canModerate: teacher, me: String(user._id), messages: msgs.reverse().map((m) => shape(m, m.user)) });
    });

    socket.on('message', async (text, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const user = await currentUser(socket);
      if (!user || !socket.data.room) return reply({ error: 'Bạn chưa vào phòng chat.' });
      const body = clean(text);
      if (!body || body.length > MAX_LEN) return reply({ error: `Tin nhắn dài 1–${MAX_LEN} ký tự.` });
      if (!allowed(String(user._id))) return reply({ error: 'Bạn gửi quá nhanh (tối đa 5 tin/10 giây).' });
      const msg = await ChatMessage.create({ course: socket.data.courseId, user: user._id, text: body });
      // Chỉ giữ 200 tin gần nhất của khóa học
      const cutoff = await ChatMessage.find({ course: socket.data.courseId })
        .sort({ createdAt: -1 })
        .skip(KEEP - 1)
        .limit(1)
        .select('createdAt');
      if (cutoff[0]) await ChatMessage.deleteMany({ course: socket.data.courseId, createdAt: { $lt: cutoff[0].createdAt } });
      io.to(socket.data.room).emit('message', shape(msg, user));
      reply({ ok: true });
    });

    socket.on('delete', async (id, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const user = await currentUser(socket);
      if (!user || !socket.data.courseId) return reply({ error: 'Bạn chưa vào phòng chat.' });
      const course = await Course.findById(socket.data.courseId).select('author');
      if (!course || !isInstructor(user, course)) return reply({ error: 'Chỉ giảng viên hoặc quản trị viên mới xóa được tin nhắn.' });
      const r = await ChatMessage.updateOne({ _id: String(id), course: course._id }, { $set: { deleted: true } }).catch(() => null);
      if (!r || !r.matchedCount) return reply({ error: 'Không tìm thấy tin nhắn.' });
      io.to(socket.data.room).emit('deleted', String(id));
      reply({ ok: true });
    });
  });
  return io;
}

module.exports = { attachRealtime, KEEP, RATE, MAX_LEN };
