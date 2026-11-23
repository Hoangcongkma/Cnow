// Gia cố hạ tầng: CSP có nonce (không 'unsafe-*'), các header bảo mật, security.txt, healthz tối giản,
// rate limit theo nhóm lưu trong MongoDB (không mất khi khởi động lại), xử lý lỗi không lộ stack, upload, Socket.IO
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, request } = require('./helpers');

let app;
before(async () => {
  app = await setup();
  await createUser('hocvien');
  await createUser('quantri', 'admin');
  await createCourse({ slug: 'khoa-header', price: 0 });
});
after(teardown);

test('CSP nghiêm ngặt: nonce mới mỗi request, mọi <script> đều có đúng nonce, không unsafe-*, chặn framing/object/base', async () => {
  const pages = ['/', '/courses', '/courses/khoa-header', '/login', '/chinh-sach-bao-mat', '/khong-ton-tai'];
  const nonces = new Set();
  for (const p of pages) {
    const res = await request(app).get(p);
    const csp = res.headers['content-security-policy'];
    const nonce = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/)[1];
    nonces.add(nonce);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|unsafe-hashes/, p);
    for (const d of ["'strict-dynamic'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "script-src-attr 'none'"]) {
      assert.ok(csp.includes(d), `${p}: ${d}`);
    }
    const scripts = [...res.text.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    assert.ok(scripts.length >= 2, p);
    for (const s of scripts) assert.ok(s.includes(`nonce="${nonce}"`), `${p}: ${s}`);
    assert.doesNotMatch(res.text, /<script(?![^>]*\bsrc=)[^>]*>\s*\S/, `${p}: không có script nội tuyến`);
    assert.doesNotMatch(res.text, /\son[a-z]+="/i, `${p}: không có thuộc tính sự kiện nội tuyến`);
  }
  assert.equal(nonces.size, pages.length, 'mỗi request một nonce khác nhau');
  const admin = await login(app, 'quantri');
  const dash = await admin.get('/admin');
  const n = dash.headers['content-security-policy'].match(/'nonce-([^']+)'/)[1];
  assert.equal(
    (dash.text.match(new RegExp(`nonce="${n.replace(/[+/=]/g, '\\$&')}"`, 'g')) || []).length,
    4,
    'theme + chart + admin-charts + app',
  );
});

test('header bảo mật: Referrer-Policy, Permissions-Policy, COOP, CORP, nosniff; không HSTS khi chưa phải production', async () => {
  const res = await request(app).get('/');
  assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.match(res.headers['permissions-policy'], /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/);
  assert.equal(res.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(res.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['strict-transport-security'], undefined);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('/.well-known/security.txt theo RFC 9116; /healthz không lộ phiên bản / thời gian chạy', async () => {
  const res = await request(app).get('/.well-known/security.txt');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/plain/);
  for (const f of ['Contact:', 'Expires:', 'Preferred-Languages: vi, en', 'Canonical: http://localhost:3999/.well-known/security.txt']) {
    assert.ok(res.text.includes(f), f);
  }
  const exp = new Date(res.text.match(/Expires: (\S+)/)[1]);
  assert.ok(exp > new Date() && exp < new Date(Date.now() + 366 * 24 * 3600 * 1000), 'Expires trong vòng 1 năm');
  const h = await request(app).get('/healthz');
  assert.deepEqual(h.body, { status: 'ok', db: 'up' });
});

test('rate limit theo nhóm lưu trong MongoDB: đăng ký 10/giờ/IP; bộ đếm còn nguyên với một tiến trình/instance mới', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent, '/register');
  let last;
  for (let i = 0; i < 11; i++) {
    last = await agent
      .post('/register')
      .type('form')
      .send({ _csrf: token, name: 'X', username: 'x', email: 'x', password: 'a', confirm: 'b' });
  }
  assert.equal(last.status, 429);
  const { MongoRateStore } = require('../src/security/rate-limit');
  const store = new MongoRateStore('register'); // giống store sau khi server khởi động lại
  store.init({ windowMs: 60 * 60 * 1000 });
  const docs = await require('mongoose')
    .connection.collection('ratelimits')
    .find({ _id: /^register:/ })
    .toArray();
  assert.ok(docs.length >= 1);
  const r = await store.increment(docs[0]._id.slice('register:'.length));
  assert.ok(r.totalHits >= 12, `bộ đếm tiếp tục từ CSDL (${r.totalHits})`);
  const idx = await require('mongoose').connection.collection('ratelimits').indexes();
  assert.ok(
    idx.some((i) => i.key.resetAt === 1 && i.expireAfterSeconds === 0),
    'TTL index tự dọn',
  );
});

test('rate limit xuất dữ liệu: quá 20 lần/giờ/người → 429', async () => {
  const admin = await login(app, 'quantri');
  let last;
  for (let i = 0; i < 21; i++) last = await admin.get('/admin/export/users.csv');
  assert.equal(last.status, 429);
  assert.match(last.text, /xuất dữ liệu quá nhiều lần/);
});

test('xử lý lỗi tập trung: lỗi máy chủ → 500 thông báo chung, không stack trace; body hỏng / quá lớn → 4xx', async () => {
  const { Course } = require('../src/models');
  const orig = Course.find;
  Course.find = () => {
    throw new Error('Mất kết nối MongoDB tại /srv/secret/path.js:42');
  };
  const errLog = console.error;
  console.error = () => {};
  try {
    const res = await request(app).get('/courses');
    assert.equal(res.status, 500);
    assert.match(res.text, /Đã có lỗi xảy ra/);
    assert.doesNotMatch(res.text, /secret|\.js:\d+|at [A-Za-z.]+ \(|MongoDB tại/);
  } finally {
    Course.find = orig;
    console.error = errLog;
  }
  const agent = request.agent(app);
  const token = await csrf(agent);
  const big = await agent
    .post('/login')
    .type('form')
    .send(`_csrf=${token}&login=${'a'.repeat(60 * 1024)}`);
  assert.equal(big.status, 413);
  assert.doesNotMatch(big.text, /PayloadTooLargeError|at /);
  const bad = await request(app).get('/courses/%E0%A4%A');
  assert.ok(bad.status === 400 || bad.status === 404, `URI hỏng → ${bad.status}`);
});

test('Socket.IO giới hạn kích thước gói 4 KB', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'realtime.js'), 'utf8');
  assert.match(src, /maxHttpBufferSize: 4 \* 1024/);
});
