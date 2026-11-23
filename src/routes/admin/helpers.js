// Tiện ích dùng chung cho các route quản trị
const { safeRedirect } = require('../../utils/security');

/** Quay lại đúng trang danh sách (giữ bộ lọc) sau khi thao tác – chỉ chấp nhận đường dẫn nội bộ /admin/… */
const safeBack = (v, dflt) => safeRedirect(v, dflt, '/admin/');

/** 404 chung cho khóa học không tồn tại / không có quyền sửa (không tiết lộ khóa có tồn tại hay không). */
const courseNotFound = (res) =>
  res.status(404).render('error', { title: 'Không tìm thấy', message: 'Không tìm thấy khóa học hoặc bạn không có quyền sửa.' });

module.exports = { safeBack, courseNotFound };
