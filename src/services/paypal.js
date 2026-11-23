// Tích hợp PayPal Orders API v2 (https://developer.paypal.com/docs/api/orders/v2/)
// Luồng: createOrder -> chuyển người dùng sang PayPal -> PayPal trả về return_url?token=<orderId> -> captureOrder
const config = require('../config');

const API = config.paypal.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
let cached = { token: null, exp: 0 };

async function accessToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const basic = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64');
  const res = await fetch(`${API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal OAuth lỗi ${res.status}`);
  const data = await res.json();
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

async function call(path, body, requestId) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}), // chống tạo trùng khi gửi lại
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`PayPal API ${path} lỗi ${res.status}: ${data.name || ''} ${data.message || ''}`.trim());
    err.details = data;
    throw err;
  }
  return data;
}

/** Tạo đơn trên PayPal. Giá lấy từ CSDL phía server, không bao giờ lấy từ trình duyệt. */
async function createOrder({ referenceId, amount, description, returnUrl, cancelUrl }) {
  const data = await call(
    '/v2/checkout/orders',
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceId,
          description: description.slice(0, 127),
          amount: { currency_code: config.paypal.currency, value: amount },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Cnow',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    },
    `create-${referenceId}`,
  );
  const link = (data.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!link) throw new Error('PayPal không trả về đường dẫn xác nhận thanh toán');
  return { id: data.id, approveUrl: link.href };
}

/** Xác nhận (capture) giao dịch sau khi người dùng đồng ý trên PayPal. */
async function captureOrder(orderId) {
  const data = await call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, null, `capture-${orderId}`);
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status, // COMPLETED nếu thành công
    captureStatus: capture?.status,
    captureId: capture?.id,
    amount: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
    payerEmail: data.payer?.email_address,
  };
}

module.exports = { createOrder, captureOrder };
