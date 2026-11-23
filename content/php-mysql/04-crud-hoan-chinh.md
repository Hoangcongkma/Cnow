---
title: "CRUD hoàn chỉnh"
minutes: 18
preview: false
objectives:
  - "Xây dựng trọn vẹn chức năng thêm, xem, sửa, xóa (CRUD) cho một bảng"
  - "Tổ chức code thành các hàm truy cập dữ liệu và trang hiển thị riêng"
  - "Dùng POST + xác nhận cho thao tác xóa, kiểm tra id hợp lệ"
  - "Phân trang danh sách bằng LIMIT và OFFSET an toàn"
quiz:
  - question: "Vì sao không nên làm chức năng xóa bằng liên kết GET như xoa.php?id=5?"
    options: ["Vì GET chậm hơn", "Vì trình duyệt, công cụ tìm kiếm hay trang độc hại có thể tự gọi GET, gây xóa nhầm (và dễ bị tấn công CSRF)", "Vì GET không gửi được id", "Không có vấn đề gì"]
    answer: 1
    explain: "Thao tác thay đổi dữ liệu phải dùng POST, kèm token CSRF và hộp xác nhận."
  - question: "Trang sửa nhận id từ URL. Cần kiểm tra gì trước khi hiển thị form?"
    options: ["Không cần kiểm tra", "id là số nguyên hợp lệ và bản ghi tồn tại; không có thì trả 404", "id phải nhỏ hơn 100", "id phải là chuỗi"]
    answer: 1
    explain: "Người dùng có thể sửa URL tùy ý; luôn ép kiểu và xử lý trường hợp không tìm thấy."
  - question: "Trang thứ 3, mỗi trang 10 dòng thì OFFSET bằng bao nhiêu?"
    options: ["3", "10", "20", "30"]
    answer: 2
    explain: "OFFSET = (trang - 1) × số dòng mỗi trang = (3 - 1) × 10 = 20."
  - question: "Token CSRF trong form dùng để làm gì?"
    options: ["Mã hóa mật khẩu", "Chứng minh yêu cầu đến từ form thật của website, không phải từ trang khác giả mạo", "Tăng tốc gửi form", "Đếm số lần gửi"]
    answer: 1
    explain: "Trang độc hại có thể tự gửi form tới website của bạn bằng cookie của nạn nhân; token bí mật trong phiên ngăn điều đó."
---

## Giải thích khái niệm

### CRUD: bốn việc của mọi trang quản lý

Gần như mọi trang quản trị đều xoay quanh bốn thao tác: **C**reate (thêm), **R**ead (xem danh sách, xem chi tiết), **U**pdate (sửa), **D**elete (xóa). Quản lý khóa học, sản phẩm, bài viết hay học viên, về bản chất đều là CRUD trên một bảng. Bài này ghép mọi kiến thức của các bài trước để xây một module **quản lý khóa học** hoàn chỉnh, với cấu trúc có thể tái sử dụng cho bảng khác.

### Tổ chức code: tách phần dữ liệu và phần hiển thị

Khi mọi thứ dồn vào một file, file đó sẽ dài hàng trăm dòng lẫn lộn SQL, kiểm tra dữ liệu và HTML. Một cách tổ chức đơn giản mà hiệu quả:

- `db.php`: kết nối PDO (bài trước).
- `khoa-hoc-repo.php`: các **hàm truy cập dữ liệu** như `layDanhSach`, `layTheoId`, `them`, `capNhat`, `xoa`. Mọi câu SQL chỉ nằm ở đây.
- `ham-chung.php`: các hàm tiện ích: `e()` để escape, kiểm tra CSRF, chuyển hướng.
- Các trang `danh-sach.php`, `sua.php`, `xoa.php`: nhận yêu cầu, gọi hàm, hiển thị kết quả.

Cách chia này là phiên bản thu nhỏ của mô hình MVC (Model – View – Controller) mà các framework như Laravel áp dụng: dữ liệu, giao diện và điều khiển nằm riêng, dễ đọc và dễ sửa.

