# Chính sách bảo mật

## Phiên bản được hỗ trợ

| Phiên bản | Hỗ trợ |
| --- | --- |
| Nhánh `main` (bản kỷ niệm, demo) | ✔ |
| Các bản cũ | ✖ |

Cnow là đồ án / bản demo: **thanh toán chỉ là mô phỏng**, không xử lý tiền hay dữ liệu thẻ thật.

## Báo cáo lỗ hổng

Nếu bạn phát hiện lỗ hổng bảo mật, xin **đừng mở issue công khai**. Hãy báo riêng qua:

1. **GitHub → tab Security → "Report a vulnerability"** (Private vulnerability reporting) của repository này; hoặc
2. Địa chỉ liên hệ ghi trong `/.well-known/security.txt` của website demo.

Nội dung nên có:
- mô tả lỗ hổng và tác động;
- các bước tái hiện (URL, tham số, tài khoản thử);
- phiên bản / commit;
- đề xuất khắc phục (nếu có).

Vui lòng **không** truy cập, sửa hoặc xóa dữ liệu của người khác, không tấn công từ chối dịch vụ và không dùng kỹ thuật lừa đảo người dùng khi thử nghiệm.

## Quy trình xử lý

| Bước | Thời hạn mục tiêu |
| --- | --- |
| Xác nhận đã nhận báo cáo | 3 ngày làm việc |
| Đánh giá mức độ (CVSS) và phản hồi hướng xử lý | 7 ngày |
| Bản vá cho lỗi Critical / High | 14 ngày |
| Bản vá cho lỗi Medium / Low | 30–90 ngày |

Sau khi có bản vá, người báo cáo được ghi công trong ghi chú phát hành (nếu đồng ý).

## Phạm vi

**Trong phạm vi:**
- mã nguồn trong repository này;
- website demo triển khai từ nhánh `main`.

**Ngoài phạm vi:**
- hạ tầng của Render / MongoDB Atlas / GitHub;
- tấn công vật lý, lừa đảo (social engineering);
- báo cáo chỉ từ công cụ quét tự động mà không có bằng chứng khai thác;
- thiếu các header không áp dụng (vd. COEP).

## Tài liệu bảo mật

Xem [docs/SECURITY/](docs/SECURITY/README.md): mô hình hóa mối đe dọa, bảng phân quyền, danh mục dữ liệu cá nhân, sao lưu, đối chiếu OWASP ASVS.
