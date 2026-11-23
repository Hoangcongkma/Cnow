# Bảng phân quyền (RBAC)

Mọi request HTTP đi qua **một** middleware duy nhất: `authorize` trong [`src/security/rbac.js`](../../src/security/rbac.js). Middleware tra bảng `RULES` theo phương thức + đường dẫn:

- **Khách** vào trang cần đăng nhập → chuyển tới `/login`. Trang đang mở được nhớ lại, chỉ nhận đường dẫn nội bộ.
- **Đã đăng nhập nhưng sai vai trò** → `403`. Response có header `X-Authz: denied`.
- **Kiểm tra theo đối tượng** (khóa học của CTV nào, đơn hàng / ghi chú / hóa đơn của ai) nằm trong route/service, vì cần dữ liệu cụ thể. Ví dụ: `canEdit()` cho khóa học, truy vấn luôn kèm `user: req.user._id`, hóa đơn chỉ chủ đơn hoặc admin. Không thấy đối tượng thì trả `404`, không phải `403`, để không lộ đối tượng có tồn tại hay không.
- **Chat (Socket.IO)** không đi qua Express router. Việc xác thực nằm trong `src/realtime.js`: phiên đăng nhập + `Origin` + ghi danh / giảng viên.

## Mức truy cập

| Mức | Khách | Người học | Cộng tác viên | Quản trị viên |
| --- | :-: | :-: | :-: | :-: |
| `public` | ✔ | ✔ | ✔ | ✔ |
| `auth` | – | ✔ | ✔ | ✔ |
| `staff` | – | – | ✔ | ✔ |
| `admin` | – | – | – | ✔ |

## Bảng quyền

| Nhóm | Route | Mức | Kiểm tra theo đối tượng |
| --- | --- | --- | --- |
| Công khai | `GET /`, `/courses`, `/courses/:slug`, `/gioi-thieu`, `/verify`, `/verify/:code`, `/avatars/:file`, `/healthz`, `/robots.txt`, `/sitemap.xml` | public | Chỉ khóa học đã xuất bản |
| Xác thực | `GET/POST /register`, `/login`, `/login/2fa`, `/login/admin-pin`, `POST /logout` | public | Bước 2FA / mã quản trị dựa trên trạng thái chờ trong phiên |
| Học tập | `GET /my-courses`, `/wishlist`, `/learn/:slug`; `POST /learn/:slug/{complete,quiz,notes,qa}`, `/wishlist/:courseId` | auth | Đã ghi danh (hoặc staff), bài học thử |
| Ghi chú | `POST /notes/:id`, `/notes/:id/delete` | auth | Chỉ chủ ghi chú |
| Hỏi – đáp | `POST /qa/:id/vote` | auth | Học viên của khóa, không tự vote |
| | `POST /qa/:id/best` | auth | Chỉ giảng viên của khóa (tác giả) hoặc admin |
| Cộng đồng | `GET /courses/:slug/chat`; `POST /courses/:slug/{comments,review,certificate}` | auth | Đã ghi danh |
| Chứng nhận | `GET /certificate/:id` | auth | Chủ chứng nhận hoặc admin |
| Tài khoản | `GET/POST /profile`, `/profile/password`, `/profile/avatar`, `/profile/2fa/*`, `/profile/sessions/*`, `/notifications/*` | auth | Luôn là tài khoản đang đăng nhập; thông báo, phiên chỉ của chính mình |
| Thanh toán | `POST /pay`, `GET /pay/success`, `/pay/cancel`, `/pay/demo/:ref[/:gw]`, `POST /pay/demo/:ref/:gw`, `GET /orders`, `/orders/:id/invoice.pdf` | auth | Đơn hàng của chính mình; hóa đơn: chủ đơn hoặc admin |
| Quản trị – nội dung | `GET /admin`, `/admin/courses[/new]`, `/admin/courses/:id/edit`, `/admin/courses/:id/lessons/:lessonId`; `POST /admin/courses[/:id]`, `/admin/courses/:id/lessons/:lessonId`; `GET /admin/learners`, `/admin/export/{learners,revenue}.csv` | staff | CTV chỉ thấy / sửa khóa do mình tạo (`canEdit`, `scopeCourseIds`) |
| Quản trị – hệ thống | `POST /admin/courses/:id/{approve,reject,delete}`; `GET /admin/orders`, `POST /admin/orders/:id/refund`, `/admin/export/{orders,users}.csv`; `GET/POST /admin/users[/:id]`; `/admin/coupons*`; `/admin/audit`, `/admin/security`; `/admin/qa*`, `/admin/comments*` | admin | Admin không tự đổi quyền / tự khóa mình |

Nguồn sự thật là mảng `RULES` trong `src/security/rbac.js`. Test `test/rbac.test.js`:

1. Đọc mọi route khai báo trong `src/routes/*.js` và kiểm tra route nào cũng có đúng một quy tắc, nên thêm route mà quên khai báo quyền là test đỏ.
2. Gọi **mọi quy tắc × 4 vai trò** (khách, người học, cộng tác viên, quản trị viên) và kiểm tra:
   - vai trò được phép thì không bị chặn bởi bảng quyền;
   - vai trò không được phép thì bị chuyển tới `/login` (khách) hoặc nhận `403` (đã đăng nhập).
