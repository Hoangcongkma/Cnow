// Sao lưu / khôi phục MongoDB bằng driver Node (không cần cài MongoDB Database Tools).
// Mỗi collection → <tên>.jsonl.gz (Extended JSON chuẩn, giữ đúng kiểu ObjectId/Date/Binary – kể cả ảnh GridFS),
// manifest.json ghi số bản ghi và định nghĩa index để khôi phục.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const { EJSON } = require('mongoose').mongo.BSON; // bson đi kèm driver MongoDB

const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

/** Sao lưu toàn bộ collection (trừ system.*) của db vào thư mục mới trong outRoot. Trả về đường dẫn thư mục. */
async function backupTo(db, outRoot, { log = () => {} } = {}) {
  const dir = path.join(outRoot, `cnow-${stamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = { format: 'cnow-backup/1', createdAt: new Date().toISOString(), database: db.databaseName, collections: {} };
  const cols = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));
  for (const name of cols.sort()) {
    const col = db.collection(name);
    let count = 0;
    const cursor = col.find({});
    const lines = Readable.from(
      (async function* gen() {
        for await (const doc of cursor) {
          count++;
          yield EJSON.stringify(doc, { relaxed: false }) + '\n';
        }
      })(),
    );
    await pipeline(lines, zlib.createGzip(), fs.createWriteStream(path.join(dir, `${name}.jsonl.gz`)));
    const indexes = (await col.indexes()).filter((ix) => ix.name !== '_id_');
    manifest.collections[name] = { count, indexes };
    log(`  ${name.padEnd(24)} ${count}`);
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}

/**
 * Khôi phục từ thư mục sao lưu. drop=true: xóa collection hiện có trước khi nạp (khôi phục đúng trạng thái lúc sao lưu).
 * Trả về { collection: số bản ghi đã nạp }.
 */
async function restoreFrom(db, dir, { drop = false, log = () => {} } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.format !== 'cnow-backup/1') throw new Error('Thư mục không phải bản sao lưu Cnow hợp lệ (thiếu manifest).');
  const out = {};
  for (const [name, info] of Object.entries(manifest.collections)) {
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error(`Tên collection không hợp lệ: ${name}`);
    const col = db.collection(name);
    if (drop) await col.drop().catch(() => {});
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, `${name}.jsonl.gz`)).pipe(zlib.createGunzip()) });
    let batch = [];
    let n = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      batch.push(EJSON.parse(line, { relaxed: false }));
      if (batch.length >= 1000) {
        await col.insertMany(batch, { ordered: false });
        n += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await col.insertMany(batch, { ordered: false });
      n += batch.length;
    }
    for (const ix of info.indexes || []) {
      const { key, name: ixName, v, ns, ...options } = ix; // eslint-disable-line no-unused-vars
      await col.createIndex(key, { name: ixName, ...options }).catch(() => {});
    }
    out[name] = n;
    log(`  ${name.padEnd(24)} ${n}`);
  }
  return out;
}

module.exports = { backupTo, restoreFrom, stamp };
