// Mã giảm giá: tính giá ở server, giữ/trả lượt nguyên tử, giảm 100%, hết hạn/hết lượt/không áp dụng, quản trị
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createUser, createCourse, csrf, login, demoPay } = require('./helpers');

let app;
let course;
let other;
before(async () => {
  app = await setup(); // không cấu hình PayPal → PayPal mô phỏng (localhost/test)
  await createUser('quantri', 'admin');
  course = await createCourse({ price: 19.99, slug: 'khoa-giam-gia' });
  other = await createCourse({ price: 30, slug: 'khoa-khac' });
});
after(teardown);

const M = () => require('../src/models');
const coupon = (fields) => M().Coupon.create({ type: 'percent', value: 20, ...fields });

let n = 0;
async function buyer() {
  const name = `mua${++n}`;
  const user = await createUser(name);
  return { user, agent: await login(app, name) };
}
async function pay(agent, c, extra = {}) {
  const t = await csrf(agent, `/courses/${c.slug}`);
  return agent
    .post('/pay')
    .type('form')
    .send({ _csrf: t, courseId: c.id, ...extra });
}

test('xem trước giá với mã 20%: 19.99 → 15.99; mã sai báo lỗi', async () => {
  await coupon({ code: 'GIAM20' });
  const { agent } = await buyer();
  let page = await agent.get(`/courses/${course.slug}?coupon=giam20`);
  assert.match(page.text, /class="old-price">\$19\.99<\/span> \$15\.99/);
  assert.match(page.text, /name="coupon" value="GIAM20"/);
  page = await agent.get(`/courses/${course.slug}?coupon=KHONGCO`);
  assert.match(page.text, /không tồn tại/);
});

test('mua với mã: đơn lưu giá sau giảm do SERVER tính (bỏ qua giá/giảm giá gửi từ form), giữ 1 lượt; hoàn tất → mở khóa', async () => {
  const { user, agent } = await buyer();
  const res = await pay(agent, course, { coupon: 'giam20', amount: '0.01', discount: '19.98', price: '0.01' });
  assert.match(res.headers.location, /^\/pay\/demo\/DEMO-ORD-/);
  const o = await M().Order.findOne({ user: user._id });
  assert.deepEqual([o.amount, o.originalAmount, o.discount, o.couponCode], ['15.99', '19.99', '4.00', 'GIAM20']);
  assert.equal((await M().Coupon.findOne({ code: 'GIAM20' })).usedCount, 1);
  await demoPay(agent, res.headers.location, 'momo');
  assert.ok(await M().Enrollment.exists({ user: user._id, course: course._id }));
  const again = await agent.get(`/courses/${other.slug}?coupon=GIAM20`);
  assert.match(again.text, /đã dùng mã giảm giá này rồi/, 'mỗi tài khoản dùng 1 lần');
});

test('hủy thanh toán → trả lại lượt dùng; quay lại mua tiếp thì đơn cũ bị hủy và trả lượt', async () => {
  await coupon({ code: 'HUY10', value: 10, maxUses: 5 });
  const { agent } = await buyer();
  let res = await pay(agent, course, { coupon: 'HUY10' });
  await demoPay(agent, res.headers.location, 'vnpay', 'cancel');
  assert.equal((await M().Coupon.findOne({ code: 'HUY10' })).usedCount, 0);
  await pay(agent, course, { coupon: 'HUY10' });
  assert.equal((await M().Coupon.findOne({ code: 'HUY10' })).usedCount, 1);
  res = await pay(agent, course, { coupon: 'HUY10' }); // đóng tab rồi mua lại
  assert.equal((await M().Coupon.findOne({ code: 'HUY10' })).usedCount, 1, 'đơn CREATED cũ bị hủy, không giữ 2 lượt');
  await demoPay(agent, res.headers.location);
  assert.equal((await M().Coupon.findOne({ code: 'HUY10' })).usedCount, 1);
});

