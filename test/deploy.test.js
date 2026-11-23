// Chuẩn bị deploy: cấu hình production, /healthz, ảnh đại diện trong GridFS (không ghi đĩa), migration ảnh cũ, noindex
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { setup, teardown, createUser, csrf, login, request } = require('./helpers');

const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnow-uploads-')); // thư mục upload CŨ (chỉ để thử migration)
let app;
before(async () => {
  app = await setup({ DEMO_NOINDEX: 'true', UPLOAD_DIR: legacyDir });
  await createUser('anhdaidien');
});
after(async () => {
  await teardown();
  fs.rmSync(legacyDir, { recursive: true, force: true });
});

function loadConfig(env) {
  const code = "const c=require('./src/config');process.stdout.write(JSON.stringify({proxy:c.trustProxy,https:c.isHttps,demo:c.demo}))";
  try {
    const out = execFileSync(process.execPath, ['-e', code], {
      cwd: path.join(__dirname, '..'),
      env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, ...JSON.parse(String(out)) };
  } catch (e) {
    return { ok: false, error: String(e.stderr) };
  }
}

test('production bắt buộc MONGODB_URI, BASE_URL, SESSION_SECRET ≥ 32; đủ thì chạy với PAYMENT_MODE=demo, không cần PAYPAL_*', () => {
  const base = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://u:p@cluster.example.mongodb.net/cnow',
    BASE_URL: 'https://cnow-demo.onrender.com',
    SESSION_SECRET: 's'.repeat(40),
    PAYPAL_CLIENT_ID: '',
    PAYPAL_CLIENT_SECRET: '',
    PAYPAL_MODE: '',
    PAYMENT_MODE: '',
  };
  assert.match(loadConfig({ ...base, MONGODB_URI: '' }).error, /MONGODB_URI/);
  assert.match(loadConfig({ ...base, BASE_URL: '' }).error, /BASE_URL/);
  assert.match(loadConfig({ ...base, SESSION_SECRET: 'ngan' }).error, /SESSION_SECRET/);
  assert.deepEqual(loadConfig(base), { ok: true, proxy: true, https: true, demo: true });
});

test('GET /healthz: 200 khi CSDL chạy (không tạo phiên, không cache); 503 khi CSDL lỗi', async () => {
  let res = await request(app).get('/healthz');
  assert.equal(res.status, 200);
  assert.deepEqual([res.body.status, res.body.db], ['ok', 'up']);
  assert.equal(res.headers['set-cookie'], undefined, 'không tạo phiên');
  assert.equal(res.headers['cache-control'], 'no-store');
  const mongoose = require('mongoose');
  const db = mongoose.connection.db;
  const orig = db.admin;
  db.admin = () => ({ ping: () => Promise.reject(new Error('down')) });
  try {
    res = await request(app).get('/healthz');
    assert.equal(res.status, 503);
    assert.equal(res.body.db, 'down');
  } finally {
    db.admin = orig;
  }
});

test('DEMO_NOINDEX=true: meta robots noindex, header X-Robots-Tag, robots.txt chặn toàn bộ', async () => {
  const home = await request(app).get('/');
  assert.match(home.text, /<meta name="robots" content="noindex, nofollow">/);
  assert.equal(home.headers['x-robots-tag'], 'noindex, nofollow');
  assert.match((await request(app).get('/robots.txt')).text, /Disallow: \/\n/);
});

async function png(width = 300, height = 200) {
  const sharp = require('sharp');
  return sharp({ create: { width, height, channels: 3, background: '#3366ff' } })
    .png()
    .toBuffer();
}

test('ảnh đại diện lưu trong GridFS (không ghi đĩa): upload → phục vụ /avatars/:file → thay ảnh xóa ảnh cũ → xóa', async () => {
  const { User } = require('../src/models');
  const { findAvatar } = require('../src/services/avatar');
  const agent = await login(app, 'anhdaidien');
  const upload = async (fields, file) => {
    const token = await csrf(agent, '/profile');
    const r = agent.post('/profile/avatar').field('_csrf', token);
    for (const [k, v] of Object.entries(fields)) r.field(k, v);
    if (file) r.attach('avatar', file, { filename: 'a.png', contentType: 'image/png' });
    return r;
  };
  await upload({}, await png());
  const first = (await User.findOne({ username: 'anhdaidien' })).avatar;
  assert.match(first, /^[a-f0-9]{32}\.webp$/);
  assert.ok(await findAvatar(first), 'có trong GridFS');
  assert.equal(fs.readdirSync(legacyDir).length, 0, 'không ghi gì ra thư mục upload');
  const img = await request(app).get(`/avatars/${first}`).buffer(true);
  assert.equal(img.status, 200);
  assert.equal(img.headers['content-type'], 'image/webp');
  assert.equal(img.body.toString('ascii', 8, 12), 'WEBP');
  const sharp = require('sharp');
  const meta = await sharp(img.body).metadata();
  assert.deepEqual([meta.width, meta.height], [256, 256]);

  // File không phải ảnh (đổi đuôi) bị từ chối bằng magic bytes
  await upload({}, Buffer.from('<?php echo 1; ?>'.padEnd(64, ' ')));
  assert.equal((await User.findOne({ username: 'anhdaidien' })).avatar, first);

  await upload({}, await png(120, 400));
  const second = (await User.findOne({ username: 'anhdaidien' })).avatar;
  assert.notEqual(second, first);
  assert.equal(await findAvatar(first), null, 'ảnh cũ đã xóa khỏi GridFS');
  assert.equal((await request(app).get(`/avatars/${first}`)).status, 404);

  await upload({ remove: '1' });
  assert.equal((await User.findOne({ username: 'anhdaidien' })).avatar, undefined);
  assert.equal(await findAvatar(second), null);
});

test('migration avatars-to-gridfs: ảnh cũ trên đĩa được chép vào GridFS (chạy lại không nhân đôi)', async () => {
  const { User } = require('../src/models');
  const { findAvatar, BUCKET } = require('../src/services/avatar');
  const { runMigrations } = require('../src/migrations');
  const name = 'ab'.repeat(16) + '.webp';
  fs.mkdirSync(path.join(legacyDir, 'avatars'), { recursive: true });
  const sharp = require('sharp');
  fs.writeFileSync(
    path.join(legacyDir, 'avatars', name),
    await sharp(await png())
      .resize(256, 256)
      .webp()
      .toBuffer(),
  );
  await createUser('anhcu', 'user', { avatar: name });
  await createUser('anhmat', 'user', { avatar: 'cd'.repeat(16) + '.webp' }); // file không còn trên đĩa
  await runMigrations({ log: () => {} });
  await runMigrations({ log: () => {} });
  assert.ok(await findAvatar(name));
  const mongoose = require('mongoose');
  assert.equal(await mongoose.connection.db.collection(`${BUCKET}.files`).countDocuments({ filename: name }), 1, 'không nhân đôi');
  assert.equal((await request(app).get(`/avatars/${name}`)).status, 200);
  assert.equal((await User.findOne({ username: 'anhmat' })).avatar, 'cd'.repeat(16) + '.webp', 'giữ nguyên trường');
  assert.equal((await request(app).get(`/avatars/${'cd'.repeat(16)}.webp`)).status, 404);
});
