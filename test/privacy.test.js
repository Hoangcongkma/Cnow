// Bảo vệ dữ liệu & quyền riêng tư: tải dữ liệu, tự xóa tài khoản (ẩn danh hóa), trang chính sách, che email trong nhật ký,
// sao lưu / khôi phục
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setup, teardown, createUser, createCourse, csrf, login, request, PASSWORD } = require('./helpers');

let app;
let course;
let u;
before(async () => {
  app = await setup();
  const M = require('../src/models');
  u = await createUser('riengtu', 'user', { bio: 'Giới thiệu riêng tư' });
  const other = await createUser('nguoikhac');
  await createUser('quantri', 'admin');
  course = await createCourse({ slug: 'khoa-rieng-tu', price: 10 });
  await M.Enrollment.create({ user: u._id, course: course._id });
  await M.Progress.create({ user: u._id, course: course._id, completedLessons: [course.lessons[0]._id] });
  await M.Order.create({
    user: u._id,
    course: course._id,
    amount: '10.00',
    provider: 'demo',
    status: 'COMPLETED',
    payerEmail: 'riengtu@test.local',
  });
  await M.Review.create({ user: u._id, course: course._id, rating: 1, content: 'Nhận xét của tôi' });
  await M.Review.create({ user: other._id, course: course._id, rating: 5 });
  await M.Course.updateOne({ _id: course._id }, { ratingAvg: 3, ratingCount: 2 });
  await M.Post.create({ course: course._id, lesson: course.lessons[0]._id, user: u._id, content: 'Câu hỏi công khai của tôi' });
  await M.Note.create({ user: u._id, course: course._id, lesson: course.lessons[0]._id, text: 'Ghi chú riêng' });
});
after(teardown);

const M = () => require('../src/models');

test('tải dữ liệu cá nhân (JSON): đủ các nhóm dữ liệu, không có bí mật; ghi audit', async () => {
  const agent = await login(app, 'riengtu');
  const res = await agent.get('/profile/export.json');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.match(res.headers['content-disposition'], /attachment; filename="cnow-du-lieu-riengtu\.json"/);
  assert.equal(res.headers['cache-control'], 'no-store');
  const data = JSON.parse(res.text);
  assert.equal(data.profile.username, 'riengtu');
  assert.equal(data.enrollments.length, 1);
  assert.equal(data.orders[0].amount, '10.00');
  assert.equal(data.notes[0].text, 'Ghi chú riêng');
  assert.ok(data.activeSessions.length >= 1);
  assert.doesNotMatch(res.text, /passwordHash|mfaSecret|adminPin|knownIpHashes|"sid"|\$2[aby]\$/);
  assert.ok(await M().AuditLog.exists({ action: 'data.export', target: u._id }));
  assert.equal((await request(app).get('/profile/export.json')).headers.location, '/login', 'khách không tải được');
});

test('xóa tài khoản: sai mật khẩu / sai chuỗi xác nhận bị từ chối; admin không tự xóa được', async () => {
  const agent = await login(app, 'riengtu');
  const token = await csrf(agent, '/profile/delete');
  let res = await agent.post('/profile/delete').type('form').send({ _csrf: token, password: 'sai-mat-khau-1', confirm: 'XÓA TÀI KHOẢN' });
  assert.equal(res.status, 400);
  res = await agent.post('/profile/delete').type('form').send({ _csrf: token, password: PASSWORD, confirm: 'xoa' });
  assert.equal(res.status, 400);
  assert.ok(await M().User.exists({ username: 'riengtu' }));
  const admin = await login(app, 'quantri');
  const t2 = await csrf(admin, '/profile/delete');
  res = await admin.post('/profile/delete').type('form').send({ _csrf: t2, password: PASSWORD, confirm: 'XÓA TÀI KHOẢN' });
  assert.equal(res.status, 403);
});