test('mã giảm bằng hoặc hơn giá khóa → miễn phí, ghi danh ngay', async () => {
  await coupon({ code: 'TANG25USD', type: 'amount', value: 25 });
  const { user, agent } = await buyer();
  const res = await pay(agent, course, { coupon: 'TANG25USD' });
  assert.equal(res.headers.location, `/learn/${course.slug}`);
  const o = await M().Order.findOne({ user: user._id });
  assert.deepEqual([o.provider, o.status, o.amount, o.discount], ['free', 'COMPLETED', '0.00', '19.99']);
  assert.ok(await M().Enrollment.exists({ user: user._id, course: course._id }));
});

test('mã hết hạn / đã tắt / không áp dụng cho khóa này → không tạo đơn', async () => {
  await coupon({ code: 'HETHAN', expiresAt: new Date(Date.now() - 1000) });
  await coupon({ code: 'DATAT', active: false });
  await coupon({ code: 'CHIKHOAKHAC', courses: [other._id] });
  const { user, agent } = await buyer();
  for (const [code, msg] of [
    ['HETHAN', /hết hạn/],
    ['DATAT', /ngừng áp dụng/],
    ['CHIKHOAKHAC', /không áp dụng cho khóa học này/],
  ]) {
    const res = await pay(agent, course, { coupon: code });
    assert.equal(res.headers.location, `/courses/${course.slug}`);
    const page = await agent.get(res.headers.location);
    assert.match(page.text, msg, code);
  }
  assert.equal(await M().Order.countDocuments({ user: user._id }), 0);
});

test('10 người dùng cùng lúc mã giới hạn 3 lượt → đúng 3 đơn dùng được mã', async () => {
  await coupon({ code: 'NHANH3', maxUses: 3 });
  const buyers = [];
  for (let i = 0; i < 10; i++) buyers.push(await buyer());
  await Promise.all(buyers.map(({ agent }) => pay(agent, course, { coupon: 'NHANH3' })));
  const c = await M().Coupon.findOne({ code: 'NHANH3' });
  assert.equal(c.usedCount, 3);
  assert.equal(await M().Order.countDocuments({ coupon: c._id }), 3);
});

test('quản trị mã: chỉ admin; mã trùng/giá trị sai bị từ chối; mã đã dùng không xóa được (chỉ tắt)', async () => {
  const { agent: hv } = await buyer();
  assert.equal((await hv.get('/admin/coupons')).status, 403);
  const admin = await login(app, 'quantri');
  let t = await csrf(admin, '/admin/coupons');
  let res = await admin.post('/admin/coupons').type('form').send({ _csrf: t, code: 'moi-50', type: 'percent', value: '50', maxUses: '10' });
  assert.equal(res.status, 302);
  assert.ok(await M().Coupon.exists({ code: 'MOI-50' }));
  res = await admin.post('/admin/coupons').type('form').send({ _csrf: t, code: 'MOI-50', type: 'percent', value: '50' });
  assert.equal(res.status, 400);
  assert.match(res.text, /đã tồn tại/);
  res = await admin.post('/admin/coupons').type('form').send({ _csrf: t, code: 'SAI', type: 'percent', value: '150' });
  assert.equal(res.status, 400);
  const used = await M().Coupon.findOne({ code: 'GIAM20' });
  t = await csrf(admin, '/admin/coupons');
  await admin.post(`/admin/coupons/${used.id}/delete`).type('form').send({ _csrf: t });
  assert.ok(await M().Coupon.exists({ _id: used._id }), 'mã đã dùng không bị xóa');
  await admin.post(`/admin/coupons/${used.id}`).type('form').send({ _csrf: t, active: '0' });
  assert.equal((await M().Coupon.findById(used._id)).active, false);
  assert.ok(await M().AuditLog.exists({ action: 'coupon.create', 'meta.code': 'MOI-50' }));
});
