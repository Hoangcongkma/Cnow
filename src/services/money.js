// Tiền tệ: giá gốc lưu USD; VND chỉ để hiển thị và cho cổng VNPay/MoMo DEMO (tỉ giá DEMO_USD_VND, mặc định 26000).
// Tính theo cent (số nguyên) để không sai số số thực.
const config = require('../config');

/** USD → số cent nguyên (tính tiền bằng số nguyên, tránh lỗi số thực). */
const cents = (usd) => Math.round(Number(usd) * 100);
/** USD ("19.99" hoặc 19.99) → VND số nguyên, làm tròn tới đồng. */
const toVnd = (usd, rate = config.usdVnd) => Math.round((cents(usd) * rate) / 100);
/** 519740 → "519.740 ₫" */
const formatVnd = (vnd) => `${Math.round(Number(vnd)).toLocaleString('vi-VN')} ₫`;
/** 19.9 → "$19.90" */
const usd = (n) => '$' + Number(n).toFixed(2);

module.exports = { cents, toVnd, formatVnd, usd };
