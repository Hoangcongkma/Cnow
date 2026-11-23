// Cổng thanh toán DEMO (PAYMENT_MODE=demo – mặc định): PayPal / VNPay / MoMo mô phỏng × thành công / thất bại / hủy,
// đối chiếu số tiền, chống bấm 2 lần, đơn của người khác, VND, hoàn tiền (demo), nhãn DEMO trên trang/hóa đơn.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, demoPay, request } = require('./helpers');

let app;
let course;
before(async () => {
  app = await setup({ DEMO_USD_VND: '26000' });
  course = await createCourse({ price: 19.99, slug: 'khoa-demo', title: 'Khóa có phí demo' });
  await createUser('quantri', 'admin');
});
after(teardown);

const M = () => require('../src/models');
let n = 0;
/** Người mua mới + POST /pay → { user, agent, location } */
async function startBuy(c = course, extra = {}) {
  const user = await createUser(`mua${++n}`);
  const agent = await login(app, `mua${n}`);
  const token = await csrf(agent, `/courses/${c.slug}`);
  const res = await agent
    .post('/pay')
    .type('form')
    .send({ _csrf: token, courseId: c.id, ...extra });
  return { user, agent, res, location: res.headers.location };
}

test('khóa miễn phí: ghi danh ngay, đơn provider=free', async () => {
  const c = await createCourse({ price: 0, slug: 'mien-phi' });
  const { user, res } = await startBuy(c);
  assert.equal(res.headers.location, `/learn/${c.slug}`);
  assert.ok(await M().Enrollment.exists({ user: user._id, course: c._id }));
  assert.equal((await M().Order.findOne({ user: user._id })).provider, 'free');
});

