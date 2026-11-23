// Trang tĩnh: giới thiệu dự án và tác giả
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');

router.get('/gioi-thieu', validate(S.none), (req, res) =>
  res.render('about', {
    title: 'Giới thiệu',
    description: 'Cnow – đồ án tốt nghiệp ngành An toàn thông tin, Học viện Kỹ thuật Mật mã. Tác giả: Hoàng Mạnh Công.',
  }),
);

router.get('/chinh-sach-bao-mat', validate(S.none), (req, res) =>
  res.render('privacy', {
    title: 'Chính sách bảo mật',
    description: 'Cnow thu thập dữ liệu gì, để làm gì, lưu bao lâu và quyền của bạn với dữ liệu cá nhân.',
  }),
);

module.exports = router;
