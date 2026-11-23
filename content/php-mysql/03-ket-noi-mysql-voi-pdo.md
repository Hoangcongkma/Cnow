---
title: "Kết nối MySQL với PDO"
minutes: 17
preview: false
objectives:
  - "Hiểu cơ sở dữ liệu quan hệ: bảng, cột, dòng, khóa chính"
  - "Tạo bảng và viết các câu SQL cơ bản: SELECT, INSERT, UPDATE, DELETE"
  - "Kết nối MySQL bằng PDO với chế độ báo lỗi và mã hóa ký tự đúng"
  - "Dùng prepared statement để chống SQL injection"
quiz:
  - question: "Đoạn \"SELECT * FROM users WHERE email = '\" . $_POST['email'] . \"'\" có vấn đề gì?"
    options: ["Không có vấn đề", "Bị SQL injection: người dùng có thể chèn câu lệnh SQL vào chuỗi", "Chạy chậm hơn một chút", "Sai cú pháp PHP"]
    answer: 1
    explain: "Ghép dữ liệu người dùng vào câu SQL cho phép họ thay đổi ý nghĩa câu lệnh. Luôn dùng prepared statement."
  - question: "Khóa chính (PRIMARY KEY) có đặc điểm gì?"
    options: ["Có thể trùng nhau", "Duy nhất và không rỗng, dùng để xác định từng dòng", "Luôn là chuỗi", "Chỉ có trong bảng người dùng"]
    answer: 1
    explain: "Mỗi dòng có một giá trị khóa chính khác nhau; thường là cột id tự tăng."
  - question: "Trong chuỗi DSN của PDO, vì sao nên có charset=utf8mb4?"
    options: ["Để kết nối nhanh hơn", "Để lưu và đọc đúng tiếng Việt cùng mọi ký tự Unicode, kể cả emoji", "Bắt buộc với mọi CSDL", "Để mã hóa mật khẩu"]
    answer: 1
    explain: "utf8mb4 là bộ mã UTF-8 đầy đủ của MySQL; thiếu nó tiếng Việt có thể bị lỗi font."
  - question: "PDO::ERRMODE_EXCEPTION có tác dụng gì?"
    options: ["Ẩn mọi lỗi", "Ném ngoại lệ (exception) khi truy vấn lỗi để không bỏ sót", "Tự sửa câu SQL sai", "Tắt kết nối khi có lỗi"]
    answer: 1
    explain: "Với chế độ exception, lỗi SQL không bị nuốt mất mà dừng chương trình hoặc được bắt bằng try...catch."
---

## Giải thích khái niệm

### Cơ sở dữ liệu quan hệ: bộ sổ sách có kẻ cột

Ở bài trước, dữ liệu form biến mất ngay khi PHP chạy xong. Để lưu lâu dài, ta cần **cơ sở dữ liệu** (database). **MySQL** (và bản "anh em" MariaDB) là hệ quản trị cơ sở dữ liệu quan hệ rất phổ biến, đi kèm sẵn trong XAMPP, Laragon.

Hãy hình dung một cuốn sổ ghi chép có kẻ cột sẵn:

- Mỗi **bảng** (table) là một cuốn sổ cho một loại thông tin: `sinh_vien`, `khoa_hoc`, `don_hang`.
- Mỗi **cột** (column) là một trường thông tin có kiểu cố định: `ho_ten` là chuỗi, `nam_sinh` là số.
- Mỗi **dòng** (row) là một bản ghi: một sinh viên cụ thể.
- **Khóa chính** (primary key) là cột định danh duy nhất, thường là `id` tự tăng.

Khác với MongoDB ở khóa Node.js, mọi dòng trong bảng đều có **cùng cấu trúc**, và các bảng liên kết với nhau qua **khóa ngoại** (foreign key), ví dụ `don_hang.sinh_vien_id` trỏ tới `sinh_vien.id`. Chữ "quan hệ" đến từ đó.

### SQL: ngôn ngữ nói chuyện với CSDL

**SQL** (Structured Query Language) là ngôn ngữ để tạo bảng và đọc ghi dữ liệu. Bốn câu lệnh cơ bản tương ứng với CRUD:

| Thao tác | SQL |
|---|---|
| Tạo dòng | `INSERT INTO bang (cot1, cot2) VALUES (?, ?)` |
| Đọc | `SELECT cot1, cot2 FROM bang WHERE dieu_kien ORDER BY cot LIMIT 10` |
| Cập nhật | `UPDATE bang SET cot = ? WHERE id = ?` |
| Xóa | `DELETE FROM bang WHERE id = ?` |

Cảnh báo quan trọng: `UPDATE` và `DELETE` **không có** `WHERE` sẽ tác động lên **mọi dòng** trong bảng. Luôn kiểm tra kỹ điều kiện trước khi chạy.

