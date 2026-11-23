---
title: "Form và xử lý dữ liệu"
minutes: 16
preview: false
objectives:
  - "Hiểu cách form HTML gửi dữ liệu bằng GET và POST"
  - "Đọc dữ liệu từ $_GET, $_POST một cách an toàn"
  - "Kiểm tra (validate) dữ liệu ở server và hiển thị lỗi cạnh từng ô nhập"
  - "Áp dụng mẫu Post/Redirect/Get để tránh gửi form hai lần"
quiz:
  - question: "Form đăng ký tài khoản nên dùng phương thức nào?"
    options: ["GET, vì nhanh hơn", "POST, vì dữ liệu không nằm trên URL và yêu cầu này thay đổi dữ liệu", "Không cần phương thức", "PUT"]
    answer: 1
    explain: "GET để lấy dữ liệu (tìm kiếm, lọc); POST cho thao tác thay đổi dữ liệu. Mật khẩu trên URL sẽ bị lưu trong lịch sử, log."
  - question: "Thuộc tính required trên ô input có đủ để đảm bảo dữ liệu hợp lệ không?"
    options: ["Có, trình duyệt luôn kiểm tra", "Không; kiểm tra phía trình duyệt bỏ qua được dễ dàng, server phải kiểm tra lại", "Chỉ đủ với email", "Chỉ khi dùng HTTPS"]
    answer: 1
    explain: "Ai cũng có thể gửi yêu cầu trực tiếp không qua trình duyệt; kiểm tra ở server là bắt buộc."
  - question: "$_POST['tuoi'] khi người dùng nhập 20 có kiểu gì?"
    options: ["int", "string", "float", "bool"]
    answer: 1
    explain: "Mọi dữ liệu form gửi lên đều là chuỗi; cần chuyển đổi và kiểm tra, ví dụ bằng filter_var."
  - question: "Mẫu Post/Redirect/Get giải quyết vấn đề gì?"
    options: ["Làm form đẹp hơn", "Tránh việc bấm F5 sau khi gửi form khiến dữ liệu bị gửi lại lần nữa", "Tăng tốc cơ sở dữ liệu", "Mã hóa dữ liệu"]
    answer: 1
    explain: "Sau khi xử lý POST thành công, chuyển hướng sang một trang GET; tải lại trang chỉ lặp lại GET vô hại."
---

## Giải thích khái niệm

### Form: tờ đơn gửi lên server

Form HTML giống một tờ đơn ở quầy giao dịch: bạn điền các ô, ký tên, rồi nộp cho nhân viên. Thuộc tính `action` cho biết **nộp cho ai** (file xử lý, ví dụ `dang-ky.php`), thuộc tính `method` cho biết **nộp theo cách nào**. Mỗi ô nhập phải có thuộc tính `name`; đó là "tên ô" mà server dùng để đọc giá trị.

### GET và POST

- **GET**: dữ liệu được gắn vào **URL** sau dấu `?`, ví dụ `tim-kiem.php?tu-khoa=php&trang=2`. Dễ chia sẻ, đánh dấu trang, nhưng ai cũng nhìn thấy, và bị lưu trong lịch sử trình duyệt, log server. Dùng cho **tìm kiếm, lọc, phân trang**, những thao tác không thay đổi dữ liệu.
- **POST**: dữ liệu nằm trong **thân yêu cầu**, không hiện trên URL. Dùng cho mọi thao tác **thay đổi dữ liệu**: đăng ký, đăng nhập, đặt hàng, xóa.

Lưu ý: POST không có nghĩa là "mã hóa". Muốn dữ liệu được bảo vệ trên đường truyền, website phải chạy **HTTPS**.

### Đọc dữ liệu trong PHP

PHP tự đưa dữ liệu vào các **biến siêu toàn cục** (superglobal): `$_GET` cho chuỗi truy vấn, `$_POST` cho dữ liệu form gửi bằng POST, `$_SERVER['REQUEST_METHOD']` cho biết phương thức của yêu cầu hiện tại. Hai điều phải nhớ:

1. **Ô có thể không tồn tại.** Ai đó gửi yêu cầu thiếu ô, `$_POST['email']` sẽ gây cảnh báo. Dùng toán tử `??`: `$_POST['email'] ?? ''`.
2. **Mọi giá trị đều là chuỗi** (hoặc mảng nếu người gửi cố tình đặt tên `email[]`). Hãy ép kiểu và kiểm tra trước khi dùng.

### Kiểm tra dữ liệu ở server