test('tạo đơn: giá từ CSDL (bỏ qua giá gửi từ form), VND theo tỉ giá demo; trang chọn 3 phương thức có cảnh báo DEMO', async () => {
  const { user, agent, location } = await startBuy(course, { price: '0.01', amount: '0.01' });
  assert.match(location, /^\/pay\/demo\/DEMO-ORD-[0-9A-F]{16}$/);
  const o = await M().Order.findOne({ user: user._id });
  assert.deepEqual([o.provider, o.status, o.amount, o.amountVnd], ['demo', 'CREATED', '19.99', 519740]);
  const page = await agent.get(location);
  assert.equal(page.status, 200);
  assert.match(page.text, /MÔI TRƯỜNG DEMO – KHÔNG TRỪ TIỀN THẬT/);
  for (const label of ['PayPal (mô phỏng)', 'VNPay (mô phỏng)', 'Ví MoMo (mô phỏng)']) assert.ok(page.text.includes(label), label);
  assert.match(page.text, /519\.740 ₫/);
  const vnpay = await agent.get(`${location}/vnpay`);
  assert.match(vnpay.text, /name="amount" value="519740"/);
  assert.match(vnpay.text, /name="currency" value="VND"/);
  assert.doesNotMatch(vnpay.text, /type="password"|name="(card|otp|cvv|pin)/i, 'không có ô nhập thẻ / mật khẩu / OTP');
  for (const a of ['Thanh toán thành công', 'Thanh toán thất bại', 'Hủy giao dịch']) assert.ok(vnpay.text.includes(a), a);
  const paypal = await agent.get(`${location}/paypal`);
  assert.match(paypal.text, /name="amount" value="19\.99"/);
  assert.match(paypal.text, /name="currency" value="USD"/);
});

for (const gw of ['paypal', 'vnpay', 'momo']) {
  test(`${gw} demo – thành công: mở khóa học, mã DEMO-XXXXXXXX, trang kết quả ghi DEMO`, async () => {
    const { user, agent, location } = await startBuy();
    const res = await demoPay(agent, location, gw, 'success');
    assert.equal(res.status, 200);
    assert.match(res.text, /Thanh toán thành công/);
    assert.match(res.text, /DEMO – không phải giao dịch thật/);
    const o = await M().Order.findOne({ user: user._id });
    assert.equal(o.status, 'COMPLETED');
    assert.equal(o.gateway, gw);
    assert.match(o.captureId, /^DEMO-[0-9A-F]{8}$/);
    assert.ok(await M().Enrollment.exists({ user: user._id, course: course._id }));
    const orders = await agent.get('/orders');
    assert.match(orders.text, /class="demo-pill"[^>]*>DEMO</);
  });

  test(`${gw} demo – thất bại: không mở khóa, đơn FAILED`, async () => {
    const { user, agent, location } = await startBuy();
    const res = await demoPay(agent, location, gw, 'fail');
    assert.match(res.text, /Thanh toán thất bại/);
    const o = await M().Order.findOne({ user: user._id });
    assert.deepEqual([o.status, o.failureReason, o.gateway], ['FAILED', 'demo_declined', gw]);
    assert.equal(await M().Enrollment.exists({ user: user._id, course: course._id }), null);
  });

  test(`${gw} demo – hủy giao dịch: không mở khóa, đơn CANCELLED`, async () => {
    const { user, agent, location } = await startBuy();
    const res = await demoPay(agent, location, gw, 'cancel');
    assert.match(res.text, /Đã hủy giao dịch/);
    assert.equal((await M().Order.findOne({ user: user._id })).status, 'CANCELLED');
    assert.equal(await M().Enrollment.exists({ user: user._id, course: course._id }), null);
  });
}

test('đối chiếu số tiền: số tiền / loại tiền "cổng" trả về bị sửa → từ chối, không mở khóa', async () => {
  for (const [gw, override] of [
    ['paypal', { amount: '0.01' }],
    ['vnpay', { amount: '1000' }],
    ['momo', { currency: 'USD' }],
  ]) {
    const { user, agent, location } = await startBuy();
    const res = await demoPay(agent, location, gw, 'success', override);
    assert.equal(res.status, 400, gw);
    const o = await M().Order.findOne({ user: user._id });
    assert.deepEqual([o.status, o.failureReason], ['FAILED', 'amount_mismatch'], gw);
    assert.equal(await M().Enrollment.exists({ user: user._id, course: course._id }), null, gw);
  }
});

test('bấm "Thanh toán thành công" 2 lần cùng lúc → chỉ xử lý 1 lần (1 ghi danh, 1 thông báo, 1 mã giao dịch)', async () => {
  const { user, agent, location } = await startBuy();
  const page = await agent.get(`${location}/momo`);
  const pick = (name) => page.text.match(new RegExp(`name="${name}" value="([^"]*)"`))[1];
  const body = { _csrf: pick('_csrf'), amount: pick('amount'), currency: pick('currency'), action: 'success' };
  const [a, b] = await Promise.all([1, 2].map(() => agent.post(`${location}/momo`).type('form').send(body)));
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.match(a.text + b.text, /Thanh toán thành công/);
  assert.equal(await M().Enrollment.countDocuments({ user: user._id }), 1);
  assert.equal(await M().Notification.countDocuments({ user: user._id, type: 'payment' }), 1);
  // Bấm "thất bại" sau khi đã thành công → không đổi trạng thái
  const late = await agent
    .post(`${location}/momo`)
    .type('form')
    .send({ ...body, action: 'fail' });
  assert.match(late.text, /Thanh toán thành công/);
  assert.equal((await M().Order.findOne({ user: user._id })).status, 'COMPLETED');
});

test('đơn của người khác: không xem, không bấm được (404); ref sai định dạng → 404', async () => {
  const { user, location } = await startBuy();
  const other = await login(app, (await createUser('nguoila')).username);
  assert.equal((await other.get(location)).status, 404);
  assert.equal((await other.get(`${location}/paypal`)).status, 404);
  const t = await csrf(other, '/orders');
  const res = await other.post(`${location}/paypal`).type('form').send({ _csrf: t, amount: '19.99', currency: 'USD', action: 'success' });
  assert.equal(res.status, 404);
  assert.equal((await M().Order.findOne({ user: user._id })).status, 'CREATED');
  assert.equal((await other.get('/pay/demo/khong-hop-le')).status, 404);
  assert.equal((await other.get(`${location}/bitcoin`)).status, 404);
  assert.equal((await request(app).get(location)).status, 302, 'chưa đăng nhập → /login');
});

test('mã giảm giá + cổng demo: số tiền USD/VND sau giảm tính ở server', async () => {
  await M().Coupon.create({ code: 'DEMO30', type: 'percent', value: 30, active: true });
  const { user, agent, location } = await startBuy(course, { coupon: 'demo30' });
  let o = await M().Order.findOne({ user: user._id });
  assert.deepEqual([o.amount, o.discount, o.amountVnd], ['13.99', '6.00', 363740]);
  await demoPay(agent, location, 'vnpay');
  o = await M().Order.findById(o._id);
  assert.equal(o.status, 'COMPLETED');
  const pdf = await agent.get(`/orders/${o.id}/invoice.pdf`);
  assert.equal(pdf.status, 200);
});

test('hoàn tiền (demo): chỉ admin; đơn → REFUNDED, thu hồi quyền học, audit log, thông báo; bấm lại không hoàn 2 lần', async () => {
  const { user, agent, location } = await startBuy();
  await demoPay(agent, location, 'paypal');
  const order = await M().Order.findOne({ user: user._id });
  // Học viên tự gọi route hoàn tiền → 403
  const t0 = await csrf(agent, '/orders');
  assert.equal((await agent.post(`/admin/orders/${order.id}/refund`).type('form').send({ _csrf: t0 })).status, 403);

  const admin = await login(app, 'quantri');
  const list = await admin.get('/admin/orders');
  assert.match(list.text, new RegExp(`/admin/orders/${order.id}/refund`));
  const t = await csrf(admin, '/admin/orders');
  const res = await admin.post(`/admin/orders/${order.id}/refund`).type('form').send({ _csrf: t });
  assert.equal(res.status, 302);
  const o = await M().Order.findById(order._id);
  assert.equal(o.status, 'REFUNDED');
  assert.ok(o.refundedAt);
  assert.equal(await M().Enrollment.exists({ user: user._id, course: course._id }), null, 'thu hồi quyền học');
  assert.ok(await M().AuditLog.exists({ action: 'order.refund', target: user._id, 'meta.orderId': order.id }));
  assert.ok(await M().Notification.exists({ user: user._id, type: 'refund' }));
  assert.equal((await agent.get(`/learn/${course.slug}?lesson=1`)).status, 302, 'không còn vào bài khóa');

  await admin.post(`/admin/orders/${order.id}/refund`).type('form').send({ _csrf: t });
  assert.equal(await M().AuditLog.countDocuments({ action: 'order.refund', 'meta.orderId': order.id }), 1, 'không hoàn 2 lần');
  const mine = await agent.get('/orders');
  assert.match(mine.text, /Đã hoàn tiền/);
  assert.equal((await agent.get(`/orders/${order.id}/invoice.pdf`)).status, 200, 'vẫn tải được biên nhận (ghi đã hoàn tiền)');

  // Mua lại được sau khi hoàn tiền
  const t2 = await csrf(agent, `/courses/${course.slug}`);
  const again = await agent.post('/pay').type('form').send({ _csrf: t2, courseId: course.id });
  assert.match(again.headers.location, /^\/pay\/demo\//);
});

test('không hoàn tiền được đơn miễn phí / đơn chưa thanh toán', async () => {
  const admin = await login(app, 'quantri');
  const { user } = await startBuy();
  const pending = await M().Order.findOne({ user: user._id });
  const free = await M().Order.create({ user: user._id, course: course._id, amount: '0.00', provider: 'free', status: 'COMPLETED' });
  const t = await csrf(admin, '/admin/orders');
  for (const o of [pending, free]) {
    await admin.post(`/admin/orders/${o.id}/refund`).type('form').send({ _csrf: t });
    assert.notEqual((await M().Order.findById(o._id)).status, 'REFUNDED');
  }
});

test('dải thông báo demo trên mọi trang; giá hiển thị cả USD và VND', async () => {
  for (const p of ['/', '/courses', `/courses/${course.slug}`, '/login', '/khong-ton-tai']) {
    const res = await request(app).get(p);
    assert.match(res.text, /Website demo đồ án – thanh toán là mô phỏng, không phát sinh giao dịch thật/, p);
  }
  const detail = await request(app).get(`/courses/${course.slug}`);
  assert.match(detail.text, /\$19\.99/);
  assert.match(detail.text, /519\.740 ₫/);
});

test('hóa đơn PDF của đơn demo ghi DEMO (metadata) ', async () => {
  const { buildInvoice } = require('../src/services/invoice');
  const o = await M().Order.findOne({ provider: 'demo', status: 'COMPLETED' });
  const doc = buildInvoice({ order: o, user: { name: 'A', email: 'a@b.c', username: 'a' }, course: { title: 'X' } }, { compress: false });
  const raw = await new Promise((resolve) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
  });
  const ref = raw.match(/\/Keywords (\d+) 0 R/)[1]; // pdfkit ghi metadata thành đối tượng gián tiếp
  assert.match(raw, new RegExp(`\\n${ref} 0 obj\\n\\(DEMO\\)`));
});