### PDO: cầu nối giữa PHP và CSDL

**PDO** (PHP Data Objects) là thư viện có sẵn trong PHP để kết nối nhiều loại CSDL với cùng một cách viết. Khi tạo kết nối, bạn cần:

- **DSN** (Data Source Name): chuỗi mô tả nơi kết nối, ví dụ `mysql:host=127.0.0.1;dbname=cnow_php;charset=utf8mb4`. Phần `charset=utf8mb4` giúp tiếng Việt hiển thị đúng.
- Tên đăng nhập và mật khẩu CSDL. Ở máy cá nhân XAMPP thường là `root` và mật khẩu trống; trên server thật phải là tài khoản riêng, mật khẩu mạnh, đọc từ cấu hình chứ không viết thẳng trong code đưa lên Git.
- Các tùy chọn: `PDO::ERRMODE_EXCEPTION` để lỗi được ném ra thay vì bị nuốt mất; `PDO::FETCH_ASSOC` để mỗi dòng trả về là mảng kết hợp.

### SQL injection và prepared statement

Đây là lỗ hổng bảo mật nổi tiếng bậc nhất của web. Nếu bạn **ghép chuỗi** dữ liệu người dùng vào câu SQL, kẻ xấu có thể nhập vào một đoạn SQL làm thay đổi ý nghĩa câu lệnh, ví dụ biến điều kiện đăng nhập thành "luôn đúng", hoặc đọc dữ liệu của người khác.

Giải pháp là **prepared statement** (câu lệnh chuẩn bị sẵn): bạn gửi **khuôn câu lệnh** có chỗ trống `?` (hoặc tên như `:email`) cho CSDL trước, rồi gửi **dữ liệu riêng**. CSDL luôn coi dữ liệu là **giá trị**, không bao giờ là một phần của câu lệnh. Giống như mẫu đơn in sẵn: người điền chỉ được viết vào ô trống, không thể sửa nội dung in sẵn của mẫu.

## Code mẫu có chú thích

Tạo cơ sở dữ liệu và bảng (chạy trong phpMyAdmin hoặc công cụ dòng lệnh `mysql`):

```sql
CREATE DATABASE IF NOT EXISTS cnow_php CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cnow_php;

CREATE TABLE khoa_hoc (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,     -- khóa chính tự tăng
  ten VARCHAR(120) NOT NULL,
  gia DECIMAL(8, 2) NOT NULL DEFAULT 0,           -- DECIMAL: số thập phân chính xác, hợp cho tiền
  cap_do ENUM('Cơ bản', 'Trung cấp', 'Nâng cao') NOT NULL DEFAULT 'Cơ bản',
  tao_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO khoa_hoc (ten, gia, cap_do) VALUES
  ('HTML, CSS', 0, 'Cơ bản'),
  ('PHP & MySQL', 19.99, 'Trung cấp');
```

File kết nối dùng chung `db.php`:

```php
<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;                     // tạo kết nối một lần, dùng lại cho cả request
    if ($pdo === null) {
        $dsn = 'mysql:host=127.0.0.1;dbname=cnow_php;charset=utf8mb4';
        $pdo = new PDO($dsn, getenv('DB_USER') ?: 'root', getenv('DB_PASS') ?: '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // lỗi SQL ném ngoại lệ
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // mỗi dòng là mảng kết hợp
            PDO::ATTR_EMULATE_PREPARES => false,               // dùng prepared statement thật của MySQL
        ]);
    }
    return $pdo;
}
```

Đọc và ghi dữ liệu bằng prepared statement:

```php
<?php
require __DIR__ . '/db.php';

// INSERT với tham số có tên
$them = db()->prepare('INSERT INTO khoa_hoc (ten, gia, cap_do) VALUES (:ten, :gia, :cap_do)');
$them->execute([':ten' => 'Thiết kế web', ':gia' => 29.99, ':cap_do' => 'Nâng cao']);
echo 'Đã thêm khóa học id = ' . db()->lastInsertId() . '<br>';

// SELECT với điều kiện do người dùng nhập (từ ô tìm kiếm)
$tuKhoa = trim((string) ($_GET['q'] ?? ''));
$tim = db()->prepare('SELECT id, ten, gia FROM khoa_hoc WHERE ten LIKE ? ORDER BY gia DESC LIMIT 20');
$tim->execute(['%' . $tuKhoa . '%']);          // dữ liệu đi riêng, không ghép vào câu SQL

foreach ($tim->fetchAll() as $kh) {
    echo htmlspecialchars($kh['ten'], ENT_QUOTES, 'UTF-8') . ' – $' . $kh['gia'] . '<br>';
}

// Đếm số khóa học miễn phí
$dem = db()->query('SELECT COUNT(*) FROM khoa_hoc WHERE gia = 0')->fetchColumn();
echo "Khóa miễn phí: $dem";
```