Thuộc tính HTML như `required`, `type="email"`, `maxlength` giúp người dùng phát hiện lỗi sớm, nhưng chúng **chỉ là lớp tiện lợi**: bất kỳ ai cũng có thể tắt đi hoặc gửi yêu cầu trực tiếp bằng công cụ khác. **Server phải luôn kiểm tra lại**. Quy trình chuẩn:

1. **Làm sạch** (sanitize): bỏ khoảng trắng thừa bằng `trim`, ép kiểu.
2. **Kiểm tra** (validate): bắt buộc, độ dài, định dạng (email bằng `filter_var($s, FILTER_VALIDATE_EMAIL)`, số bằng `FILTER_VALIDATE_INT`).
3. Nếu có lỗi: **hiển thị lại form**, giữ nguyên dữ liệu người dùng đã nhập (đã escape), và báo lỗi cạnh từng ô.
4. Nếu hợp lệ: xử lý (lưu CSDL – bài sau), rồi **chuyển hướng**.

### Post/Redirect/Get

Bạn đã bao giờ bấm F5 sau khi đặt hàng và trình duyệt hỏi "Gửi lại dữ liệu?" chưa? Nếu đồng ý, đơn hàng bị tạo hai lần. Mẫu **Post/Redirect/Get** (PRG) tránh điều này: sau khi xử lý POST thành công, server trả lệnh chuyển hướng (`header('Location: cam-on.php')`) sang một trang GET. Tải lại trang chỉ lặp lại yêu cầu GET vô hại.

## Code mẫu có chú thích

Form liên hệ `lien-he.php`, tự xử lý chính nó:

```php
<?php
declare(strict_types=1);
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$loi = [];
$du = ['ten' => '', 'email' => '', 'noi_dung' => '']; // giữ lại dữ liệu để điền lại form

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Làm sạch: ép về chuỗi (người gửi có thể gửi mảng) và bỏ khoảng trắng thừa
    foreach ($du as $k => $_) {
        $du[$k] = trim((string) (is_string($_POST[$k] ?? null) ? $_POST[$k] : ''));
    }
    // 2. Kiểm tra từng ô
    if (mb_strlen($du['ten']) < 2) {
        $loi['ten'] = 'Họ tên cần ít nhất 2 ký tự.';
    }
    if (!filter_var($du['email'], FILTER_VALIDATE_EMAIL)) {
        $loi['email'] = 'Email không hợp lệ.';
    }
    if (mb_strlen($du['noi_dung']) < 10 || mb_strlen($du['noi_dung']) > 1000) {
        $loi['noi_dung'] = 'Nội dung dài 10–1000 ký tự.';
    }
    // 3. Hợp lệ → xử lý rồi chuyển hướng (Post/Redirect/Get)
    if (!$loi) {
        // ... lưu vào CSDL hoặc gửi email (bài sau) ...
        header('Location: lien-he.php?da-gui=1', true, 303);
        exit;                           // dừng script ngay sau khi chuyển hướng
    }
}
?>
<?php if (isset($_GET['da-gui'])): ?>
  <p class="thanh-cong">Cảm ơn bạn, chúng tôi đã nhận được tin nhắn!</p>
<?php endif; ?>

<form method="post" action="lien-he.php" novalidate>
  <label>Họ tên
    <input name="ten" value="<?= e($du['ten']) ?>" required maxlength="80">
  </label>
  <?php if (isset($loi['ten'])): ?><p class="loi"><?= e($loi['ten']) ?></p><?php endif; ?>

  <label>Email
    <input name="email" type="email" value="<?= e($du['email']) ?>" required>
  </label>
  <?php if (isset($loi['email'])): ?><p class="loi"><?= e($loi['email']) ?></p><?php endif; ?>

  <label>Nội dung
    <textarea name="noi_dung" rows="4" required><?= e($du['noi_dung']) ?></textarea>
  </label>
  <?php if (isset($loi['noi_dung'])): ?><p class="loi"><?= e($loi['noi_dung']) ?></p><?php endif; ?>

  <button>Gửi</button>
</form>
```

Thuộc tính `novalidate` tạm tắt kiểm tra của trình duyệt để bạn thấy kiểm tra phía server hoạt động; khi làm thật có thể bỏ đi để có cả hai lớp.

Form tìm kiếm dùng GET, đọc số trang an toàn:

```php
<?php
$tuKhoa = trim((string) ($_GET['q'] ?? ''));
// filter_var trả về false nếu không phải số nguyên trong khoảng cho phép
$trang = filter_var($_GET['trang'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000]]) ?: 1;
echo 'Tìm "' . htmlspecialchars($tuKhoa, ENT_QUOTES, 'UTF-8') . '" – trang ' . $trang;
```

