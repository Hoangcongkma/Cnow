// Phân quyền tập trung: mọi route đều có quy tắc; mọi quy tắc × mọi vai trò (khách, người học, CTV, admin)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setup, teardown, createUser, createCourse, csrf, login, request } = require('./helpers');
const { RULES, LEVELS, ruleFor } = require('../src/security/rbac');

let app;
let course;
const agents = {};
const tokens = {};
before(async () => {
  app = await setup();
  await createUser('hocvien');
  await createUser('ctv', 'collaborator');
  await createUser('quantri', 'admin');
  course = await createCourse({ slug: 'khoa-rbac', price: 0 });
  agents.guest = request.agent(app);
  agents.user = await login(app, 'hocvien');
  agents.collaborator = await login(app, 'ctv');
  agents.admin = await login(app, 'quantri');
  for (const [role, a] of Object.entries(agents)) tokens[role] = await csrf(a, role === 'guest' ? '/login' : '/profile');
});
after(teardown);

/** Mọi route khai báo trong src/routes (admin.js gắn dưới /admin) */
function declaredRoutes() {
  const dir = path.join(__dirname, '..', 'src', 'routes');
  const out = [];
  const files = fs.readdirSync(dir, { recursive: true }).filter((x) => String(x).endsWith('.js'));
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const admin = /^admin[\\/]/.test(String(f)); // routes/admin/* gắn dưới /admin
    for (const m of src.matchAll(/router\.(get|post)\(\s*'([^']+)'/g)) {
      const p = admin ? `/admin${m[2] === '/' ? '' : m[2]}` : m[2];
      out.push([m[1].toUpperCase(), p, String(f)]);
    }
  }
  return out;
}

test('mọi route khai báo đều có đúng quy tắc trong bảng quyền (không route nào bị bỏ sót)', () => {
  const routes = declaredRoutes();
  assert.ok(routes.length > 80, `đọc được ${routes.length} route`);
  for (const [method, p, file] of routes) {
    const exact = RULES.filter(([m, rp]) => m === method && rp === p);
    assert.equal(exact.length, 1, `${method} ${p} (${file}) phải có đúng 1 quy tắc`);
  }
});

const SAMPLE = {
  id: '0123456789abcdef01234567',
  courseId: '0123456789abcdef01234567',
  lessonId: '0123456789abcdef01234567',
  ref: 'DEMO-ORD-0123456789ABCDEF',
  gw: 'paypal',
  file: `${'a'.repeat(32)}.webp`,
  code: 'ABCD1234ABCD1234',
};
const concrete = (p) => p.replace(/:(\w+)/g, (_, k) => (k === 'slug' ? course.slug : SAMPLE[k]));
const SKIP = new Set(['POST /logout', 'POST /profile/sessions/others']); // làm mất phiên của agent – kiểm tra riêng

test('mọi quy tắc × 4 vai trò: được phép → không bị bảng quyền chặn; không được phép → /login hoặc 403', async () => {
  let checked = 0;
  for (const [method, p, level] of RULES) {
    if (SKIP.has(`${method} ${p}`)) continue;
    const url = concrete(p);
    for (const role of ['guest', 'user', 'collaborator', 'admin']) {
      const a = agents[role];
      const res = method === 'GET' ? await a.get(url) : await a.post(url).type('form').send({ _csrf: tokens[role] });
      const label = `${role} ${method} ${url} (${level})`;
      const allowed = LEVELS[level].includes(role);
      assert.ok(res.status < 500, `${label} → ${res.status}`);
      if (allowed) {
        assert.notEqual(res.headers['x-authz'], 'denied', label);
        if (level !== 'public') assert.notEqual(res.headers.location, '/login', `${label} không bị đẩy về đăng nhập`);
      } else if (role === 'guest') {
        assert.equal(res.status, 302, label);
        assert.equal(res.headers.location, '/login', label);
      } else {
        assert.equal(res.status, 403, label);
        assert.equal(res.headers['x-authz'], 'denied', label);
      }
      checked++;
    }
  }
  assert.equal(checked, (RULES.length - SKIP.size) * 4, `đã kiểm tra ${checked} tổ hợp`);
});

test('route không có trong bảng → 404 (không lộ gì); HEAD dùng quy tắc của GET; dấu "/" cuối không vượt được quyền', async () => {
  assert.equal(ruleFor('HEAD', '/admin/users').level, 'admin');
  assert.equal(ruleFor('GET', '/admin/users/').level, 'admin');
  assert.equal((await agents.user.get('/admin/users/')).status, 403);
  assert.equal((await agents.collaborator.get('/admin/users/')).status, 403);
  assert.equal((await agents.user.get('/khong-ton-tai')).status, 404);
});
