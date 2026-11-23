---
title: "npm và module"
minutes: 15
preview: false
objectives:
  - "Chia chương trình thành nhiều file bằng module CommonJS (require/module.exports)"
  - "Biết cú pháp ES module (import/export) và khi nào dùng"
  - "Dùng npm: npm init, cài gói, scripts, phân biệt dependencies và devDependencies"
  - "Hiểu package.json, package-lock.json và cách đọc số phiên bản (semver)"
quiz:
  - question: "File tinh-tien.js có module.exports = { cong }. File khác lấy hàm cong thế nào?"
    options: ["import cong from 'tinh-tien'", "const { cong } = require('./tinh-tien')", "require cong", "include('tinh-tien.js')"]
    answer: 1
    explain: "Với module tự viết, đường dẫn phải bắt đầu bằng ./ hoặc ../; không có ./ thì Node.js tìm trong node_modules."
  - question: "Gói chỉ cần lúc phát triển (công cụ kiểm thử, linter) nên cài bằng lệnh nào?"
    options: ["npm install ten-goi", "npm install --save-dev ten-goi", "npm global ten-goi", "npm run ten-goi"]
    answer: 1
    explain: "--save-dev (hoặc -D) ghi vào devDependencies; khi triển khai production có thể bỏ qua các gói này."
  - question: "Trong package.json, \"express\": \"^5.1.0\" cho phép npm cài phiên bản nào?"
    options: ["Chỉ đúng 5.1.0", "5.x.x mới nhất (>= 5.1.0 và < 6.0.0)", "Mọi phiên bản", "6.0.0 trở lên"]
    answer: 1
    explain: "Dấu ^ cho phép nâng phiên bản phụ (minor) và bản vá (patch), không nâng phiên bản chính (major)."
  - question: "Có nên đưa thư mục node_modules lên Git không?"
    options: ["Có, để người khác khỏi cài", "Không; chỉ cần package.json và package-lock.json, người khác chạy npm install", "Chỉ khi dự án nhỏ", "Chỉ đưa node_modules, không cần package.json"]
    answer: 1
    explain: "node_modules rất nặng và có thể tạo lại chính xác từ package-lock.json bằng npm install (hoặc npm ci)."
---

## Giải thích khái niệm

### Vì sao chia nhỏ chương trình?

Một chương trình viết trong một file duy nhất giống như một ngăn kéo chứa lẫn lộn bút, dây sạc, giấy tờ, chìa khóa: lúc đầu còn tìm được, lâu dần thì chịu. **Module** là cách chia chương trình thành nhiều file nhỏ, mỗi file lo một việc: một file tính tiền, một file gửi email, một file định nghĩa route. Mỗi module **giấu kín** chi tiết bên trong và chỉ **xuất ra** (export) những gì nơi khác cần dùng.

### CommonJS: require và module.exports

Node.js từ đầu dùng hệ thống module **CommonJS**:

- Trong file module, gán những gì muốn chia sẻ vào `module.exports`.
- Ở file khác, gọi `require('./ten-file')` để nhận lại đúng giá trị đó.

Có ba loại thứ bạn `require` được: **module có sẵn** của Node.js (`require('fs')`, `require('path')`), **gói cài từ npm** (`require('express')`, Node.js tự tìm trong thư mục `node_modules`), và **file của bạn** (đường dẫn bắt đầu bằng `./` hoặc `../`). Node.js chạy mỗi module **một lần** và ghi nhớ kết quả; các lần `require` sau nhận lại cùng một đối tượng.

### ES module: import và export

JavaScript chuẩn có cú pháp module riêng, gọi là **ES module** (ESM): `export` để xuất, `import` để nhập. Trình duyệt hiện đại và Node.js đều hỗ trợ. Trong Node.js, một file được coi là ES module khi có đuôi `.mjs`, hoặc khi `package.json` khai báo `"type": "module"`. Hai hệ thống giống nhau về ý tưởng; khác biệt hay gặp là ESM dùng được `await` ở cấp cao nhất và đường dẫn import thường phải ghi đủ đuôi file. Dự án Cnow dùng CommonJS, nhiều dự án mới dùng ESM; bạn nên đọc được cả hai.

