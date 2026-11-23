// Các bản vá sau đợt rà soát bảo mật (OWASP Top 10): cấu hình an toàn mặc định đóng, phiên khách, giới hạn theo tài khoản, ảnh lớn, CSP
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { setup, teardown, createUser, csrf, login, request, PASSWORD } = require('./helpers');

// Nạp config.js trong tiến trình riêng với biến môi trường cho trước
function loadConfig(env) {
  const code =
    "const c=require('./src/config');process.stdout.write(JSON.stringify({demo:c.demo,paypal:c.paypal.configured,isLocal:c.isLocal,https:c.isHttps,proxy:c.trustProxy}))";
  try {
    const out = execFileSync(process.execPath, ['-e', code], {
      cwd: path.join(__dirname, '..'),
      // Đặt rỗng mọi biến liên quan: dotenv không ghi đè biến đã tồn tại → kết quả không phụ thuộc file .env trên máy
      env: {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        SESSION_SECRET: '',
        PAYPAL_CLIENT_ID: '',
        PAYPAL_CLIENT_SECRET: '',
        PAYPAL_MODE: '',
        PAYMENT_MODE: '',
        DEMO_USD_VND: '',
        BASE_URL: '',
        MONGODB_URI: '',
        TRUST_PROXY: '',
        NODE_ENV: 'test',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, ...JSON.parse(String(out)) };
  } catch (e) {
    return { ok: false, error: String(e.stderr) };
  }
}

test('config: NODE_ENV lạ → không khởi động', () => {
  const r = loadConfig({ NODE_ENV: 'staging' });
  assert.equal(r.ok, false);
  assert.match(r.error, /- NODE_ENV: chỉ chấp nhận development, test hoặc production/);
});

test('config: server công khai (BASE_URL không phải localhost) thiếu SESSION_SECRET → không khởi động', () => {
  const r = loadConfig({ NODE_ENV: 'development', BASE_URL: 'https://cnow.example.com' });
  assert.equal(r.ok, false);
  assert.match(r.error, /SESSION_SECRET/);
});

test('config: mặc định PAYMENT_MODE=demo; server công khai: cookie secure theo HTTPS', () => {
  const r = loadConfig({ NODE_ENV: 'development', BASE_URL: 'https://cnow.example.com', SESSION_SECRET: 'x'.repeat(40) });
  assert.deepEqual(r, { ok: true, demo: true, paypal: false, isLocal: false, https: true, proxy: false });
});

test('config: production + PAYMENT_MODE=demo chạy được KHÔNG cần biến PAYPAL_*; trust proxy bật', () => {
  const r = loadConfig({
    NODE_ENV: 'production',
    BASE_URL: 'https://cnow.example.com',
    MONGODB_URI: 'mongodb://db.example/cnow',
    SESSION_SECRET: 'x'.repeat(40),
  });
  assert.deepEqual(r, { ok: true, demo: true, paypal: false, isLocal: false, https: true, proxy: true });
});

test('config: PAYMENT_MODE lạ / DEMO_USD_VND sai → không khởi động; PAYMENT_MODE=paypal ở production cần khóa + PAYPAL_MODE', () => {
  assert.match(loadConfig({ PAYMENT_MODE: 'free' }).error, /- PAYMENT_MODE: chỉ chấp nhận demo hoặc paypal/);
  assert.match(loadConfig({ DEMO_USD_VND: '26.5' }).error, /DEMO_USD_VND/);
  const prod = {
    NODE_ENV: 'production',
    BASE_URL: 'https://cnow.example.com',
    MONGODB_URI: 'mongodb://db.example/cnow',
    SESSION_SECRET: 'x'.repeat(40),
    PAYMENT_MODE: 'paypal',
  };
  assert.match(loadConfig(prod).error, /PAYPAL_CLIENT_ID/);
  assert.match(loadConfig({ ...prod, PAYPAL_CLIENT_ID: 'a', PAYPAL_CLIENT_SECRET: 'b' }).error, /PAYPAL_MODE/);
  const ok = loadConfig({ ...prod, PAYPAL_CLIENT_ID: 'a', PAYPAL_CLIENT_SECRET: 'b', PAYPAL_MODE: 'sandbox' });
  assert.deepEqual([ok.ok, ok.demo, ok.paypal], [true, false, true]);
});

let app;
before(async () => {
  app = await setup({ TRUST_PROXY: '1' }); // để giả lập nhiều IP bằng X-Forwarded-For
  await createUser('nannhan');
  await createUser('nguoidung');
});
after(teardown);

test('phiên của khách chưa đăng nhập hết hạn sau khoảng 2 giờ; đăng nhập → phiên 7 ngày', async () => {
  const res = await request(app).get('/login');
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('cnow.sid='));
  const hours = (new Date(cookie.match(/Expires=([^;]+)/)[1]) - Date.now()) / 3600e3;
  assert.ok(hours > 1.9 && hours <= 2.01, `phiên khách ~2 giờ (thực tế ${hours.toFixed(2)})`);
  const agent = request.agent(app);
  const token = await csrf(agent);
  const r = await agent.post('/login').type('form').send({ _csrf: token, login: 'nguoidung', password: PASSWORD });
  const c2 = r.headers['set-cookie'].find((c) => c.startsWith('cnow.sid='));
  const days = (new Date(c2.match(/Expires=([^;]+)/)[1]) - Date.now()) / 86400e3;
  assert.ok(days > 6.9, `phiên đăng nhập ~7 ngày (thực tế ${days.toFixed(2)})`);
});

test('dò mật khẩu 1 tài khoản từ nhiều IP: sau 5 lần sai bị khóa theo tài khoản (lũy tiến)', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent);
  for (let i = 0; i < 5; i++) {
    const r = await agent
      .post('/login')
      .set('X-Forwarded-For', `10.0.0.${i + 1}`)
      .type('form')
      .send({ _csrf: token, login: 'nannhan', password: `sai${i}abc` });
    assert.equal(r.status, 401, `lần sai ${i + 1} từ IP khác nhau`);
  }
  const blocked = await agent
    .post('/login')
    .set('X-Forwarded-For', '10.0.0.99')
    .type('form')
    .send({ _csrf: token, login: 'nannhan', password: PASSWORD });
  assert.equal(blocked.status, 429, 'IP mới, đúng mật khẩu vẫn bị chặn vì tài khoản đang bị dò');
  const other = await agent
    .post('/login')
    .set('X-Forwarded-For', '10.0.0.98')
    .type('form')
    .send({ _csrf: token, login: 'nguoidung', password: PASSWORD });
  assert.equal(other.status, 302, 'tài khoản khác không bị ảnh hưởng');
});

