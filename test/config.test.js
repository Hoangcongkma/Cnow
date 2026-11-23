// Cấu hình tập trung (zod): sai định dạng → dừng khi khởi động, thông báo nêu TÊN biến nhưng không lộ giá trị;
// ô trống coi như không khai báo; ràng buộc production / PayPal / SESSION_SECRET an toàn mặc định đóng.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildConfig } = require('../src/config');

const SECRET = 'x'.repeat(40);
const PROD = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://cluster.example.net/cnow',
  BASE_URL: 'https://cnow.example',
  SESSION_SECRET: SECRET,
};

test('mặc định an toàn khi chạy máy cá nhân: demo, localhost, cookie cnow.sid', () => {
  const c = buildConfig({ NODE_ENV: 'development' });
  assert.equal(c.isLocal, true);
  assert.equal(c.demo, true);
  assert.equal(c.port, 3000);
  assert.equal(c.sessionCookieName, 'cnow.sid');
  assert.equal(c.globalRateLimit, 600);
  assert.equal(c.noindex, false);
});

test('ô trống trong .env coi như không khai báo', () => {
  const c = buildConfig({ NODE_ENV: 'development', TRUST_PROXY: '', PORT: '', DEMO_USD_VND: '', SECURITY_CONTACT: '' });
  assert.equal(c.trustProxy, false);
  assert.equal(c.port, 3000);
  assert.equal(c.usdVnd, 26000);
});

test('giá trị sai định dạng → lỗi liệt kê đủ tên biến, KHÔNG in giá trị', () => {
  const bad = {
    NODE_ENV: 'staging',
    PORT: 'abc',
    MONGODB_URI: 'http://matkhau-bi-mat.example/db',
    DEMO_USD_VND: '1.5',
    TRUST_PROXY: 'yes',
    LOG_LEVEL: 'loud',
  };
  assert.throws(
    () => buildConfig(bad),
    (e) => {
      for (const k of Object.keys(bad)) assert.match(e.message, new RegExp(`- ${k}:`));
      assert.doesNotMatch(e.message, /matkhau-bi-mat/);
      return true;
    },
  );
});

test('production: bắt buộc MONGODB_URI, BASE_URL, SESSION_SECRET ≥ 32; cookie __Host- khi https', () => {
  assert.throws(() => buildConfig({ ...PROD, MONGODB_URI: undefined }), /MONGODB_URI/);
  assert.throws(() => buildConfig({ ...PROD, BASE_URL: '' }), /BASE_URL/);
  assert.throws(() => buildConfig({ ...PROD, SESSION_SECRET: 'ngan' }), /SESSION_SECRET/);
  const c = buildConfig(PROD);
  assert.equal(c.sessionCookieName, '__Host-cnow.sid');
  assert.equal(c.trustProxy, true);
  assert.equal(c.isLocal, false);
});

test('không chạy localhost (kể cả development) cũng bắt buộc SESSION_SECRET ≥ 32', () => {
  assert.throws(() => buildConfig({ NODE_ENV: 'development', BASE_URL: 'http://192.168.1.5:3000' }), /SESSION_SECRET/);
  assert.equal(buildConfig({ NODE_ENV: 'development', BASE_URL: 'http://192.168.1.5:3000', SESSION_SECRET: SECRET }).isLocal, false);
});

test('PAYMENT_MODE=paypal ở production: bắt buộc khóa API + PAYPAL_MODE; thiếu khóa ở dev → configured=false', () => {
  assert.throws(() => buildConfig({ ...PROD, PAYMENT_MODE: 'paypal', PAYPAL_MODE: 'live' }), /PAYPAL_CLIENT_ID/);
  assert.throws(() => buildConfig({ ...PROD, PAYMENT_MODE: 'paypal', PAYPAL_CLIENT_ID: 'a', PAYPAL_CLIENT_SECRET: 'b' }), /PAYPAL_MODE/);
  assert.equal(buildConfig({ NODE_ENV: 'development', PAYMENT_MODE: 'paypal' }).paypal.configured, false);
  assert.throws(() => buildConfig({ NODE_ENV: 'development', PAYMENT_MODE: 'stripe' }), /PAYMENT_MODE/);
});

test('SECURITY_CONTACT chỉ nhận mailto: hoặc https://; BASE_URL phải là http(s)', () => {
  assert.equal(
    buildConfig({ NODE_ENV: 'development', SECURITY_CONTACT: 'mailto:baomat@cnow.example' }).securityContact,
    'mailto:baomat@cnow.example',
  );
  assert.throws(() => buildConfig({ NODE_ENV: 'development', SECURITY_CONTACT: 'javascript:alert(1)' }), /SECURITY_CONTACT/);
  assert.throws(() => buildConfig({ NODE_ENV: 'development', BASE_URL: 'ftp://cnow.example' }), /BASE_URL/);
});