### An toàn cho thao tác thay đổi dữ liệu

Ba nguyên tắc cho thêm, sửa, xóa:

1. **Chỉ qua POST**. Liên kết GET như `xoa.php?id=5` có thể bị kích hoạt ngoài ý muốn: trình duyệt tải trước trang, công cụ tìm kiếm thu thập liên kết, hay đơn giản là ai đó chèn ảnh `<img src="xoa.php?id=5">` vào diễn đàn.
2. **Token CSRF**. CSRF (Cross-Site Request Forgery – giả mạo yêu cầu liên trang) là khi một trang độc hại khiến trình duyệt của bạn gửi form tới website khác bằng chính phiên đăng nhập của bạn. Giải pháp: mỗi phiên có một token ngẫu nhiên, mọi form POST kèm token này trong trường ẩn, server so khớp trước khi xử lý. Trang độc hại không đọc được token nên không giả mạo được.
3. **Kiểm tra id và quyền**. Ép id về số nguyên, kiểm tra bản ghi tồn tại (không thì trả 404), và kiểm tra người dùng có quyền với bản ghi đó.

### Phân trang

Bảng có hàng nghìn dòng thì không thể hiển thị hết một lúc. **Phân trang** dùng `LIMIT` (số dòng mỗi trang) và `OFFSET` (bỏ qua bao nhiêu dòng): trang `n` có `OFFSET = (n - 1) × số dòng`. Số trang lấy từ URL nên phải ép kiểu và giới hạn, đồng thời đếm tổng số dòng bằng `COUNT(*)` để biết có bao nhiêu trang.

## Code mẫu có chú thích

Các hàm truy cập dữ liệu `khoa-hoc-repo.php`:

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

const CAP_DO = ['Cơ bản', 'Trung cấp', 'Nâng cao'];

function layDanhSach(int $trang, int $moiTrang = 10): array
{
    $st = db()->prepare('SELECT id, ten, gia, cap_do FROM khoa_hoc ORDER BY id DESC LIMIT ? OFFSET ?');
    $st->bindValue(1, $moiTrang, PDO::PARAM_INT);              // LIMIT/OFFSET phải là số nguyên
    $st->bindValue(2, ($trang - 1) * $moiTrang, PDO::PARAM_INT);
    $st->execute();
    return $st->fetchAll();
}

function demTatCa(): int
{
    return (int) db()->query('SELECT COUNT(*) FROM khoa_hoc')->fetchColumn();
}

