// Xác thực hai lớp (TOTP – RFC 6238) dùng otplib + mã QR (qrcode).
// - Bí mật TOTP được MÃ HÓA (AES-256-GCM) trước khi lưu CSDL.
// - Mã khôi phục: 8 mã dùng 1 lần, chỉ lưu SHA-256 (mã ngẫu nhiên 40 bit nên băm nhanh là đủ), hiển thị cho người dùng đúng 1 lần.
// - Chống dùng lại mã: chấp nhận lệch ±1 bước 30 giây nhưng bước thời gian phải lớn hơn bước đã dùng lần trước.
const crypto = require('crypto');
const { generateSecret, verify, generateURI } = require('otplib');
const QRCode = require('qrcode');
const config = require('../config');

const ISSUER = 'Cnow';
const RECOVERY_COUNT = 8;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // bỏ ký tự dễ nhầm (0/o, 1/l/i)

// Khóa mã hóa: config.mfaKey = MFA_KEY nếu có, nếu không là SESSION_SECRET (đổi khóa thì người dùng phải thiết lập lại 2FA)
const key = crypto.createHash('sha256').update(`cnow-mfa:${config.mfaKey}`).digest();

/** Mã hóa bí mật TOTP (AES-256-GCM) → "v1:iv:tag:data" (base64) để lưu CSDL. */
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}
/** Giải mã chuỗi do encrypt() tạo; sai khóa / bị sửa → ném lỗi (GCM xác thực). */
function decrypt(blob) {
  const [v, iv, tag, data] = String(blob || '').split(':');
  if (v !== 'v1') throw new Error('Định dạng bí mật 2FA không hợp lệ');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}

/** Bí mật TOTP mới (base32) cho bước thiết lập 2FA. */
const newSecret = () => generateSecret();

/** URI otpauth:// + ảnh QR (data URL) để quét bằng ứng dụng xác thực. */
async function qrFor(user, secret) {
  const uri = generateURI({ issuer: ISSUER, label: user.email || user.username, secret });
  return { uri, dataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220, errorCorrectionLevel: 'M' }) };
}

/** Kiểm tra mã 6 số. Trả về { ok, step }. lastStep: bước đã dùng gần nhất (chống dùng lại). */
async function checkTotp(secret, code, lastStep = 0) {
  const token = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(token)) return { ok: false };
  const r = await verify({ secret, token, epochTolerance: 30 });
  if (!r.valid || !(r.timeStep > (lastStep || 0))) return { ok: false };
  return { ok: true, step: r.timeStep };
}

const hashCode = (code) =>
  crypto
    .createHash('sha256')
    .update(
      String(code)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''),
    )
    .digest('hex');

/** Tạo 8 mã khôi phục mới: trả về { codes (hiển thị 1 lần), records (lưu CSDL) }. */
function newRecoveryCodes() {
  const codes = Array.from({ length: RECOVERY_COUNT }, () => {
    const bytes = crypto.randomBytes(8);
    const s = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
    return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
  });
  return { codes, records: codes.map((c) => ({ hash: hashCode(c), usedAt: null })) };
}

/** Dùng một mã khôi phục (đánh dấu đã dùng trên document user, chưa lưu). Trả về true nếu hợp lệ. */
function useRecoveryCode(user, code) {
  const h = hashCode(code);
  if (
    !/^[a-z0-9]{8}$/.test(
      String(code)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''),
    )
  )
    return false;
  const rec = (user.mfaRecovery || []).find((r) => !r.usedAt && crypto.timingSafeEqual(Buffer.from(r.hash), Buffer.from(h)));
  if (!rec) return false;
  rec.usedAt = new Date();
  return true;
}

/** Số mã khôi phục chưa dùng của người dùng. */
const recoveryLeft = (user) => (user.mfaRecovery || []).filter((r) => !r.usedAt).length;

module.exports = { encrypt, decrypt, newSecret, qrFor, checkTotp, newRecoveryCodes, useRecoveryCode, recoveryLeft };
