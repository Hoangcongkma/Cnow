const mongoose = require('mongoose');
const config = require('./config');
const { logger } = require('./logger');

(async () => {
  await mongoose.connect(config.mongoUri);
  logger.info('Đã kết nối MongoDB');
  await require('./migrations').runMigrations(); // idempotent: chuyển dữ liệu định dạng cũ (nếu có)
  // Tạo index MongoDB khai báo trong schema (an toàn khi chạy lại; KHÔNG xóa index lạ như syncIndexes)
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  logger.info('Index CSDL sẵn sàng');
  const app = require('./app'); // nạp sau khi có kết nối (session store dùng chung client)
  const server = require('http').createServer(app);
  // Chống request treo / slowloris: tối đa 30 giây cho cả request, 20 giây để gửi xong header
  server.requestTimeout = 30 * 1000;
  server.headersTimeout = 20 * 1000;
  require('./realtime').attachRealtime(server, app); // chat Socket.IO dùng chung cổng và phiên đăng nhập
  server.listen(config.port, () => {
    logger.info({ baseUrl: config.baseUrl, env: config.env }, 'Cnow đang chạy');
    if (config.demo) logger.warn('PAYMENT_MODE=demo → cổng thanh toán MÔ PHỎNG (PayPal/VNPay/MoMo), không phát sinh giao dịch thật');
    else if (!config.paypal.configured) logger.warn('PAYMENT_MODE=paypal nhưng chưa có khóa PayPal → TẮT thanh toán khóa có phí');
  });
})().catch((err) => {
  logger.fatal({ err }, 'Không khởi động được');
  process.exitCode = 1;
  mongoose.disconnect().catch(() => {});
});
