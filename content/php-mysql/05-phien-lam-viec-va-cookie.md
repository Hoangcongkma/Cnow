---
title: "Phiên làm việc và cookie"
minutes: 17
preview: false
objectives:
  - "Hiểu vì sao HTTP cần cookie và session để 'nhớ' người dùng"
  - "Tạo, đọc, xóa cookie bằng setcookie với các thuộc tính an toàn"
  - "Dùng session để làm chức năng đăng nhập với password_hash / password_verify"
  - "Bảo vệ phiên: session_regenerate_id, đăng xuất đúng cách, thời gian hết hạn"
quiz:
  - question: "Dữ liệu trong $_SESSION được lưu ở đâu?"
    options: ["Trong cookie trên máy người dùng", "Trên server; trình duyệt chỉ giữ mã phiên (session id) trong cookie", "Trong URL", "Trong localStorage"]
    answer: 1
    explain: "Session lưu dữ liệu ở server nên người dùng không sửa được; cookie chỉ chứa mã định danh phiên."
  - question: "Hàm nào nên dùng để lưu mật khẩu người dùng trong PHP?"
    options: ["md5()", "sha1()", "password_hash()", "base64_encode()"]
    answer: 2
    explain: "password_hash dùng thuật toán chậm có muối (mặc định bcrypt); kiểm tra bằng password_verify."
  - question: "Gọi session_regenerate_id(true) ngay sau khi đăng nhập thành công để làm gì?"
    options: ["Xóa giỏ hàng", "Đổi mã phiên mới, chống tấn công session fixation", "Tăng thời gian phiên", "Đăng xuất người dùng"]
    answer: 1
    explain: "Mã phiên cũ có thể đã bị kẻ xấu biết; đổi mã mới khiến mã cũ vô dụng."
  - question: "Có nên lưu 'vai_tro=admin' trong cookie để kiểm tra quyền quản trị?"
    options: ["Có, rất tiện", "Không; người dùng sửa được cookie. Thông tin quyền phải lưu ở server (session/CSDL)", "Có, nếu đặt httpOnly", "Có, nếu mã hóa Base64"]
    answer: 1
    explain: "Cookie nằm trên máy người dùng nên có thể bị sửa tùy ý; httpOnly chỉ chặn JavaScript đọc, không chặn người dùng sửa."
---

## Giải thích khái niệm

### HTTP không có trí nhớ

Mỗi lần trình duyệt gửi yêu cầu, server PHP chạy file từ đầu và không hề biết yêu cầu này có liên quan tới yêu cầu trước hay không. Vậy làm sao website biết bạn đã đăng nhập, hay giỏ hàng của bạn có gì? Câu trả lời là **cookie** và **session**.

### Cookie: tờ giấy nhắn dán trên trình duyệt

**Cookie** là một mẩu dữ liệu nhỏ (vài KB) mà server nhờ trình duyệt **giữ hộ**. Từ đó, mỗi yêu cầu tới cùng website, trình duyệt tự động gửi kèm cookie. Cookie hợp với những thứ **không nhạy cảm**: ngôn ngữ giao diện, chế độ sáng/tối, lần truy cập cuối.

Vì cookie nằm trên máy người dùng, họ có thể **xem và sửa** nó. Đừng bao giờ tin cookie cho những thông tin quan trọng như "đã đăng nhập", "là admin", "giá sản phẩm".

Hàm `setcookie` có các tùy chọn quan trọng:

| Tùy chọn | Ý nghĩa |
|---|---|
| `expires` | thời điểm hết hạn; không đặt thì cookie mất khi đóng trình duyệt |
| `path` | đường dẫn áp dụng, thường `/` |
| `secure` | chỉ gửi qua HTTPS |
| `httponly` | JavaScript trên trang không đọc được |
| `samesite` | `Lax` hoặc `Strict` để hạn chế gửi cookie từ trang khác (chống CSRF) |

### Session: tủ đồ có khóa, bạn giữ chìa

**Session** (phiên làm việc) giống tủ gửi đồ ở siêu thị: đồ của bạn nằm trong tủ ở **server**, bạn chỉ cầm **chìa khóa có số** là mã phiên (session id), được lưu trong một cookie tên mặc định `PHPSESSID`. Mỗi yêu cầu, PHP đọc mã phiên, mở đúng tủ, và đưa dữ liệu vào mảng `$_SESSION`.

Vì dữ liệu nằm ở server, người dùng **không sửa được** nội dung session; họ chỉ có chìa khóa. Do đó session là nơi lưu thông tin đăng nhập, quyền, giỏ hàng, token CSRF. Điều cần bảo vệ là chiếc chìa khóa: nếu kẻ xấu lấy được mã phiên, họ mở được tủ của bạn.

Quy tắc dùng session: gọi `session_start()` ở đầu mỗi trang cần dùng, **trước** khi in ra bất kỳ nội dung nào.

### Đăng nhập an toàn

