// Nạp trong <head> (không defer) để áp dụng chế độ sáng/tối TRƯỚC khi trang hiển thị, tránh nháy màu.
// Lựa chọn lưu trong localStorage; chưa chọn thì theo cài đặt hệ điều hành (prefers-color-scheme).
(() => {
  try {
    const t = localStorage.getItem('cnow.theme');
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
  } catch {
    /* trình duyệt chặn localStorage: dùng theo hệ điều hành */
  }
})();