test('xóa tài khoản: hồ sơ ẩn danh, dữ liệu học tập bị xóa, đơn hàng giữ (ẩn danh), thảo luận hiện "Người dùng đã xóa"', async () => {
  const agent = await login(app, 'riengtu');
  const token = await csrf(agent, '/profile/delete');
  const res = await agent.post('/profile/delete').type('form').send({ _csrf: token, password: PASSWORD, confirm: 'XÓA TÀI KHOẢN' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/');
  const after = await M().User.findById(u._id).select('+knownIpHashes +mfaSecret +adminPinHash');
  assert.equal(after.name, 'Người dùng đã xóa');
  assert.match(after.email, /@deleted\.invalid$/);
  assert.equal(after.bio, undefined);
  assert.equal(after.locked, true);
  assert.ok(after.deletedAt);
  for (const name of ['Enrollment', 'Progress', 'Note', 'Review', 'UserSession']) {
    assert.equal(await M()[name].countDocuments({ user: u._id }), 0, name);
  }
  const order = await M().Order.findOne({ user: u._id });
  assert.ok(order, 'đơn hàng giữ lại cho thống kê');
  assert.equal(order.payerEmail, undefined);
  assert.equal(await M().Post.countDocuments({ user: u._id }), 1, 'câu hỏi giữ lại');
  const c = await M().Course.findById(course._id);
  assert.deepEqual([c.ratingAvg, c.ratingCount], [5, 1], 'điểm đánh giá tính lại');
  assert.equal((await agent.get('/profile')).headers.location, '/login', 'phiên đã bị hủy');
  const relogin = request.agent(app);
  const t2 = await csrf(relogin);
  assert.notEqual((await relogin.post('/login').type('form').send({ _csrf: t2, login: 'riengtu', password: PASSWORD })).status, 302);
  assert.ok(await M().AuditLog.exists({ action: 'account.delete', target: u._id }));
});

test('trang chính sách bảo mật công khai; nhật ký bảo mật che email người dùng nhập khi đăng nhập', async () => {
  const page = await request(app).get('/chinh-sach-bao-mat');
  assert.equal(page.status, 200);
  assert.match(page.text, /Quyền của bạn/);
  assert.match((await request(app).get('/')).text, /href="\/chinh-sach-bao-mat"/);
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent.post('/login').type('form').send({ _csrf: token, login: 'congdan.nguyen@gmail.com', password: 'sai-mat-khau-2' });
  const log = await M().AuditLog.findOne({ action: 'login.failure' }).sort({ createdAt: -1 });
  assert.equal(log.meta.login, 'c***@gmail.com');
  const { maskEmail } = require('../src/utils/mask');
  assert.equal(maskEmail('Liên hệ an@x.vn, b.c@d.com'), 'Liên hệ a***@x.vn, b***@d.com');
});

test('sao lưu / khôi phục bằng driver Node: đủ collection, giữ kiểu dữ liệu (ObjectId, Date, ảnh GridFS), tạo lại index', async () => {
  const mongoose = require('mongoose');
  const db = mongoose.connection.db;
  const { backupTo, restoreFrom } = require('../scripts/lib/backup');
  const { putFile, findAvatar } = require('../src/services/avatar');
  const img = Buffer.from('RIFF0000WEBPVP8 demo-image-bytes');
  await putFile(`${'b'.repeat(32)}.webp`, img);
  const usersBefore = await M().User.countDocuments();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cnow-backup-'));
  try {
    const dir = await backupTo(db, tmp);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.collections.users.count, usersBefore);
    assert.ok(manifest.collections['avatars.chunks'].count >= 1);
    // Mất dữ liệu → khôi phục
    await db.collection('users').deleteMany({});
    await db.collection('avatars.files').deleteMany({});
    await db.collection('avatars.chunks').deleteMany({});
    await restoreFrom(db, dir, { drop: true });
    assert.equal(await M().User.countDocuments(), usersBefore);
    const sample = await db.collection('users').findOne({ username: 'nguoikhac' });
    assert.ok(sample._id instanceof mongoose.Types.ObjectId);
    assert.ok(sample.createdAt instanceof Date);
    const f = await findAvatar(`${'b'.repeat(32)}.webp`);
    assert.ok(f, 'file GridFS được khôi phục');
    const idx = await db.collection('users').indexes();
    assert.ok(
      idx.some((i) => i.key.username === 1 && i.unique),
      'index unique được tạo lại',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