1. **Lưu mật khẩu bằng `password_hash`**, kiểm tra bằng `password_verify`. Hàm này tự tạo muối ngẫu nhiên và dùng thuật toán chậm. Tuyệt đối không dùng `md5`, `sha1` hay lưu mật khẩu gốc.
2. **Thông báo lỗi chung**: "Email hoặc mật khẩu không đúng".
3. **Đổi mã phiên sau khi đăng nhập**: `session_regenerate_id(true)` chống *session fixation* (kẻ xấu gài trước một mã phiên rồi chờ nạn nhân đăng nhập bằng mã đó).
4. **Cấu hình cookie phiên an toàn** trước `session_start()`: `httponly`, `secure` (khi có HTTPS), `samesite=Lax`.
5. **Đăng xuất phải hủy session ở server**, không chỉ xóa cookie.
6. **Giới hạn số lần thử** sai mật khẩu để chống dò mật khẩu.

## Code mẫu có chú thích

Cookie ghi nhớ chế độ hiển thị (thông tin không nhạy cảm):

```php
<?php
$cheDoHopLe = ['sang', 'toi'];
if (isset($_GET['che-do']) && in_array($_GET['che-do'], $cheDoHopLe, true)) {
    setcookie('che_do', $_GET['che-do'], [
        'expires' => time() + 365 * 24 * 3600,  // nhớ 1 năm
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    header('Location: cai-dat.php', true, 303);
    exit;
}
// Đọc cookie: vẫn phải kiểm tra vì người dùng có thể sửa giá trị
$cheDo = in_array($_COOKIE['che_do'] ?? '', $cheDoHopLe, true) ? $_COOKIE['che_do'] : 'sang';
echo 'Chế độ hiện tại: ' . $cheDo;
```

Khởi tạo phiên an toàn `phien.php`, dùng chung cho mọi trang:

```php
<?php
declare(strict_types=1);

session_set_cookie_params([
    'lifetime' => 0,                              // cookie phiên mất khi đóng trình duyệt
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_name('cnow_php_sid');
session_start();

// Tự đăng xuất nếu không hoạt động quá 30 phút
$HET_HAN = 30 * 60;
if (isset($_SESSION['hoat_dong_cuoi']) && time() - $_SESSION['hoat_dong_cuoi'] > $HET_HAN) {
    $_SESSION = [];
    session_destroy();
    session_start();
}
$_SESSION['hoat_dong_cuoi'] = time();

function nguoiDungHienTai(): ?array
{
    return $_SESSION['nguoi_dung'] ?? null;
}

function batBuocDangNhap(): void
{
    if (!nguoiDungHienTai()) {
        header('Location: dang-nhap.php', true, 303);
        exit;
    }
}
```

Trang đăng nhập `dang-nhap.php` (giả sử bảng `nguoi_dung` có cột `mat_khau_hash` tạo bằng `password_hash`):

```php
<?php
require __DIR__ . '/phien.php';
require __DIR__ . '/db.php';
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$loi = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $matKhau = (string) ($_POST['mat_khau'] ?? '');

    $st = db()->prepare('SELECT id, ho_ten, vai_tro, mat_khau_hash FROM nguoi_dung WHERE email = ?');
    $st->execute([$email]);
    $nd = $st->fetch();

    if ($nd && password_verify($matKhau, $nd['mat_khau_hash'])) {
        session_regenerate_id(true);              // đổi mã phiên: chống session fixation
        $_SESSION['nguoi_dung'] = ['id' => (int) $nd['id'], 'ho_ten' => $nd['ho_ten'], 'vai_tro' => $nd['vai_tro']];
        header('Location: trang-ca-nhan.php', true, 303);
        exit;
    }
    $loi = 'Email hoặc mật khẩu không đúng.';     // thông báo chung
}
?>
<?php if ($loi): ?><p class="loi"><?= e($loi) ?></p><?php endif; ?>
<form method="post">
  <input name="email" type="email" required autocomplete="username">
  <input name="mat_khau" type="password" required autocomplete="current-password">
  <button>Đăng nhập</button>
</form>
```

Khi tạo tài khoản, lưu mật khẩu bằng `password_hash($matKhau, PASSWORD_DEFAULT)`. Hằng số `PASSWORD_DEFAULT` để PHP tự chọn thuật toán tốt nhất hiện hành; cột lưu hash nên rộng 255 ký tự cho các thuật toán tương lai.

Đăng xuất đúng cách `dang-xuat.php` (nên gọi bằng form POST có token CSRF):

```php
<?php
require __DIR__ . '/phien.php';
$_SESSION = [];                                   // xóa dữ liệu phiên
$p = session_get_cookie_params();
setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => $p['httponly'], 'samesite' => 'Lax']);
session_destroy();                                // hủy phiên ở server
header('Location: index.php', true, 303);
exit;
```

## Lỗi hay gặp

**1. "Headers already sent".** `session_start()`, `setcookie()`, `header()` đều phải gửi header HTTP, nên phải chạy **trước** khi có bất kỳ đầu ra nào, kể cả khoảng trắng trước `<?php` hay ký tự BOM ở đầu file. Lưu file dạng UTF-8 không BOM.

