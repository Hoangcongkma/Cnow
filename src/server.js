const mongoose = require('mongoose');
const config = require('./config');

(async () => {
  await mongoose.connect(config.mongoUri);
  console.log('✓ Đã kết nối MongoDB');
  await require('./migrations').runMigrations(); // idempotent: chuyển dữ liệu định dạng cũ (nếu có)
  // Tạo index MongoDB khai báo trong schema (an toàn khi chạy lại; KHÔNG xóa index lạ như syncIndexes)
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  console.log('✓ Index CSDL sẵn sàng');
  const app = require('./app'); // nạp sau khi có kết nối (session store dùng chung client)
  const server = require('http').createServer(app);
  require('./realtime').attachRealtime(server, app); // chat Socket.IO dùng chung cổng và phiên đăng nhập
  server.listen(config.port, () => {
    console.log(`✓ Cnow đang chạy tại ${config.baseUrl}`);
    if (config.demo) console.log('! PAYMENT_MODE=demo → cổng thanh toán MÔ PHỎNG (PayPal/VNPay/MoMo), không phát sinh giao dịch thật');
    else if (!config.paypal.configured) console.log('! PAYMENT_MODE=paypal nhưng chưa có khóa PayPal → TẮT thanh toán khóa có phí');
  });
})().catch((err) => {
  console.error('✗ Không khởi động được:', err.message);
  process.exit(1);
});
