// Ảnh đại diện: kiểm tra magic bytes (không tin phần mở rộng/Content-Type), resize 256x256 WebP, lưu trong MongoDB GridFS
// (bucket "avatars", tên file ngẫu nhiên). KHÔNG ghi file ra đĩa → chạy được trên nền tảng có ổ đĩa tạm (Render…).
const crypto = require('crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');

const BUCKET = 'avatars';
const MAX_BYTES = 2 * 1024 * 1024;
const NAME_RE = /^[a-f0-9]{32}\.webp$/;
const MAX_SIDE = 4096;
sharp.concurrency(1); // xử lý ảnh từng luồng, tránh nhiều upload song song làm cạn bộ nhớ

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });

/** Nhận diện định dạng từ các byte đầu file. Chỉ chấp nhận JPEG, PNG, WebP. */
function sniff(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Kiểm tra + chuyển ảnh thành WebP 256x256 (không lưu). Ném lỗi có userMessage nếu ảnh không hợp lệ. */
async function processAvatar(buf) {
  const fail = (m) => Object.assign(new Error(m), { userMessage: m });
  if (!buf || !buf.length) throw fail('Hãy chọn một ảnh.');
  if (buf.length > MAX_BYTES) throw fail('Ảnh tối đa 2MB.');
  const kind = sniff(buf);
  if (!kind) throw fail('Chỉ nhận ảnh JPEG, PNG hoặc WebP.');
  try {
    // Chống "bom giải nén": file 2MB có thể khai báo ảnh rất lớn → giới hạn số điểm ảnh và kích thước mỗi chiều
    const img = sharp(buf, { limitInputPixels: 16_777_216, failOn: 'error' });
    const meta = await img.metadata();
    if (meta.format !== kind && !(kind === 'jpeg' && meta.format === 'jpg')) throw new Error('format mismatch');
    if (!(meta.width <= MAX_SIDE && meta.height <= MAX_SIDE)) throw Object.assign(new Error('too big'), { tooBig: true });
    // rotate(): xoay theo EXIF; ảnh xuất ra mới hoàn toàn nên metadata (EXIF, GPS…) bị loại bỏ
    return await img.rotate().resize(256, 256, { fit: 'cover', position: 'attention' }).webp({ quality: 85 }).toBuffer();
  } catch (e) {
    throw fail(e.tooBig ? `Ảnh tối đa ${MAX_SIDE}×${MAX_SIDE} điểm ảnh.` : 'Không đọc được ảnh – file có thể bị hỏng.');
  }
}

/** Ghi buffer WebP vào GridFS với tên cho trước. */
function putFile(name, data, metadata = {}) {
  return new Promise((resolve, reject) => {
    const up = bucket().openUploadStream(name, { contentType: 'image/webp', metadata });
    up.once('finish', resolve).once('error', reject);
    up.end(data);
  });
}

/** Kiểm tra, xử lý và lưu ảnh. Trả về tên file (dạng <32 hex>.webp). */
async function saveAvatar(buf, userId) {
  const out = await processAvatar(buf);
  const name = crypto.randomBytes(16).toString('hex') + '.webp';
  await putFile(name, out, userId ? { user: String(userId) } : {});
  return name;
}

async function removeAvatar(name) {
  if (!NAME_RE.test(String(name || ''))) return;
  const b = bucket();
  for (const f of await b.find({ filename: name }).toArray()) await b.delete(f._id).catch(() => {});
}

/** Thông tin file (hoặc null) – dùng để trả 404 trước khi gửi header ảnh. */
async function findAvatar(name) {
  if (!NAME_RE.test(String(name || ''))) return null;
  return (await bucket().find({ filename: name }).limit(1).toArray())[0] || null;
}

const openAvatar = (file) => bucket().openDownloadStream(file._id);

module.exports = { BUCKET, MAX_BYTES, NAME_RE, sniff, processAvatar, putFile, saveAvatar, removeAvatar, findAvatar, openAvatar };