**2. Tin cookie cho quyền truy cập.** Lưu `vai_tro=admin` trong cookie là mở cửa cho bất kỳ ai sửa cookie. Quyền phải đọc từ session hoặc CSDL.

**3. Dùng `md5` cho mật khẩu.** `md5` rất nhanh nên kẻ tấn công thử được hàng tỉ mật khẩu mỗi giây khi lộ CSDL. Dùng `password_hash`/`password_verify`.

**4. Đăng xuất chỉ xóa `$_SESSION['nguoi_dung']` hoặc chỉ xóa cookie.** Hãy làm đủ: xóa dữ liệu, hết hạn cookie, `session_destroy()`.

## Bài tập thực hành

Làm "giỏ hàng" bằng session: trang `san-pham.php` có danh sách 3 sản phẩm (mảng PHP cố định) với nút "Thêm vào giỏ" (form POST gửi mã sản phẩm, có CSRF). Trang `gio-hang.php` hiển thị các món, số lượng, tổng tiền, và nút "Xóa giỏ". Chỉ chấp nhận mã sản phẩm có trong danh sách; giá luôn lấy từ danh sách ở server, không lấy từ form.

Gợi ý: lưu `$_SESSION['gio'][$ma] = soLuong`; dùng lại `csrfToken()` và `kiemTraCsrf()` từ bài CRUD.

<details>
<summary>Xem lời giải</summary>

```php
<?php
// san-pham.php (dùng chung ham-chung.php của bài CRUD: session_start, e, csrfToken, kiemTraCsrf)
require __DIR__ . '/ham-chung.php';
const SAN_PHAM = ['A1' => ['ten' => 'Áo thun', 'gia' => 150000], 'B2' => ['ten' => 'Mũ', 'gia' => 90000], 'C3' => ['ten' => 'Túi vải', 'gia' => 120000]];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    kiemTraCsrf();
    $ma = (string) ($_POST['ma'] ?? '');
    if (isset(SAN_PHAM[$ma])) {                     // chỉ nhận mã hợp lệ
        $_SESSION['gio'][$ma] = ($_SESSION['gio'][$ma] ?? 0) + 1;
    }
    header('Location: san-pham.php', true, 303);
    exit;
}
foreach (SAN_PHAM as $ma => $sp): ?>
  <form method="post">
    <input type="hidden" name="_csrf" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="ma" value="<?= e($ma) ?>">
    <?= e($sp['ten']) ?> – <?= number_format($sp['gia'], 0, ',', '.') ?> đ
    <button>Thêm vào giỏ</button>
  </form>
<?php endforeach;
```

```php
<?php
// gio-hang.php
require __DIR__ . '/ham-chung.php';
const SAN_PHAM = ['A1' => ['ten' => 'Áo thun', 'gia' => 150000], 'B2' => ['ten' => 'Mũ', 'gia' => 90000], 'C3' => ['ten' => 'Túi vải', 'gia' => 120000]];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    kiemTraCsrf();
    unset($_SESSION['gio']);
    header('Location: gio-hang.php', true, 303);
    exit;
}
$tong = 0;
foreach ($_SESSION['gio'] ?? [] as $ma => $sl) {
    if (!isset(SAN_PHAM[$ma])) continue;
    $tien = SAN_PHAM[$ma]['gia'] * (int) $sl;      // giá lấy từ server
    $tong += $tien;
    echo e(SAN_PHAM[$ma]['ten']) . " × $sl = " . number_format($tien, 0, ',', '.') . ' đ<br>';
}
echo 'Tổng: ' . number_format($tong, 0, ',', '.') . ' đ';
?>
<form method="post">
  <input type="hidden" name="_csrf" value="<?= e(csrfToken()) ?>">
  <button>Xóa giỏ</button>
</form>
```

</details>

## Tóm tắt

- HTTP không nhớ người dùng; cookie lưu dữ liệu nhỏ trên trình duyệt, session lưu dữ liệu trên server và chỉ để mã phiên trong cookie.
- Cookie người dùng sửa được: chỉ dùng cho thông tin không nhạy cảm, luôn kiểm tra lại giá trị; đặt `httponly`, `secure`, `samesite`.
- `session_start()` trước mọi đầu ra; quyền và trạng thái đăng nhập lưu trong session.
- Mật khẩu: `password_hash` / `password_verify`; sau đăng nhập gọi `session_regenerate_id(true)`.
- Đăng xuất: xóa `$_SESSION`, hết hạn cookie, `session_destroy()`; đặt thời gian hết hạn khi không hoạt động.

## Đọc thêm

- [Session – php.net](https://www.php.net/manual/en/book.session.php)
- [setcookie – php.net](https://www.php.net/manual/en/function.setcookie.php)
- [password_hash – php.net](https://www.php.net/manual/en/function.password-hash.php)
- [session_regenerate_id – php.net](https://www.php.net/manual/en/function.session-regenerate-id.php)
