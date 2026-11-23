// Tên file tĩnh kèm hash nội dung: /css/style.css → /css/style.<10 hex>.css
// File có hash được cache 1 năm (immutable); nội dung đổi → hash đổi → trình duyệt tự tải bản mới.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC = path.join(__dirname, '..', '..', 'public');
const cache = new Map(); // đường dẫn → { mtimeMs, hash } (tính lại khi file đổi, hữu ích khi dev)
const HASHED = /^(\/[A-Za-z0-9_./-]+)\.([0-9a-f]{10})\.(css|js|svg|png|jpg|jpeg|webp|woff2)$/;

function hashOf(rel) {
  const abs = path.join(PUBLIC, rel);
  if (!abs.startsWith(PUBLIC + path.sep)) throw new Error('đường dẫn không hợp lệ');
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- đã chặn thoát khỏi thư mục public/ ở dòng trên
  const st = fs.statSync(abs);
  const c = cache.get(rel);
  if (c && c.mtimeMs === st.mtimeMs) return c.hash;
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- như trên: chỉ file trong public/
  const hash = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 10);
  cache.set(rel, { mtimeMs: st.mtimeMs, hash });
  return hash;
}

/** Dùng trong view: <%= asset('/css/style.css') %>. File không tồn tại thì trả nguyên đường dẫn. */
function asset(url) {
  try {
    return url.replace(/\.(\w+)$/, `.${hashOf(url)}.$1`);
  } catch {
    return url;
  }
}

/** Middleware phục vụ file có hash: đúng hash → cache 1 năm; hash cũ → vẫn trả file nhưng không cache lâu. */
function hashedStatic(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const m = req.path.match(HASHED);
  if (!m) return next();
  const rel = `${m[1]}.${m[3]}`;
  let current;
  try {
    current = hashOf(rel);
  } catch {
    return next();
  }
  const fresh = current === m[2];
  res.sendFile(rel, { root: PUBLIC, dotfiles: 'deny', maxAge: fresh ? '365d' : 0, immutable: fresh }, (err) => {
    if (err && !res.headersSent) next();
  });
}

module.exports = { asset, hashedStatic };
