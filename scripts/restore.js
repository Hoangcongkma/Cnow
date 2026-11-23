// Khôi phục CSDL: npm run restore -- --from=backups/cnow-20261124-010203 --yes [--drop]
//   --from=<thư mục do backup.js tạo> hoặc <file .archive.gz của mongodump>
//   --yes   bắt buộc (thao tác ghi đè dữ liệu)
//   --drop  xóa collection hiện có trước khi nạp (khôi phục đúng trạng thái lúc sao lưu)
// NODE_ENV=production: từ chối nếu không có thêm --allow-production.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');
const config = require('../src/config');
const { restoreFrom } = require('./lib/backup');

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

(async () => {
  const from = arg('from');
  if (!from) throw new Error('Thiếu --from=<thư mục hoặc file sao lưu>');
  if (!args.includes('--yes')) throw new Error('Khôi phục sẽ GHI ĐÈ dữ liệu. Thêm --yes nếu chắc chắn.');
  if (config.isProd && !args.includes('--allow-production'))
    throw new Error('NODE_ENV=production: thêm --allow-production nếu thực sự muốn.');
  const src = path.resolve(from);
  const drop = args.includes('--drop');
  if (fs.statSync(src).isFile()) {
    const r = spawnSync('mongorestore', [`--uri=${config.mongoUri}`, `--archive=${src}`, '--gzip', ...(drop ? ['--drop'] : [])], {
      stdio: 'inherit',
    });
    if (r.status !== 0) throw new Error('mongorestore thất bại (cần cài MongoDB Database Tools)');
    console.log('✓ Đã khôi phục (mongorestore)');
    return;
  }
  await mongoose.connect(config.mongoUri);
  console.log(`Khôi phục từ ${src}${drop ? ' (xóa dữ liệu hiện có trước)' : ''}:`);
  await restoreFrom(mongoose.connection.db, src, { drop, log: console.log });
  await mongoose.disconnect();
  console.log('✓ Đã khôi phục. Khởi động lại server để tạo lại index/phiên nếu cần.');
})().catch(async (e) => {
  console.error(`✗ ${e.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