Với `?q=php&trang=abc`, `$trang` trở về 1 thay vì gây lỗi.

## Lỗi hay gặp

**1. Thiếu `name` cho ô nhập.** Ô không có `name` thì không được gửi lên, `$_POST` không có giá trị đó. Đây là lỗi kinh điển khi "form gửi mà server không nhận được gì".

**2. Truy cập trực tiếp `$_POST['x']` khi ô có thể thiếu.** Gây cảnh báo `Undefined array key`. Dùng `$_POST['x'] ?? ''`.

**3. Quên `exit` sau `header('Location: ...')`.** `header` chỉ đặt lệnh chuyển hướng; code phía sau vẫn tiếp tục chạy và có thể xử lý thêm những thứ không mong muốn. Luôn `exit;` ngay sau đó. Ngoài ra, `header()` phải được gọi **trước** khi in bất kỳ nội dung nào, kể cả một dấu cách.

**4. Hiển thị lại dữ liệu chưa escape.** Đưa `$_POST['ten']` thẳng vào `value="..."` cho phép kẻ xấu đóng dấu nháy và chèn thuộc tính độc hại. Luôn escape với `ENT_QUOTES`.

## Bài tập thực hành

Tạo form "Đăng ký nhận bản tin" gồm: email (bắt buộc, hợp lệ), chủ đề quan tâm (select: `html`, `php`, `thiet-ke`) và ô đồng ý điều khoản (checkbox bắt buộc). Kiểm tra ở server, chủ đề phải thuộc danh sách cho phép; hợp lệ thì chuyển hướng sang `?ok=1` và hiện lời cảm ơn kèm chủ đề đã chọn.

Gợi ý: kiểm tra chủ đề bằng `in_array($chuDe, $choPhep, true)`; checkbox chưa tick thì hoàn toàn không có trong `$_POST`.

<details>
<summary>Xem lời giải</summary>

```php
<?php
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
$choPhep = ['html' => 'HTML', 'php' => 'PHP', 'thiet-ke' => 'Thiết kế'];
$loi = [];
$email = '';
$chuDe = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim((string) ($_POST['email'] ?? ''));
    $chuDe = (string) ($_POST['chu_de'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $loi[] = 'Email không hợp lệ.';
    if (!array_key_exists($chuDe, $choPhep)) $loi[] = 'Chủ đề không hợp lệ.';
    if (!isset($_POST['dong_y'])) $loi[] = 'Bạn cần đồng ý điều khoản.';
    if (!$loi) {
        header('Location: ban-tin.php?ok=1&chu-de=' . urlencode($chuDe), true, 303);
        exit;
    }
}
$daChon = (string) ($_GET['chu-de'] ?? '');
?>
<?php if (isset($_GET['ok']) && isset($choPhep[$daChon])): ?>
  <p>Cảm ơn! Bạn sẽ nhận bản tin về <?= e($choPhep[$daChon]) ?>.</p>
<?php endif; ?>
<?php foreach ($loi as $l): ?><p class="loi"><?= e($l) ?></p><?php endforeach; ?>
<form method="post">
  <input name="email" type="email" value="<?= e($email) ?>" required>
  <select name="chu_de">
    <?php foreach ($choPhep as $ma => $ten): ?>
      <option value="<?= e($ma) ?>" <?= $ma === $chuDe ? 'selected' : '' ?>><?= e($ten) ?></option>
    <?php endforeach; ?>
  </select>
  <label><input type="checkbox" name="dong_y" value="1"> Tôi đồng ý điều khoản</label>
  <button>Đăng ký</button>
</form>
```

</details>

## Tóm tắt

- Form gửi dữ liệu theo `name` của từng ô tới `action`; GET đưa dữ liệu lên URL, POST đặt trong thân yêu cầu.
- Dùng GET cho tìm kiếm/lọc, POST cho thao tác thay đổi dữ liệu; chỉ HTTPS mới bảo vệ dữ liệu trên đường truyền.
- Đọc `$_GET`, `$_POST` với `??`, ép kiểu; mọi giá trị đều là chuỗi.
- Kiểm tra lại ở server dù đã có `required`; báo lỗi cạnh ô và điền lại dữ liệu đã escape.
- Post/Redirect/Get: xử lý xong thì `header('Location: ...')` rồi `exit`.

## Đọc thêm

- [Xử lý form – php.net](https://www.php.net/manual/en/tutorial.forms.php)
- [filter_var – php.net](https://www.php.net/manual/en/function.filter-var.php)
- [header – php.net](https://www.php.net/manual/en/function.header.php)