function layTheoId(int $id): ?array
{
    $st = db()->prepare('SELECT * FROM khoa_hoc WHERE id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;                                 // không có → null
}

/** Kiểm tra dữ liệu form, trả về [dữ liệu sạch, danh sách lỗi]. */
function kiemTraKhoaHoc(array $in): array
{
    $du = [
        'ten' => trim((string) ($in['ten'] ?? '')),
        'gia' => filter_var($in['gia'] ?? '', FILTER_VALIDATE_FLOAT),
        'cap_do' => (string) ($in['cap_do'] ?? ''),
    ];
    $loi = [];
    if (mb_strlen($du['ten']) < 3 || mb_strlen($du['ten']) > 120) $loi['ten'] = 'Tên dài 3–120 ký tự.';
    if ($du['gia'] === false || $du['gia'] < 0 || $du['gia'] > 10000) $loi['gia'] = 'Giá từ 0 đến 10000.';
    if (!in_array($du['cap_do'], CAP_DO, true)) $loi['cap_do'] = 'Cấp độ không hợp lệ.';
    return [$du, $loi];
}

function them(array $du): int
{
    db()->prepare('INSERT INTO khoa_hoc (ten, gia, cap_do) VALUES (?, ?, ?)')->execute([$du['ten'], $du['gia'], $du['cap_do']]);
    return (int) db()->lastInsertId();
}

function capNhat(int $id, array $du): void
{
    db()->prepare('UPDATE khoa_hoc SET ten = ?, gia = ?, cap_do = ? WHERE id = ?')->execute([$du['ten'], $du['gia'], $du['cap_do'], $id]);
}

function xoa(int $id): void
{
    db()->prepare('DELETE FROM khoa_hoc WHERE id = ?')->execute([$id]);
}
```

Hàm dùng chung `ham-chung.php`, gồm token CSRF:

```php
<?php
declare(strict_types=1);
session_start();

function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

function csrfToken(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function kiemTraCsrf(): void
{
    $gui = (string) ($_POST['_csrf'] ?? '');
    if (!hash_equals(csrfToken(), $gui)) {        // so sánh an toàn về thời gian
        http_response_code(403);
        exit('Yêu cầu không hợp lệ. Hãy tải lại trang.');
    }
}

function chuyenHuong(string $url): never
{
    header('Location: ' . $url, true, 303);
    exit;
}
```

Trang sửa `sua.php` – nhận id, hiển thị form, xử lý lưu:

```php
<?php
require __DIR__ . '/ham-chung.php';
require __DIR__ . '/khoa-hoc-repo.php';

$id = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT) ?: 0;
$kh = $id ? layTheoId($id) : null;
if (!$kh) {
    http_response_code(404);
    exit('Không tìm thấy khóa học.');
}
$loi = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    kiemTraCsrf();
    [$du, $loi] = kiemTraKhoaHoc($_POST);
    if (!$loi) {
        capNhat($id, $du);
        $_SESSION['thong_bao'] = 'Đã lưu khóa học.';
        chuyenHuong('danh-sach.php');
    }
    $kh = array_merge($kh, $du);                    // hiển thị lại dữ liệu vừa nhập
}
?>
<form method="post">
  <input type="hidden" name="_csrf" value="<?= e(csrfToken()) ?>">
  <label>Tên <input name="ten" value="<?= e((string) $kh['ten']) ?>"></label>
  <?php if (isset($loi['ten'])): ?><p class="loi"><?= e($loi['ten']) ?></p><?php endif; ?>
  <label>Giá <input name="gia" type="number" step="0.01" value="<?= e((string) $kh['gia']) ?>"></label>
  <?php if (isset($loi['gia'])): ?><p class="loi"><?= e($loi['gia']) ?></p><?php endif; ?>
  <label>Cấp độ
    <select name="cap_do">
      <?php foreach (CAP_DO as $c): ?><option <?= $c === $kh['cap_do'] ? 'selected' : '' ?>><?= e($c) ?></option><?php endforeach; ?>
    </select>
  </label>
  <button>Lưu</button>
</form>
```

Trong danh sách, nút xóa là một form POST nhỏ có xác nhận:

```html
<form method="post" action="xoa.php" onsubmit="return confirm('Xóa khóa học này?')">
  <input type="hidden" name="_csrf" value="TOKEN-TU-PHP">
  <input type="hidden" name="id" value="5">
  <button>Xóa</button>
