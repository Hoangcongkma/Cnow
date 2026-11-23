// Luồng thanh toán PayPal với fetch giả lập (không gọi PayPal thật):
// tạo đơn → chuyển hướng → capture → chỉ mở khóa khi số tiền, loại tiền, trạng thái khớp.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, stubFetch, jsonResponse } = require('./helpers');

let app;
let course;
let restore;
let capture; // kết quả capture mà PayPal giả sẽ trả về
let created = 0;
const calls = [];

before(async () => {
  // PAYMENT_MODE=paypal + khóa PayPal (giả) → app dùng luồng PayPal thật, không đăng ký cổng demo
  app = await setup({
    PAYMENT_MODE: 'paypal',
    PAYPAL_CLIENT_ID: 'test-client',
    PAYPAL_CLIENT_SECRET: 'test-secret',
    PAYPAL_MODE: 'sandbox',
  });
  course = await createCourse({ price: 19.99, slug: 'khoa-co-phi' });
  restore = stubFetch((url, opts) => {
    if (!url.startsWith('https://api-m.sandbox.paypal.com')) return null;
    let body;
    try {
      body = opts.body ? JSON.parse(opts.body) : null;
    } catch {
      body = opts.body; // yêu cầu OAuth gửi dạng urlencoded
    }
    calls.push({ url, body });
    if (url.endsWith('/v1/oauth2/token')) return jsonResponse(200, { access_token: 'tok', expires_in: 3600 });
    if (url.endsWith('/v2/checkout/orders')) {
      created++;
      return jsonResponse(201, {
        id: `PP-${created}`,
        links: [{ rel: 'payer-action', href: `https://www.sandbox.paypal.com/checkoutnow?token=PP-${created}` }],
      });
    }
    if (url.endsWith('/capture')) return jsonResponse(201, capture);
    return jsonResponse(404, {});
  });
});
after(async () => {
  restore();
  await teardown();
});

const okCapture = (value = '19.99', currency = 'USD', status = 'COMPLETED') => ({
  status,
  payer: { email_address: 'buyer@example.com' },
  purchase_units: [{ payments: { captures: [{ id: 'CAP-1', status, amount: { value, currency_code: currency } }] } }],
});

let n = 0;
async function buy() {
  await createUser(`buyer${++n}`);
  const agent = await login(app, `buyer${n}`);
  const token = await csrf(agent, `/courses/${course.slug}`);
  const res = await agent.post('/pay').type('form').send({ _csrf: token, courseId: course.id, price: '0.01' });
  return { agent, res, username: `buyer${n}` };
}
async function state(username) {
  const { User, Order, Enrollment } = require('../src/models');
  const u = await User.findOne({ username });
  return { order: await Order.findOne({ user: u._id }), enrolled: Boolean(await Enrollment.exists({ user: u._id, course: course._id })) };
}

beforeEach(() => {
  calls.length = 0;
});

test('tạo đơn: giá lấy từ CSDL (bỏ qua giá gửi từ form), chuyển hướng sang PayPal', async () => {
  const { res, username } = await buy();
  assert.equal(res.status, 303);
  assert.match(res.headers.location, /^https:\/\/www\.sandbox\.paypal\.com\/checkoutnow\?token=PP-/);
  const createCall = calls.find((c) => c.url.endsWith('/v2/checkout/orders'));
  assert.equal(createCall.body.purchase_units[0].amount.value, '19.99', 'gửi PayPal đúng giá trong CSDL');
  const { order, enrolled } = await state(username);
  assert.equal(order.status, 'CREATED');
  assert.equal(order.amount, '19.99');
  assert.equal(enrolled, false);
});

test('capture thành công, khớp số tiền → mở quyền học (gọi lại không tạo trùng)', async () => {
  const { agent, username } = await buy();
  const { order } = await state(username);
  capture = okCapture();
  const res = await agent.get(`/pay/success?token=${order.providerOrderId}&PayerID=X`);
  assert.equal(res.status, 200);
  assert.match(res.text, /Thanh toán thành công/);
  const s = await state(username);
  assert.equal(s.order.status, 'COMPLETED');
  assert.equal(s.order.captureId, 'CAP-1');
  assert.equal(s.enrolled, true);
  const again = await agent.get(`/pay/success?token=${order.providerOrderId}`);
  assert.equal(again.status, 302, 'tải lại trang → vào học, không capture lần 2');
});

for (const [ten, cap] of [
  ['số tiền sai (0.01)', okCapture('0.01')],
  ['loại tiền sai (EUR)', okCapture('19.99', 'EUR')],
  ['trạng thái chưa hoàn tất (PENDING)', okCapture('19.99', 'USD', 'PENDING')],
]) {
  test(`KHÔNG mở khóa khi ${ten}`, async () => {
    const { agent, username } = await buy();
    const { order } = await state(username);
    capture = cap;
    const res = await agent.get(`/pay/success?token=${order.providerOrderId}`);
    assert.match(res.text, /Thanh toán thất bại/);
    const s = await state(username);
    assert.equal(s.order.status, 'FAILED');
    assert.equal(s.enrolled, false);
  });
}

test('không capture được đơn của người khác', async () => {
  const { username } = await buy();
  const { order } = await state(username);
  await createUser('kegian');
  const other = await login(app, 'kegian');
  capture = okCapture();
  const res = await other.get(`/pay/success?token=${order.providerOrderId}`);
  assert.equal(res.status, 404);
  assert.equal((await state(username)).enrolled, false);
});

test('mã giảm giá với PayPal: gửi PayPal giá sau giảm; capture đúng giá gốc (chưa giảm) → không mở khóa', async () => {
  const { Coupon } = require('../src/models');
  await Coupon.create({ code: 'PP25', type: 'percent', value: 25 });
  await createUser('ppcoupon');
  const agent = await login(app, 'ppcoupon');
  const token = await csrf(agent, `/courses/${course.slug}`);
  await agent.post('/pay').type('form').send({ _csrf: token, courseId: course.id, coupon: 'PP25' });
  const createCall = calls.find((c) => c.url.endsWith('/v2/checkout/orders'));
  assert.equal(createCall.body.purchase_units[0].amount.value, '14.99', '19.99 − 25% (5.00) = 14.99');
  const st = await state('ppcoupon');
  assert.equal(st.order.amount, '14.99');
  capture = okCapture('19.99'); // PayPal báo đã thu số khác số tiền của đơn → từ chối
  await agent.get(`/pay/success?token=${st.order.providerOrderId}`);
  assert.equal((await state('ppcoupon')).enrolled, false);
  assert.equal((await Coupon.findOne({ code: 'PP25' })).usedCount, 0, 'đơn thất bại → trả lại lượt dùng');
});

test('khi đã cấu hình PayPal, route mô phỏng không tồn tại', async () => {
  const { agent } = await buy();
  assert.equal((await agent.get('/pay/demo/DEMO-ORD-0123456789ABCDEF')).status, 404);
});
