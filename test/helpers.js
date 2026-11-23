// Tiện ích kiểm thử: MongoDB trong bộ nhớ (mongodb-memory-server), nạp app SAU khi kết nối (như server.js),
// tạo dữ liệu, đăng nhập bằng supertest agent (giữ cookie), lấy CSRF token từ HTML.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const PASSWORD = 'TestPass123';
let mongod;

/** Khởi động CSDL tạm + app. env: biến môi trường bổ sung (ví dụ khóa PayPal giả). */
async function setup(env = {}) {
  mongod = await MongoMemoryServer.create();
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: mongod.getUri('cnow_test'),
    SESSION_SECRET: 'test-secret-'.padEnd(48, 'x'),
    BASE_URL: 'http://localhost:3999',
    ...env,
  });
  await mongoose.connect(process.env.MONGODB_URI);
  const { runMigrations } = require('../src/migrations');
  await runMigrations({ log: () => {} });
  const app = require('../src/app');
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // chờ tạo xong index (unique…)
  return app;
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

const hash = bcrypt.hashSync(PASSWORD, 4); // cost thấp cho nhanh – chỉ dùng trong test
const ADMIN_PIN = 'Test-Pin#2026'; // mã quản trị của admin tạo trong test (chỉ tồn tại trong CSDL bộ nhớ)
const pinHash = bcrypt.hashSync(ADMIN_PIN, 4);

async function createUser(username, role = 'user', extra = {}) {
  const { User } = require('../src/models');
  const pin = role === 'admin' ? { adminPinHash: pinHash } : {}; // admin có sẵn mã quản trị (truyền adminPinHash: undefined để bỏ)
  return User.create({ username, name: `Test ${username}`, email: `${username}@test.local`, role, passwordHash: hash, ...pin, ...extra });
}

async function createCourse(fields = {}) {
  const { Course } = require('../src/models');
  return Course.create({
    title: 'Khóa test',
    slug: `khoa-${Math.random().toString(36).slice(2, 8)}`,
    price: 19.99,
    status: 'published',
    sections: [
      {
        title: 'Chương 1',
        lessons: [
          { title: 'Bài 1', minutes: 5, preview: true },
          { title: 'Bài 2', minutes: 5 },
        ],
      },
    ],
    ...fields,
  });
}

/** Lấy CSRF token từ một trang có form. */
async function csrf(agent, path = '/login') {
  const res = await agent.get(path);
  const m = res.text.match(/name="_csrf" value="([0-9a-f]+)"/);
  if (!m) throw new Error(`Không tìm thấy CSRF token ở ${path} (HTTP ${res.status})`);
  return m[1];
}

/** Agent đã đăng nhập (giữ cookie phiên). */
async function login(app, username, password = PASSWORD) {
  const agent = request.agent(app);
  const token = await csrf(agent, '/login');
  const res = await agent.post('/login').type('form').send({ _csrf: token, login: username, password });
  if (res.status !== 302) throw new Error(`Đăng nhập ${username} thất bại: HTTP ${res.status}`);
  if (res.headers.location === '/login/admin-pin') {
    // Admin: bước nhập mã quản trị
    const t2 = await csrf(agent, '/login/admin-pin');
    const r2 = await agent.post('/login/admin-pin').type('form').send({ _csrf: t2, pin: ADMIN_PIN });
    if (r2.status !== 302) throw new Error(`Mã quản trị của ${username} bị từ chối: HTTP ${r2.status}`);
  }
  return agent;
}

/**
 * Thanh toán qua cổng DEMO như trình duyệt: mở trang cổng đã chọn, lấy số tiền/loại tiền trong form, bấm nút.
 * location = URL /pay/demo/<ref> nhận được sau POST /pay. Trả về response của bước bấm nút.
 */
async function demoPay(agent, location, gw = 'paypal', action = 'success', override = {}) {
  const page = await agent.get(`${location}/${gw}`);
  const pick = (name) => (page.text.match(new RegExp(`name="${name}" value="([^"]*)"`)) || [])[1];
  return agent
    .post(`${location}/${gw}`)
    .type('form')
    .send({ _csrf: pick('_csrf'), amount: pick('amount'), currency: pick('currency'), action, ...override });
}

/** Thay global.fetch bằng hàm giả; trả về hàm khôi phục. */
function stubFetch(handler) {
  const original = global.fetch;
  global.fetch = async (url, opts = {}) => handler(String(url), opts) ?? original(url, opts);
  return () => {
    global.fetch = original;
  };
}
const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

module.exports = {
  setup,
  teardown,
  createUser,
  createCourse,
  csrf,
  login,
  demoPay,
  stubFetch,
  jsonResponse,
  PASSWORD,
  ADMIN_PIN,
  request,
};
