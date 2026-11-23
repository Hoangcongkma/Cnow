// Nhãn hiển thị đơn hàng dùng chung cho view, hóa đơn PDF, CSV
const GATEWAYS = {
  paypal: { label: 'PayPal (mô phỏng)', currency: 'USD', icon: '💳' },
  vnpay: { label: 'VNPay (mô phỏng)', currency: 'VND', icon: '🏦' },
  momo: { label: 'Ví MoMo (mô phỏng)', currency: 'VND', icon: '📱' },
};
const STATUS = {
  CREATED: 'Chờ thanh toán',
  COMPLETED: 'Thành công',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};
const STATUSES = Object.keys(STATUS);
const DEMO_NOTE = 'DEMO – không phải giao dịch thật';

/** Đơn của cổng mô phỏng (demo hiện tại hoặc PayPal mô phỏng đời cũ) */
const isDemo = (o) => o && (o.provider === 'demo' || o.provider === 'mock');

/** Tên phương thức thanh toán hiển thị cho một đơn (cổng demo ghi rõ "mô phỏng"). */
function methodLabel(o) {
  if (o.provider === 'paypal') return 'PayPal';
  if (o.provider === 'mock') return 'PayPal (mô phỏng)';
  if (o.provider === 'free') return o.couponCode ? 'Miễn phí (mã giảm giá 100%)' : 'Miễn phí';
  return GATEWAYS[o.gateway]?.label || 'Cổng demo (chưa chọn)';
}

/** Có hóa đơn: đã thanh toán (kể cả đã hoàn tiền sau đó), hoặc miễn phí nhờ mã giảm giá */
const billable = (o) => o && ['COMPLETED', 'REFUNDED'].includes(o.status) && (o.provider !== 'free' || Boolean(o.couponCode));
/** Admin hoàn tiền được: chỉ đơn demo đã thành công (PayPal thật: không làm – thanh toán chỉ demo) */
const refundable = (o) => isDemo(o) && o.status === 'COMPLETED' && Number(o.amount) > 0;

module.exports = { GATEWAYS, STATUS, STATUSES, DEMO_NOTE, isDemo, methodLabel, billable, refundable };