Để ý: câu lệnh không có dữ liệu người dùng (như đếm khóa miễn phí) có thể dùng `query()` trực tiếp; **bất cứ khi nào có dữ liệu từ bên ngoài**, dùng `prepare()` + `execute()`.

## Lỗi hay gặp

**1. Ghép chuỗi tạo SQL injection.** Đây là lỗi nghiêm trọng nhất bài. Đoạn sau tuyệt đối không viết:

```php norun
<?php
// SAI – đừng bao giờ làm thế này
$sql = "SELECT * FROM nguoi_dung WHERE email = '" . $_POST['email'] . "'";
```

Nếu ai đó nhập `' OR '1'='1`, điều kiện trở thành luôn đúng. Dùng `prepare('... WHERE email = ?')` và `execute([$email])`.

**2. Lỗi font tiếng Việt.** Chữ hiện thành `?` hoặc ký tự lạ thường do thiếu `charset=utf8mb4` trong DSN, hoặc bảng tạo với bộ mã khác. Tạo CSDL với `utf8mb4` ngay từ đầu.

**3. In lỗi kết nối ra trang web.** Thông báo lỗi PDO có thể chứa tên máy chủ, tên người dùng CSDL. Trên website thật, bắt ngoại lệ, ghi vào log và chỉ hiển thị thông báo chung "Hệ thống đang bận".

**4. `UPDATE`/`DELETE` thiếu `WHERE`.** Một câu `DELETE FROM khoa_hoc` xóa sạch bảng. Viết `WHERE` trước, kiểm tra bằng `SELECT` cùng điều kiện, rồi mới đổi thành `DELETE`; và luôn sao lưu dữ liệu quan trọng.

## Bài tập thực hành

Tạo bảng `hoc_vien` (id, ho_ten, email duy nhất, ngay_dang_ky). Viết `dang-ky-hoc-vien.php` nhận form họ tên và email (POST), kiểm tra hợp lệ, thêm vào bảng bằng prepared statement; nếu email đã tồn tại thì báo "Email đã được đăng ký". Bên dưới form hiển thị 10 học viên mới nhất.

Gợi ý: khai báo `email VARCHAR(120) NOT NULL UNIQUE`; khi chèn trùng, PDO ném `PDOException` có mã lỗi SQLSTATE `23000`.

<details>
<summary>Xem lời giải</summary>

```sql
CREATE TABLE hoc_vien (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ho_ten VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  ngay_dang_ky DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

```php
<?php
require __DIR__ . '/db.php';
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
$thongBao = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $hoTen = trim((string) ($_POST['ho_ten'] ?? ''));
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    if (mb_strlen($hoTen) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $thongBao = 'Dữ liệu không hợp lệ.';
    } else {
        try {
            db()->prepare('INSERT INTO hoc_vien (ho_ten, email) VALUES (?, ?)')->execute([$hoTen, $email]);
            header('Location: dang-ky-hoc-vien.php', true, 303);
            exit;
        } catch (PDOException $ex) {
            if ($ex->getCode() !== '23000') throw $ex; // lỗi khác: không nuốt mất
            $thongBao = 'Email đã được đăng ký.';
        }
    }
}
$moiNhat = db()->query('SELECT ho_ten, ngay_dang_ky FROM hoc_vien ORDER BY id DESC LIMIT 10')->fetchAll();
?>
<?php if ($thongBao): ?><p class="loi"><?= e($thongBao) ?></p><?php endif; ?>
<form method="post">
  <input name="ho_ten" required> <input name="email" type="email" required> <button>Đăng ký</button>
</form>
<ul>
  <?php foreach ($moiNhat as $hv): ?><li><?= e($hv['ho_ten']) ?> – <?= e($hv['ngay_dang_ky']) ?></li><?php endforeach; ?>
</ul>
```

</details>

## Tóm tắt

- CSDL quan hệ gồm bảng – cột – dòng, mỗi dòng có khóa chính; bảng liên kết bằng khóa ngoại.
- SQL: `SELECT`, `INSERT`, `UPDATE`, `DELETE`; cẩn thận `WHERE` với `UPDATE`/`DELETE`.
- PDO kết nối với DSN có `charset=utf8mb4`, bật `ERRMODE_EXCEPTION`, mật khẩu CSDL không viết thẳng trong code.
- Dữ liệu từ bên ngoài luôn đi qua prepared statement `prepare` + `execute` để chống SQL injection.
- Không in chi tiết lỗi CSDL ra trang; ghi log và báo lỗi chung.

## Đọc thêm

- [PDO – php.net](https://www.php.net/manual/en/book.pdo.php)
- [Prepared statement – php.net](https://www.php.net/manual/en/pdo.prepared-statements.php)
- [Kết nối và quản lý kết nối – php.net](https://www.php.net/manual/en/pdo.connections.php)
