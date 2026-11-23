// Trang tĩnh: giới thiệu dự án và tác giả
const router = require('express').Router();

router.get('/gioi-thieu', (req, res) =>
  res.render('about', {
    title: 'Giới thiệu',
    description: 'Cnow – đồ án tốt nghiệp ngành An toàn thông tin, Học viện Kỹ thuật Mật mã. Tác giả: Hoàng Mạnh Công.',
  }),
);

module.exports = router;
