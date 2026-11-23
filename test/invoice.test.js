// Hóa đơn PDF: chỉ chủ đơn/admin, chỉ đơn đã thanh toán, font tiếng Việt được nhúng
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, login } = require('./helpers');

let app;
let paid;
let pending;
let free;
before(async () => {
  app = await setup();
  const { Order } = require('../src/models');
  const owner = await createUser('chudon');
  await createUser('nguoikhac');
  await createUser('quantri', 'admin');
  const course = await createCourse({ title: 'Lập trình Node.js – Đồ án', price: 19.99 });
  const base = { user: owner._id, course: course._id, currency: 'USD' };
  paid = await Order.create({
    ...base,
    amount: '13.99',
    originalAmount: '19.99',
    discount: '6.00',
    couponCode: 'GIAM30',
    provider: 'mock',
    status: 'COMPLETED',
    captureId: 'CAP-1',
  });
  pending = await Order.create({ ...base, amount: '19.99', provider: 'mock', status: 'CREATED' });
  free = await Order.create({ ...base, amount: '0.00', provider: 'free', status: 'COMPLETED' });
});
after(teardown);

const pdfBuffer = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

test('chủ đơn tải được hóa đơn PDF (đúng header, nội dung PDF)', async () => {
  const agent = await login(app, 'chudon');
  const res = await agent.get(`/orders/${paid.id}/invoice.pdf`).buffer(true).parse(pdfBuffer);
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.match(res.headers['content-disposition'], /attachment; filename="cnow-INV-\d{6}-[0-9A-F]{8}\.pdf"/);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.body.subarray(0, 5).toString(), '%PDF-');
  assert.ok(res.body.length > 5000);
  const list = await agent.get('/orders');
  assert.match(list.text, new RegExp(`/orders/${paid.id}/invoice\\.pdf`));
  assert.doesNotMatch(list.text, new RegExp(`/orders/${pending.id}/invoice\\.pdf`));
});

test('người khác không tải được (404); admin tải được', async () => {
  const other = await login(app, 'nguoikhac');
  assert.equal((await other.get(`/orders/${paid.id}/invoice.pdf`)).status, 404);
  const admin = await login(app, 'quantri');
  assert.equal((await admin.get(`/orders/${paid.id}/invoice.pdf`)).status, 200);
});

test('đơn chưa thanh toán / khóa miễn phí không có mã / id sai → 404', async () => {
  const agent = await login(app, 'chudon');
  for (const id of [pending.id, free.id, 'khong-hop-le', '000000000000000000000000']) {
    assert.equal((await agent.get(`/orders/${id}/invoice.pdf`)).status, 404, id);
  }
});

test('PDF nhúng font DejaVu Sans và có bảng ToUnicode cho ký tự tiếng Việt (chép/tìm kiếm được)', async () => {
  const { buildInvoice } = require('../src/services/invoice');
  const doc = buildInvoice(
    { order: paid, user: { name: 'Nguyễn Thị Hồng Nhung', email: 'a@b.c', username: 'nhung' }, course: { title: 'Thử nghiệm' } },
    { compress: false },
  );
  const raw = await new Promise((resolve) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
  });
  assert.match(raw, /DejaVuSans/);
  assert.match(raw, /\/FontFile2/, 'font được nhúng vào PDF');
  for (const cp of ['1ec5', '1ecb', '1ed3', '0111']) assert.match(raw, new RegExp(cp, 'i'), `có ánh xạ Unicode U+${cp}`); // ễ ị ồ đ
});