### npm: kho thư viện khổng lồ

**npm** (Node Package Manager) là công cụ quản lý gói đi kèm Node.js, kết nối tới kho có hàng triệu **gói** (package) do cộng đồng viết sẵn: Express để làm web, Mongoose để làm việc với MongoDB, bcryptjs để băm mật khẩu… Thay vì tự viết lại mọi thứ, bạn "mượn" những viên gạch đã được kiểm chứng.

Những lệnh dùng hằng ngày:

| Lệnh | Tác dụng |
|---|---|
| `npm init -y` | tạo `package.json` cho dự án mới |
| `npm install express` | cài gói, ghi vào `dependencies` |
| `npm install -D eslint` | cài gói chỉ dùng khi phát triển (`devDependencies`) |
| `npm install` | cài tất cả gói theo `package.json` (sau khi clone dự án) |
| `npm run dev` | chạy script tên `dev` khai báo trong `package.json` |
| `npx ten-cong-cu` | chạy công cụ của một gói mà không cần cài toàn cục |

### package.json và package-lock.json

`package.json` là "chứng minh thư" của dự án: tên, mô tả, các **scripts** và danh sách gói phụ thuộc cùng **khoảng phiên bản** cho phép. `package-lock.json` ghi lại **chính xác** phiên bản của từng gói (kể cả gói con) đã cài, để máy người khác và máy chủ cài ra đúng y hệt. Cả hai file đều nên đưa lên Git; thư mục `node_modules` thì **không** (thêm vào `.gitignore`).

Phiên bản theo quy ước **semver** (semantic versioning) có dạng `CHÍNH.PHỤ.VÁ`, ví dụ `5.1.0`. Tăng số CHÍNH khi có thay đổi không tương thích; tăng PHỤ khi thêm tính năng; tăng VÁ khi sửa lỗi. Dấu `^5.1.0` nghĩa là chấp nhận mọi bản `5.x.x` từ 5.1.0 trở lên, nhưng không lên 6.

## Code mẫu có chú thích

Một module tự viết, lưu thành `tinh-tien.js`:

```js file=tinh-tien.js
// Module tính tiền: chỉ xuất ra những hàm nơi khác cần dùng
const THUE_VAT = 0.1;                 // hằng số nội bộ, bên ngoài không thấy

function tongTien(gioHang) {
  return gioHang.reduce((t, mon) => t + mon.gia * mon.soLuong, 0);
}

function coThue(soTien) {
  return Math.round(soTien * (1 + THUE_VAT));
}

module.exports = { tongTien, coThue };
```

File chính `app.js` dùng module đó cùng một module có sẵn:

```js
const path = require('path');                     // module có sẵn của Node.js
const { tongTien, coThue } = require('./tinh-tien'); // module của bạn: có ./

const gio = [
  { ten: 'Bút', gia: 5000, soLuong: 3 },
  { ten: 'Vở', gia: 12000, soLuong: 2 },
];
const tong = tongTien(gio);
console.log('Tạm tính:', tong, '– có VAT:', coThue(tong));
console.log('Tên file module:', path.basename(require.resolve('./tinh-tien')));
```

```text output
Tạm tính: 39000 – có VAT: 42900
Tên file module: tinh-tien.js
```

Cùng ý tưởng viết bằng ES module. File `dinh-dang.mjs`:

```js file=dinh-dang.mjs esm
// export trực tiếp từng hàm
export const tien = (so) => so.toLocaleString('vi-VN') + ' đ';
export default function chaoMung(ten) {
  return `Chào ${ten}!`;
}
```

Và file dùng nó:

