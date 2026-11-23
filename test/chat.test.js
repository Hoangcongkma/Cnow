// Chat Socket.IO: xác thực bằng phiên, kiểm tra Origin, quyền vào phòng, chống spam, xóa tin, giữ 200 tin
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { io: connect } = require('socket.io-client');
const { setup, teardown, createUser, createCourse, csrf, request, PASSWORD } = require('./helpers');

let app;
let server;
let url;
let course;
const ORIGIN = 'http://localhost:3999'; // = BASE_URL trong test
const sockets = [];

before(async () => {
  app = await setup();
  server = http.createServer(app);
  require('../src/realtime').attachRealtime(server, app);
  await new Promise((r) => server.listen(0, r));
  url = `http://127.0.0.1:${server.address().port}`;
  const ctv = await createUser('giangvien', 'collaborator');
  course = await createCourse({ author: ctv._id, slug: 'khoa-chat' });
  const { Enrollment } = require('../src/models');
  for (const u of ['hocvien1', 'hocvien2']) {
    const user = await createUser(u);
    await Enrollment.create({ user: user._id, course: course._id });
  }
  await createUser('nguoila');
});
after(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => server.close(r));
  await teardown();
});

/** Đăng nhập bằng HTTP, trả về chuỗi cookie phiên. */
async function cookieOf(username) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const res = await agent.post('/login').type('form').send({ _csrf: token, login: username, password: PASSWORD });
  return res.headers['set-cookie'].find((c) => c.startsWith('cnow.sid=')).split(';')[0];
}

function open(cookie, origin = ORIGIN) {
  const s = connect(url, {
    transports: ['websocket'],
    extraHeaders: { ...(cookie ? { cookie } : {}), origin },
    reconnection: false,
    forceNew: true,
  });
  sockets.push(s);
  return new Promise((resolve) => {
    s.on('connect', () => resolve({ s, ok: true }));
    s.on('connect_error', (e) => resolve({ s, ok: false, error: e.message }));
  });
}
const emit = (s, ev, ...args) => new Promise((r) => s.emit(ev, ...args, r));
const nextEvent = (s, ev, ms = 2000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`không nhận được ${ev}`)), ms);
    s.once(ev, (d) => {
      clearTimeout(t);
      resolve(d);
    });
  });

test('chưa đăng nhập hoặc sai Origin → không kết nối được', async () => {
  assert.equal((await open(null)).ok, false);
  const cookie = await cookieOf('hocvien1');
  const bad = await open(cookie, 'https://evil.example.com');
  assert.equal(bad.ok, false, 'chặn Cross-Site WebSocket Hijacking');
  assert.equal((await open(cookie)).ok, true);
});

test('người chưa ghi danh không vào được phòng; học viên vào được và nhận lịch sử', async () => {
  const { s: stranger } = await open(await cookieOf('nguoila'));
  const r1 = await emit(stranger, 'join', course.slug);
  assert.match(r1.error, /ghi danh/);
  const r2 = await emit(stranger, 'message', 'chen ngang');
  assert.match(r2.error, /chưa vào phòng/);
  const { s } = await open(await cookieOf('hocvien1'));
  const r3 = await emit(s, 'join', course.slug);
  assert.equal(r3.ok, true);
  assert.equal(r3.canModerate, false);
  assert.ok(Array.isArray(r3.messages));
});

test('tin nhắn tới mọi người trong phòng, lưu CSDL nguyên văn (client hiển thị bằng textContent)', async () => {
  const { ChatMessage } = require('../src/models');
  const { s: a } = await open(await cookieOf('hocvien1'));
  const { s: b } = await open(await cookieOf('hocvien2'));
  await emit(a, 'join', course.slug);
  await emit(b, 'join', course.slug);
  const got = nextEvent(b, 'message');
  const text = 'Xin chào <img src=x onerror=alert(1)>';
  assert.deepEqual(await emit(a, 'message', `  ${text}\u0007 `), { ok: true });
  const m = await got;
  assert.equal(m.text, text, 'đã bỏ khoảng trắng và ký tự điều khiển');
  assert.equal(m.user.name, 'Test hocvien1');
  assert.ok(await ChatMessage.exists({ text }));
  const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'chat.js'), 'utf8');
  assert.doesNotMatch(client, /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\(/, 'chat.js không dùng innerHTML');
  assert.match((await emit(a, 'message', 'x'.repeat(501))).error, /1–500/);
});

test('chống spam: tối đa 5 tin trong 10 giây', async () => {
  const { s } = await open(await cookieOf('hocvien2'));
  await emit(s, 'join', course.slug);
  const results = [];
  for (let i = 0; i < 6; i++) results.push(await emit(s, 'message', `tin ${i}`));
  // hocvien2 chưa gửi tin nào trước đó trong 10 giây
  assert.equal(results.filter((r) => r.ok).length, 5);
  assert.match(results[5].error, /quá nhanh/);
});

test('chỉ giảng viên (tác giả khóa học) xóa được tin; mọi người nhận sự kiện xóa', async () => {
  const { ChatMessage } = require('../src/models');
  const msg = await ChatMessage.findOne({ course: course._id });
  const { s: student } = await open(await cookieOf('hocvien1'));
  await emit(student, 'join', course.slug);
  assert.match((await emit(student, 'delete', String(msg._id))).error, /giảng viên/);
  const { s: teacher } = await open(await cookieOf('giangvien'));
  const j = await emit(teacher, 'join', course.slug);
  assert.equal(j.canModerate, true, 'giảng viên vào phòng không cần ghi danh, có quyền xóa');
  const seen = nextEvent(student, 'deleted');
  assert.deepEqual(await emit(teacher, 'delete', String(msg._id)), { ok: true });
  assert.equal(await seen, String(msg._id));
  assert.equal((await ChatMessage.findById(msg._id)).deleted, true);
});

test('chỉ giữ 200 tin gần nhất của mỗi khóa', async () => {
  const { ChatMessage, User } = require('../src/models');
  const u = await User.findOne({ username: 'hocvien1' });
  const t0 = Date.now() - 3600e3;
  await ChatMessage.insertMany(
    Array.from({ length: 210 }, (_, i) => ({ course: course._id, user: u._id, text: `cũ ${i}`, createdAt: new Date(t0 + i * 1000) })),
  );
  await createUser('hocvien3');
  const { Enrollment } = require('../src/models');
  await Enrollment.create({ user: (await User.findOne({ username: 'hocvien3' }))._id, course: course._id });
  const { s } = await open(await cookieOf('hocvien3'));
  await emit(s, 'join', course.slug);
  await emit(s, 'message', 'tin mới nhất');
  assert.equal(await ChatMessage.countDocuments({ course: course._id }), 200);
  assert.ok(await ChatMessage.exists({ text: 'tin mới nhất' }));
  assert.equal(await ChatMessage.exists({ text: 'cũ 0' }), null, 'tin cũ nhất đã bị xóa');
});

test('tài khoản bị khóa giữa chừng → không gửi được tin nữa', async () => {
  const { User } = require('../src/models');
  const { s } = await open(await cookieOf('hocvien1'));
  await emit(s, 'join', course.slug);
  await User.updateOne({ username: 'hocvien1' }, { locked: true });
  assert.match((await emit(s, 'message', 'còn gửi được không?')).error, /chưa vào phòng|hết hạn/);
});
