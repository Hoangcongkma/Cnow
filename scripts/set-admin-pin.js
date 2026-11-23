// Đặt / đổi / lấy lại MÃ QUẢN TRỊ cho tài khoản admin: npm run set:admin-pin
// - Hỏi tên đăng nhập, rồi nhập mã 2 lần ở chế độ ẩn ký tự (không hiện trên màn hình).
// - KHÔNG nhận mã qua tham số dòng lệnh hay biến môi trường (tránh lộ trong lịch sử lệnh / danh sách tiến trình).
// - Chỉ lưu hash bcrypt vào CSDL theo MONGODB_URI hiện tại. Ai chạy được script này = có quyền truy cập CSDL.
const mongoose = require('mongoose');
const config = require('../src/config');
const { User } = require('../src/models');
const { checkPinRules, hashPin } = require('../src/services/admin-pin');

/** Lưu mã quản trị (dùng chung cho script và kiểm thử). Đăng xuất mọi phiên cũ của tài khoản. */
async function setAdminPin(username, pin) {
  const errors = checkPinRules(pin);
  if (errors.length) throw new Error(errors.join(' '));
  const user = await User.findOne({
    username: String(username || '')
      .trim()
      .toLowerCase(),
  });
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  if (user.role !== 'admin') throw new Error('Tài khoản này không phải quản trị viên (role=admin).');
  await User.updateOne(
    { _id: user._id },
    {
      $set: { adminPinHash: await hashPin(pin), adminPinSetAt: new Date() },
      $unset: { adminPinFails: '', adminPinLockedUntil: '' },
      $inc: { sessionVersion: 1 }, // đổi/lấy lại mã → các phiên admin đang mở phải đăng nhập lại
    },
  );
  return user.username;
}

/** Đọc 1 dòng; hidden=true → bật raw mode, không in ký tự nào ra màn hình. */
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let buf = '';
    if (hidden) stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    const done = (err) => {
      stdin.removeListener('data', onData);
      if (hidden) stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (err) reject(err);
      else resolve(buf);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done();
        if (ch === '\u0003' || ch === '\u0004') return done(new Error('Đã hủy.'));
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
        else if (ch >= ' ') buf += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (process.argv.length > 2) throw new Error('Script không nhận tham số. Chạy: npm run set:admin-pin rồi nhập theo hướng dẫn.');
  if (!process.stdin.isTTY) throw new Error('Cần chạy trong terminal tương tác (để nhập mã ở chế độ ẩn).');
  let where = 'CSDL';
  try {
    const u = new URL(config.mongoUri);
    where = `${u.host}${u.pathname}`; // chỉ in host + tên CSDL, không in tài khoản/mật khẩu
  } catch {
    /* URI dạng khác: không in */
  }
  console.log(`Đặt mã quản trị – ${where}`);
  console.log('Yêu cầu: ≥ 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.\n');
  await mongoose.connect(config.mongoUri);
  try {
    const username = await ask('Tên đăng nhập admin: ');
    const pin1 = await ask('Mã quản trị mới (ẩn): ', { hidden: true });
    const errors = checkPinRules(pin1);
    if (errors.length) throw new Error(errors.join('\n'));
    const pin2 = await ask('Nhập lại mã quản trị (ẩn): ', { hidden: true });
    if (pin1 !== pin2) throw new Error('Hai lần nhập không khớp.');
    const name = await setAdminPin(username, pin1);
    console.log(`Đã đặt mã quản trị cho ${name}`);
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { setAdminPin };

if (require.main === module) {
  main().catch(async (e) => {
    console.error(`✗ ${e.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