```js esm
import chaoMung, { tien } from './dinh-dang.mjs'; // ESM: ghi đủ đuôi file
console.log(chaoMung('An'), 'Bạn cần trả', tien(42900));
```

```text output
Chào An! Bạn cần trả 42.900 đ
```

Phần quan trọng của một `package.json`:

```json
{
  "name": "cua-hang-mini",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "dev": "node --watch app.js"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
```

`npm run dev` sẽ chạy `node --watch app.js`, tự khởi động lại khi bạn sửa code. Riêng `npm start` và `npm test` có thể gõ không cần chữ `run`.

## Lỗi hay gặp

**1. Quên `./` khi require file của mình.** `require('tinh-tien')` khiến Node.js đi tìm gói tên `tinh-tien` trong `node_modules` và báo lỗi:

```js error
const { tongTien } = require('tinh-tien-khong-co-dau-cham'); // Error: Cannot find module
```

**2. Xuất sai cách.** Viết `exports = { tongTien }` (thiếu `module.`) không có tác dụng, nơi `require` nhận về đối tượng rỗng. Dùng `module.exports = { ... }`.

**3. Trộn `require` và `import` trong cùng một file.** File `.js` thường (CommonJS) dùng `import` sẽ báo lỗi cú pháp; file ES module thì không có `require`. Chọn một hệ thống cho mỗi file.

**4. Chỉnh sửa trong `node_modules`.** Mọi thay đổi sẽ mất sau lần `npm install` tới. Nếu gói có lỗi, hãy nâng phiên bản hoặc tìm gói khác. Và trước khi cài một gói lạ, xem số lượt tải, ngày cập nhật gần nhất; `npm audit` giúp phát hiện gói có lỗ hổng đã biết.

## Bài tập thực hành

Tạo module `chuoi.js` xuất hai hàm: `vietHoaChuDau(s)` (viết hoa chữ cái đầu mỗi từ) và `taoSlug(s)` (đổi `'Học Node.js cơ bản'` thành `'hoc-node-js-co-ban'`). Sau đó viết file khác `require` module này và in kết quả cho chuỗi `'lập trình web với node'`.

Gợi ý cho `taoSlug`: `s.normalize('NFD').replace(/[̀-ͯ]/g, '')` bỏ dấu tiếng Việt, nhớ đổi riêng chữ `đ` thành `d`, rồi thay mọi ký tự không phải chữ, số bằng dấu gạch ngang.

<details>
<summary>Xem lời giải</summary>

```js file=chuoi.js
function vietHoaChuDau(s) {
  return s.split(' ').filter(Boolean).map((t) => t[0].toUpperCase() + t.slice(1)).join(' ');
}
function taoSlug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
module.exports = { vietHoaChuDau, taoSlug };
```

```js
const { vietHoaChuDau, taoSlug } = require('./chuoi');
console.log(vietHoaChuDau('lập trình web với node'));
console.log(taoSlug('Học Node.js cơ bản'), taoSlug('lập trình web với node'));
```

```text output
Lập Trình Web Với Node
hoc-node-js-co-ban lap-trinh-web-voi-node
```

</details>

## Tóm tắt

- Module chia chương trình thành file nhỏ; chỉ xuất ra những gì cần chia sẻ.
- CommonJS: `module.exports` và `require('./file')`; ES module: `export` và `import` (đuôi `.mjs` hoặc `"type": "module"`).
- npm cài gói từ kho cộng đồng; `dependencies` cho chạy thật, `devDependencies` cho phát triển.
- `package.json` khai báo scripts và khoảng phiên bản; `package-lock.json` chốt phiên bản chính xác.
- Không đưa `node_modules` lên Git; dùng `npm audit` để kiểm tra gói có lỗ hổng.

## Đọc thêm

- [Module CommonJS – nodejs.org](https://nodejs.org/api/modules.html)
- [ES module – nodejs.org](https://nodejs.org/api/esm.html)
- [Giới thiệu npm – nodejs.org](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager)
