// Nhật ký & giám sát: requestId, logger không lộ bí mật/PII, audit log chỉ ghi thêm, audit xuất CSV / kiểm duyệt,
// trang /admin/security
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const { setup, teardown, createUser, createCourse, csrf, login, request } = require('./helpers');

let app;
before(async () => {
  app = await setup({ TRUST_PROXY: '1' });
  await createUser('hocvien');
  await createUser('quantri', 'admin');
});
after(teardown);

const M = () => require('../src/models');

test('requestId: mỗi response có X-Request-Id; ID hợp lệ từ client được giữ, ID độc hại bị thay; hiện trên trang lỗi', async () => {
  const a = await request(app).get('/');
  assert.match(a.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  const b = await request(app).get('/').set('X-Request-Id', 'trace-ABC_123.x');
  assert.equal(b.headers['x-request-id'], 'trace-ABC_123.x');
  for (const bad of ['x<script>alert(1)</script>', 'a'.repeat(200), 'short']) {
    const c = await request(app).get('/').set('X-Request-Id', bad);
    assert.match(c.headers['x-request-id'], /^[0-9a-f-]{36}$/, bad.slice(0, 20));
  }
  const err = await request(app).get('/orders/abc/invoice.pdf').set('X-Request-Id', 'loi-12345678');
  assert.equal(err.headers.location, '/login');
  const agent = await login(app, 'hocvien');
  const e2 = await agent.get('/certificate/khong-hop-le').set('X-Request-Id', 'loi-87654321');
  assert.equal(e2.status, 404);
  assert.match(e2.text, /Mã yêu cầu[^<]*<code>loi-87654321<\/code>/);
});

test('logger: ẩn cookie / mật khẩu / mã / body, che email, URL không có query', async () => {
  const { createLogger } = require('../src/logger');
  const lines = [];
  const stream = new Writable({
    write(chunk, enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  const log = createLogger(stream, 'info');
  log.info(
    {
      req: { headers: { cookie: 'cnow.sid=s%3Abimat', authorization: 'Bearer abc' }, body: { password: 'MatKhau!2026' } },
      user: { email: 'congdan.nguyen@gmail.com', password: 'p@ss', pin: '1234-Pin!', passwordHash: '$2b$12$abc' },
    },
    'Đăng nhập của congdan.nguyen@gmail.com',
  );
  log.error({ err: new Error('Không gửi được tới an.tran@example.com') }, 'lỗi');
  const out = lines.join('\n');
  for (const secret of ['bimat', 'Bearer abc', 'MatKhau!2026', 'p@ss', '1234-Pin!', '$2b$12$abc', 'congdan.nguyen@', 'an.tran@']) {
    assert.ok(!out.includes(secret), `không lộ: ${secret}`);
  }
  assert.match(out, /c\*\*\*@gmail\.com/);
  assert.match(out, /\[đã ẩn\]/);
  const { httpSerializers } = require('../src/logger');
  const sreq = httpSerializers.req({
    id: 'r1',
    method: 'GET',
    url: '/courses?q=an%40x.vn&token=abc',
    query: { token: 'abc' },
    headers: { cookie: 'x' },
    remoteAddress: '1.2.3.4',
  });
  assert.deepEqual(sreq, { id: 'r1', method: 'GET', path: '/courses', ip: '1.2.3.4' }, 'log truy cập không có query/header');
  assert.deepEqual(httpSerializers.res({ raw: { statusCode: 404 } }), { statusCode: 404 });
  const json = JSON.parse(lines[0]);
  assert.equal(json.level, 'info');
  assert.equal(json.app, 'cnow');
});

test('nhật ký bảo mật chỉ ghi thêm: sửa / xóa qua Mongoose đều bị từ chối', async () => {
  const { AuditLog } = M();
  const log = await AuditLog.create({ action: 'login.success', ip: '1.2.3.4' });
  await assert.rejects(AuditLog.updateOne({ _id: log._id }, { ip: '9.9.9.9' }), /không được sửa hoặc xóa/);
  await assert.rejects(AuditLog.deleteMany({}), /không được sửa hoặc xóa/);
  await assert.rejects(AuditLog.findOneAndDelete({ _id: log._id }), /không được sửa hoặc xóa/);
  log.ip = '8.8.8.8';
  await assert.rejects(log.save(), /không được sửa hoặc xóa/);
  await assert.rejects(log.deleteOne(), /không được sửa hoặc xóa/);
  assert.equal((await AuditLog.findById(log._id)).ip, '1.2.3.4');
});

test('audit đủ sự kiện quản trị: xuất CSV (loại + số dòng), ẩn nội dung; có requestId để nối với log truy cập', async () => {
  const { AuditLog, CourseComment, User } = M();
  const admin = await login(app, 'quantri');
  await admin.get('/admin/export/users.csv').set('X-Request-Id', 'csv-req-0001');
  const e = await AuditLog.findOne({ action: 'export.csv' });
  assert.equal(e.meta.format, 'cnow-thanh-vien');
  assert.equal(e.meta.rows, await User.countDocuments());
  assert.equal(e.requestId, 'csv-req-0001');
  const c = await createCourse({ slug: 'khoa-giam-sat' });
  const cm = await CourseComment.create({ course: c._id, user: (await User.findOne({ username: 'hocvien' }))._id, content: 'quảng cáo' });
  const token = await csrf(admin, '/admin/comments');
  await admin.post(`/admin/comments/${cm.id}`).type('form').send({ _csrf: token, hidden: '1' });
  assert.ok(await AuditLog.exists({ action: 'content.moderate', 'meta.reason': 'hide_comment' }));
});

test('/admin/security: thống kê thất bại 24 giờ, IP đáng ngờ, tài khoản bị khóa; người dùng thường không vào được', async () => {
  const agent = request.agent(app);
  const token = await csrf(agent);
  for (let i = 0; i < 6; i++) {
    await agent
      .post('/login')
      .set('X-Forwarded-For', '203.0.113.7')
      .type('form')
      .send({ _csrf: token, login: i < 5 ? 'hocvien' : `nan${i}@victim.vn`, password: `sai-${i}-mk` });
  }
  const admin = await login(app, 'quantri');
  const res = await admin.get('/admin/security');
  assert.equal(res.status, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.match(res.text, /203\.0\.113\.7/);
  assert.match(res.text, /Đáng ngờ/);
  assert.match(res.text, /n\*\*\*@victim\.vn/, 'email bị che');
  assert.match(res.text, /Tài khoản<\/td><td><code>hocvien<\/code>/, 'tài khoản đang bị khóa lũy tiến');
  const { securitySummary } = require('../src/services/security-monitor');
  const s = await securitySummary();
  assert.ok(s.failures >= 6);
  const user = await login(app, 'hocvien').catch(() => null);
  if (user) assert.equal((await user.get('/admin/security')).status, 403);
});
