// Sao lưu CSDL: npm run backup [-- --out=backups]
// Có MongoDB Database Tools (mongodump) → dùng mongodump (--archive --gzip); không có → sao lưu bằng driver Node.
// Thư mục backups/ đã nằm trong .gitignore – bản sao lưu chứa dữ liệu cá nhân, phải cất giữ an toàn (mã hóa đĩa, giới hạn quyền).
const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');
const config = require('../src/config');
const { backupTo, stamp } = require('./lib/backup');

const arg = (name, dflt) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
const outRoot = path.resolve(arg('out', path.join(__dirname, '..', 'backups')));
const method = arg('method', 'auto');

function hasMongodump() {
  const r = spawnSync('mongodump', ['--version'], { stdio: 'ignore', shell: false });
  return r.status === 0;
}

(async () => {
  if (method === 'mongodump' || (method === 'auto' && hasMongodump())) {
    const file = path.join(outRoot, `cnow-${stamp()}.archive.gz`);
    require('fs').mkdirSync(outRoot, { recursive: true });
    // URI truyền qua tham số tiến trình con (không in ra log)
    const r = spawnSync('mongodump', [`--uri=${config.mongoUri}`, `--archive=${file}`, '--gzip'], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('mongodump thất bại');
    console.log(`✓ Đã sao lưu (mongodump) vào ${file}`);
    return;
  }
  await mongoose.connect(config.mongoUri);
  console.log('Sao lưu bằng driver Node (không thấy mongodump):');
  const dir = await backupTo(mongoose.connection.db, outRoot, { log: console.log });
  await mongoose.disconnect();
  console.log(`✓ Đã sao lưu vào ${dir}`);
})().catch(async (e) => {
  console.error(`✗ ${e.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