test('mật khẩu tiếng Việt dài quá 72 byte bị từ chối (bcrypt chỉ dùng 72 byte đầu)', () => {
  const { checkPassword } = require('../src/services/password');
  assert.equal(checkPassword('ệ'.repeat(25) + '1').length > 0, true, '25 chữ "ệ" = 75 byte');
  assert.deepEqual(checkPassword('Mật khẩu tốt 2026'), []);
});

test('ảnh đại diện kích thước quá lớn bị từ chối', async () => {
  const sharp = require('sharp');
  const { saveAvatar } = require('../src/services/avatar');
  const huge = await sharp({ create: { width: 5000, height: 10, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();
  await assert.rejects(saveAvatar(huge), /tối đa 4096/);
});

test('CSP chỉ cho phép 2 đường dẫn script của YouTube, không cả domain', async () => {
  const csp = (await request(app).get('/')).headers['content-security-policy'];
  assert.match(
    csp,
    /script-src 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic' 'self' https:\/\/www\.youtube\.com\/iframe_api https:\/\/www\.youtube\.com\/s\/player\//,
  );
  assert.doesNotMatch(csp, /https:\/\/www\.youtube\.com[ ;]/);
});

test('PAYMENT_MODE=paypal nhưng thiếu khóa PayPal → từ chối thanh toán (503), không tạo quyền học', async () => {
  const config = require('../src/config');
  const { Course, Enrollment } = require('../src/models');
  const saved = config.demo;
  config.demo = false; // giả lập PAYMENT_MODE=paypal (paypal.configured = false)
  try {
    const c = await Course.create({ title: 'Có phí', slug: 'co-phi-503', price: 10, status: 'published', sections: [] });
    const agent = await login(app, 'nguoidung');
    const token = await csrf(agent, `/courses/${c.slug}`);
    const res = await agent.post('/pay').type('form').send({ _csrf: token, courseId: c.id });
    assert.equal(res.status, 503);
    assert.equal(await Enrollment.countDocuments({ course: c._id }), 0);
  } finally {
    config.demo = saved;
  }
});