</form>
```

Ghi chú: thuộc tính `onsubmit` viết thẳng trong HTML chỉ để ví dụ ngắn gọn; ở website có chính sách CSP chặn script nội tuyến (như Cnow), hãy gắn sự kiện trong file JavaScript riêng như đã học ở khóa JavaScript.

## Lỗi hay gặp

**1. Truyền LIMIT/OFFSET dạng chuỗi.** Với prepared statement thật, `execute(['10', '20'])` gửi chuỗi và MySQL báo lỗi cú pháp ở `LIMIT '10'`. Dùng `bindValue(..., PDO::PARAM_INT)` như ví dụ.

**2. Sửa nhầm bản ghi vì không kiểm tra id.** Không ép kiểu `id`, hoặc quên `WHERE id = ?`, có thể cập nhật sai dòng hay toàn bộ bảng.

**3. Thông báo thành công biến mất sau chuyển hướng.** Biến PHP mất khi request kết thúc. Lưu thông báo vào `$_SESSION` trước khi chuyển hướng, hiển thị một lần ở trang sau rồi xóa (mẫu "flash message", Cnow cũng dùng).

**4. So sánh token bằng `==`.** Dùng `hash_equals` để so sánh chuỗi bí mật, tránh rò rỉ thông tin qua thời gian so sánh.

## Bài tập thực hành

Hoàn thiện `danh-sach.php`: hiển thị bảng khóa học, 5 dòng mỗi trang, có liên kết "Trước / Sau"; hiển thị thông báo flash nếu có; mỗi dòng có liên kết "Sửa" và nút "Xóa" (form POST). Viết `xoa.php` kiểm tra CSRF, kiểm tra id, xóa rồi chuyển hướng về đúng trang đang xem.

Gợi ý: số trang `$soTrang = max(1, (int) ceil(demTatCa() / 5))`; ép `$trang` vào khoảng `1..$soTrang`.

<details>
<summary>Xem lời giải</summary>

```php
<?php
// danh-sach.php
require __DIR__ . '/ham-chung.php';
require __DIR__ . '/khoa-hoc-repo.php';
$moiTrang = 5;
$soTrang = max(1, (int) ceil(demTatCa() / $moiTrang));
$trang = min($soTrang, max(1, (int) ($_GET['trang'] ?? 1)));
$ds = layDanhSach($trang, $moiTrang);
$flash = $_SESSION['thong_bao'] ?? '';
unset($_SESSION['thong_bao']);                  // chỉ hiện một lần
?>
<?php if ($flash): ?><p class="thanh-cong"><?= e($flash) ?></p><?php endif; ?>
<table>
  <?php foreach ($ds as $kh): ?>
    <tr>
      <td><?= e($kh['ten']) ?></td><td>$<?= e((string) $kh['gia']) ?></td>
      <td>
        <a href="sua.php?id=<?= (int) $kh['id'] ?>">Sửa</a>
        <form method="post" action="xoa.php">
          <input type="hidden" name="_csrf" value="<?= e(csrfToken()) ?>">
          <input type="hidden" name="id" value="<?= (int) $kh['id'] ?>">
          <input type="hidden" name="trang" value="<?= $trang ?>">
          <button>Xóa</button>
        </form>
      </td>
    </tr>
  <?php endforeach; ?>
</table>
<?php if ($trang > 1): ?><a href="?trang=<?= $trang - 1 ?>">← Trước</a><?php endif; ?>
<?php if ($trang < $soTrang): ?><a href="?trang=<?= $trang + 1 ?>">Sau →</a><?php endif; ?>
```

```php
<?php
// xoa.php
require __DIR__ . '/ham-chung.php';
require __DIR__ . '/khoa-hoc-repo.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
kiemTraCsrf();
$id = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT) ?: 0;
if ($id && layTheoId($id)) {
    xoa($id);
    $_SESSION['thong_bao'] = 'Đã xóa khóa học.';
}
chuyenHuong('danh-sach.php?trang=' . max(1, (int) ($_POST['trang'] ?? 1)));
```

</details>

## Tóm tắt

- CRUD là nền tảng của mọi trang quản trị: thêm, xem, sửa, xóa.
- Tách code: kết nối, hàm truy cập dữ liệu (chứa mọi SQL), hàm chung, các trang xử lý.
- Thao tác thay đổi dữ liệu chỉ qua POST, có token CSRF, kiểm tra id và quyền, trả 404 khi không tìm thấy.
- Phân trang bằng `LIMIT`/`OFFSET` với tham số kiểu số nguyên; đếm tổng bằng `COUNT(*)`.
- Thông báo sau chuyển hướng lưu trong session (flash message).

## Đọc thêm

- [PDOStatement::bindValue – php.net](https://www.php.net/manual/en/pdostatement.bindvalue.php)
- [random_bytes – php.net](https://www.php.net/manual/en/function.random-bytes.php)
- [hash_equals – php.net](https://www.php.net/manual/en/function.hash-equals.php)
