// Chép thư viện phía trình duyệt từ node_modules vào public/vendor (tự host, không dùng CDN – CSP chỉ cho 'self').
// Chạy sau khi cập nhật phiên bản (vd. Dependabot nâng chart.js): npm run vendor:sync
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
  ['node_modules/chart.js/dist/chart.umd.min.js', 'public/vendor/chartjs/chart.umd.min.js'],
  ['node_modules/chart.js/LICENSE.md', 'public/vendor/chartjs/LICENSE.md'],
];

for (const [from, to] of FILES) {
  fs.mkdirSync(path.dirname(path.join(ROOT, to)), { recursive: true });
  fs.copyFileSync(path.join(ROOT, from), path.join(ROOT, to));
  console.log(`✓ ${from} → ${to}`);
}
