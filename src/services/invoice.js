// Hóa đơn (biên nhận thanh toán) PDF bằng pdfkit, font DejaVu Sans nhúng sẵn (hỗ trợ đủ tiếng Việt) trong assets/fonts
const path = require('path');
const PDFDocument = require('pdfkit');

const FONT = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSans.ttf');
const FONT_BOLD = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSans-Bold.ttf');
const BRAND = '#c2410c';
const INK = '#1d2129';
const MUTED = '#6b7280';

const pad = (n) => String(n).padStart(2, '0');
const vnDate = (d) => {
  const x = new Date(new Date(d).getTime() + 7 * 3600 * 1000); // giờ Việt Nam (UTC+7)
  return `${pad(x.getUTCDate())}/${pad(x.getUTCMonth() + 1)}/${x.getUTCFullYear()} ${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
};
const usd = (s) => `$${Number(s).toFixed(2)}`;

/** Số hóa đơn ổn định từ đơn hàng: INV-YYYYMM-<8 ký tự cuối của mã đơn>. */
function invoiceNumber(order) {
  const d = new Date(new Date(order.createdAt).getTime() + 7 * 3600 * 1000);
  return `INV-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}-${String(order._id).slice(-8).toUpperCase()}`;
}

const { methodLabel, isDemo, DEMO_NOTE, STATUS } = require('./order-labels');
const { formatVnd } = require('./money');

const LINE = '#e5e7eb';
const hr = (doc, y, W) =>
  doc
    .moveTo(50, y)
    .lineTo(50 + W, y)
    .strokeColor(LINE)
    .stroke();

/** Logo + tiêu đề, số hóa đơn, ngày thanh toán (cột phải); dòng sau tính theo vị trí thực tế vì tiêu đề có thể xuống dòng. */
function drawHeader(doc, order, W) {
  doc.font('bold').fontSize(24).fillColor(BRAND).text('C', 50, 50, { continued: true }).fillColor(INK).text('now');
  doc.font('regular').fontSize(9).fillColor(MUTED).text('Website học lập trình trực tuyến', 50, 80);
  const right = { x: 220, width: W - 170, align: 'right' };
  doc.font('bold').fontSize(13).fillColor(INK).text('HÓA ĐƠN / BIÊN NHẬN THANH TOÁN', right.x, 54, right);
  doc.font('regular').fontSize(10).fillColor(MUTED);
  doc.text(`Số: ${invoiceNumber(order)}`, right.x, doc.y + 4, right);
  doc.text(`Ngày thanh toán: ${vnDate(order.updatedAt || order.createdAt)}`, right.x, doc.y + 2, right);
  hr(doc, Math.max(115, doc.y + 10), W);
}

/** Đơn của cổng mô phỏng: dấu "DEMO" rõ ràng ở đầu trang. */
function drawDemoStamp(doc, W) {
  const bx = 50 + W - 230;
  doc.save().roundedRect(bx, 128, 230, 44, 6).lineWidth(1.5).dash(4, { space: 3 }).strokeColor('#d97706').stroke().restore();
  doc.font('bold').fontSize(16).fillColor('#b45309').text('DEMO', bx, 133, { width: 230, align: 'center' });
  doc
    .font('regular')
    .fontSize(8.5)
    .fillColor('#92400e')
    .text('Không phải giao dịch thật – không phát sinh tiền', bx, 154, { width: 230, align: 'center' });
}

function drawBuyer(doc, user, W) {
  doc.font('bold').fontSize(11).fillColor(INK).text('Người mua', 50, 130);
  doc.font('regular').fontSize(10).fillColor(INK);
  const bw = { width: W - 250, lineBreak: false, ellipsis: true }; // chừa chỗ cho dấu DEMO bên phải
  doc.text(user.name, 50, 148, bw);
  doc.fillColor(MUTED).text(user.email, 50, 163, bw);
  doc.text(`Tài khoản: @${user.username}`, 50, 178, bw);
}

/** Bảng nội dung: khóa học, giảm giá, tổng, số tiền VND (cổng demo VND), hoàn tiền. Trả về vị trí y kế tiếp. */
function drawItems(doc, order, course, W) {
  let y = 215;
  doc.rect(50, y, W, 24).fill('#f3f4f6');
  doc.font('bold').fontSize(10).fillColor(INK);
  doc.text('Nội dung', 60, y + 7);
  doc.text('Thành tiền (USD)', 50 + W - 150, y + 7, { width: 140, align: 'right' });
  y += 34;
  const row = (label, value, { bold = false, color = INK } = {}) => {
    doc
      .font(bold ? 'bold' : 'regular')
      .fontSize(10)
      .fillColor(color);
    const h = doc.heightOfString(label, { width: W - 180 });
    doc.text(label, 60, y, { width: W - 180 });
    doc.text(value, 50 + W - 150, y, { width: 140, align: 'right' });
    y += Math.max(h, 14) + 10;
  };
  row(`Khóa học: ${course ? course.title : '(khóa học đã xóa)'}`, usd(order.originalAmount || order.amount));
  if (order.couponCode) row(`Mã giảm giá ${order.couponCode}`, `-${usd(order.discount || 0)}`, { color: '#15803d' });
  hr(doc, y, W);
  y += 10;
  row('Tổng thanh toán', `${usd(order.amount)} ${order.currency || 'USD'}`, { bold: true });
  if (order.amountVnd && ['vnpay', 'momo'].includes(order.gateway)) {
    row(`Đã thanh toán qua ${methodLabel(order)} (tỉ giá demo)`, formatVnd(order.amountVnd), { color: MUTED });
  }
  if (order.status === 'REFUNDED') row('Đã hoàn tiền (demo)', `-${usd(order.amount)}`, { color: '#6d28d9' });
  return y;
}

function drawTransaction(doc, order, W, startY) {
  let y = startY + 16;
  doc.font('bold').fontSize(11).fillColor(INK).text('Thông tin giao dịch', 50, y);
  y += 20;
  const info = [
    ['Phương thức', methodLabel(order)],
    ['Mã đơn hàng', String(order._id)],
    ['Mã giao dịch', order.captureId || '—'],
    ['Trạng thái', order.status === 'COMPLETED' ? 'Đã thanh toán' : STATUS[order.status] || order.status],
    ...(order.refundedAt ? [['Hoàn tiền lúc', vnDate(order.refundedAt)]] : []),
  ];
  for (const [k, v] of info) {
    doc.font('regular').fontSize(10).fillColor(MUTED).text(k, 50, y, { width: 130 });
    doc.fillColor(INK).text(v, 180, y, { width: W - 130 });
    y += 18;
  }
}

function drawFooter(doc, order, W) {
  const text = isDemo(order)
    ? `${DEMO_NOTE}. Biên nhận được tạo từ cổng thanh toán MÔ PHỎNG của website demo đồ án Cnow, không phát sinh tiền và ` +
      'không có giá trị thanh toán hay giá trị như hóa đơn giá trị gia tăng (GTGT).'
    : 'Đây là biên nhận điện tử xác nhận giao dịch mua khóa học trên Cnow, không thay thế hóa đơn giá trị gia tăng (GTGT). ' +
      'Thông tin thẻ/tài khoản thanh toán do PayPal xử lý, Cnow không lưu trữ.';
  doc
    .font('regular')
    .fontSize(8.5)
    .fillColor(MUTED)
    .text(text, 50, doc.page.height - 100, { width: W, align: 'center' });
}

/**
 * Tạo hóa đơn PDF, trả về stream (pipe vào response).
 * @param {{ order: object, user: { name: string, email: string, username: string }, course?: { title: string } }} data
 * @param {{ compress?: boolean }} [opts] compress=false dùng cho kiểm thử (đọc được nội dung PDF)
 */
function buildInvoice({ order, user, course }, opts = {}) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    compress: opts.compress !== false,
    info: {
      Title: `Hóa đơn ${invoiceNumber(order)}`,
      Author: 'Cnow',
      Subject: isDemo(order) ? `Biên nhận thanh toán khóa học – ${DEMO_NOTE}` : 'Biên nhận thanh toán khóa học',
      Keywords: isDemo(order) ? 'DEMO' : 'Cnow',
      CreationDate: new Date(order.updatedAt || order.createdAt),
    },
  });
  doc.registerFont('regular', FONT);
  doc.registerFont('bold', FONT_BOLD);
  const W = doc.page.width - 100;
  drawHeader(doc, order, W);
  if (isDemo(order)) drawDemoStamp(doc, W);
  drawBuyer(doc, user, W);
  drawTransaction(doc, order, W, drawItems(doc, order, course, W));
  drawFooter(doc, order, W);
  doc.end();
  return doc;
}

module.exports = { buildInvoice, invoiceNumber };
