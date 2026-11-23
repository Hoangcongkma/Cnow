---
title: "Sự kiện"
minutes: 18
preview: false
objectives:
  - "Hiểu sự kiện (event) và mô hình 'lắng nghe – phản hồi' của trình duyệt"
  - "Gắn hàm xử lý bằng addEventListener và dùng đối tượng event"
  - "Xử lý form: chặn gửi mặc định, đọc và kiểm tra dữ liệu nhập"
  - "Áp dụng ủy quyền sự kiện (event delegation) cho danh sách động"
quiz:
  - question: "Cách gắn hàm xử lý khi bấm nút được khuyến nghị là gì?"
    options: ["<button onclick=\"xuLy()\">", "nut.addEventListener('click', xuLy)", "nut.click = xuLy()", "window.click(xuLy)"]
    answer: 1
    explain: "addEventListener tách JavaScript khỏi HTML, gắn được nhiều hàm cho một sự kiện và tương thích CSP."
  - question: "Trong hàm xử lý submit của form, event.preventDefault() làm gì?"
    options: ["Xóa dữ liệu form", "Chặn trình duyệt gửi form và tải lại trang", "Gửi form hai lần", "Vô hiệu hóa nút bấm"]
    answer: 1
    explain: "Mặc định submit sẽ gửi form và tải trang mới; preventDefault giữ người dùng ở lại để JavaScript xử lý."
  - question: "Ủy quyền sự kiện (event delegation) là gì?"
    options: ["Gắn một hàm xử lý trên phần tử cha để xử lý sự kiện của nhiều phần tử con", "Gắn hàm cho từng phần tử con", "Gọi sự kiện bằng setTimeout", "Xóa mọi sự kiện"]
    answer: 0
    explain: "Nhờ sự kiện nổi bọt (bubbling) từ con lên cha, một hàm trên cha xử lý được cả những phần tử con được thêm sau."
  - question: "event.target trong hàm xử lý là gì?"
    options: ["Phần tử gắn addEventListener", "Phần tử thực sự phát sinh sự kiện (ví dụ phần tử được bấm)", "Tên sự kiện", "Thời gian xảy ra sự kiện"]
    answer: 1
    explain: "target là nơi sự kiện bắt đầu; currentTarget mới là phần tử đang chạy hàm xử lý."
---

## Giải thích khái niệm

### Trang web luôn "lắng nghe"

Hãy nghĩ đến chuông cửa nhà bạn. Bạn không đứng sau cửa cả ngày để chờ khách; bạn làm việc khác, khi chuông reo thì mới ra mở. Trình duyệt hoạt động y như vậy: mỗi khi người dùng bấm chuột, gõ phím, cuộn trang hay gửi form, nó phát ra một **sự kiện** (event). Việc của bạn là **đăng ký** trước: "khi nút này bị bấm, hãy chạy hàm này". Hàm đó gọi là **hàm xử lý sự kiện** (event handler hoặc event listener).

Đây là cách lập trình **hướng sự kiện** (event-driven): code không chạy một mạch từ trên xuống rồi kết thúc, mà phần lớn thời gian ngồi chờ, phản hồi khi có chuyện xảy ra.

### addEventListener

```js norun
phanTu.addEventListener('tên-sự-kiện', hamXuLy);
```

Một vài sự kiện hay dùng:

| Sự kiện | Xảy ra khi |
|---|---|
| `click` | bấm chuột (hoặc nhấn Enter/Space trên nút) |
| `input` | nội dung ô nhập thay đổi, từng ký tự |
| `change` | chọn xong giá trị của select, checkbox, hoặc rời ô nhập |
| `submit` | gửi form (bấm nút gửi hoặc Enter trong ô nhập) |
| `keydown` | nhấn một phím |
| `DOMContentLoaded` | HTML đã đọc xong (không cần nếu dùng `defer`) |

Bạn có thể từng thấy cách gắn trong HTML như `<button onclick="...">`. Cách đó trộn JavaScript vào HTML, chỉ gắn được một hàm, và bị chặn khi trang dùng chính sách bảo mật CSP. Hãy luôn dùng `addEventListener` trong file `.js` riêng.

### Đối tượng event

Khi gọi hàm xử lý, trình duyệt truyền vào một **đối tượng event** mô tả chuyện vừa xảy ra:

- `event.target`: phần tử phát sinh sự kiện (phần tử được bấm, ô đang gõ).
- `event.currentTarget`: phần tử đang chạy hàm xử lý (nơi gắn `addEventListener`).
- `event.key`: phím được nhấn (với sự kiện bàn phím).
- `event.preventDefault()`: chặn **hành vi mặc định** của trình duyệt, ví dụ form tự gửi đi, liên kết tự chuyển trang.

### Sự kiện nổi bọt và ủy quyền

Khi bạn bấm vào một `<li>` nằm trong `<ul>`, sự kiện không chỉ xảy ra trên `<li>`. Nó **nổi bọt** (bubbling) lên dần: `<li>` → `<ul>` → `<body>` → `document`, giống bọt khí từ đáy hồ nổi lên mặt nước. Nhờ vậy, bạn có thể gắn **một** hàm xử lý trên `<ul>` để xử lý sự kiện của **mọi** `<li>` bên trong, kể cả những `<li>` được thêm vào sau. Kỹ thuật này gọi là **ủy quyền sự kiện** (event delegation). Trong hàm, dùng `event.target.closest('selector')` để biết phần tử con nào được bấm.

Ủy quyền đặc biệt hữu ích với danh sách hiển thị từ dữ liệu (như hàm `render()` ở bài trước), vì mỗi lần vẽ lại các phần tử con là mới tinh, gắn sự kiện cho từng cái sẽ rất rườm rà.

## Code mẫu có chú thích

Một ứng dụng "danh sách việc cần làm" nhỏ. HTML:

```html
<form class="form-viec">
  <label for="o-viec">Việc mới</label>
  <input id="o-viec" name="viec" maxlength="80">
  <button>Thêm</button>
  <p class="loi" aria-live="polite"></p>
</form>
<ul class="ds-viec"></ul>
<p class="dem"></p>
```

`app.js`:

```js dom
'use strict';

const viec = [];                                   // nguồn dữ liệu duy nhất
const form = document.querySelector('.form-viec');
const o = document.querySelector('#o-viec');
const loi = document.querySelector('.loi');
const ds = document.querySelector('.ds-viec');
const dem = document.querySelector('.dem');

function render() {
  ds.replaceChildren();
  viec.forEach((v, i) => {
    const li = document.createElement('li');
    li.textContent = v;                            // an toàn với dữ liệu người dùng
    const nut = document.createElement('button');
    nut.textContent = 'Xóa';
    nut.dataset.viTri = String(i);                 // ghi nhớ vị trí để xóa
    nut.setAttribute('aria-label', `Xóa việc ${v}`);
    li.append(nut);
    ds.append(li);
  });
  dem.textContent = `${viec.length} việc`;
}

// 1. Gửi form: chặn tải lại trang, kiểm tra dữ liệu rồi thêm việc
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const noiDung = o.value.trim();
  if (noiDung.length < 2) {
    loi.textContent = 'Việc cần ít nhất 2 ký tự.';
    return;                                        // dừng sớm khi dữ liệu không hợp lệ
  }
  loi.textContent = '';
  viec.push(noiDung);
  o.value = '';
  render();
});

// 2. Xóa lỗi ngay khi người dùng gõ lại
o.addEventListener('input', () => { loi.textContent = ''; });

// 3. Ủy quyền: MỘT hàm trên <ul> xử lý mọi nút Xóa, kể cả nút tạo sau này
ds.addEventListener('click', (event) => {
  const nut = event.target.closest('button');
  if (!nut) return;                                // bấm vào chỗ khác trong danh sách
  viec.splice(Number(nut.dataset.viTri), 1);
  render();
});

render();
```

Khi chạy thử, mọi hàm xử lý ở trên đều được gọi ít nhất một lần, nên lỗi gõ nhầm tên biến bên trong chúng sẽ lộ ra ngay.

Phím tắt bàn phím và bật tắt giao diện:

```js dom
const hop = document.querySelector('.hop-tim-kiem');
const nutMo = document.querySelector('.nut-tim');

nutMo.addEventListener('click', () => {
  const dangMo = hop.classList.toggle('mo');         // toggle trả về trạng thái mới
  nutMo.setAttribute('aria-expanded', String(dangMo));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hop.classList.remove('mo'); // Esc để đóng
});
```

## Lỗi hay gặp

**1. Gọi hàm thay vì truyền hàm.** Viết `nut.addEventListener('click', xuLy())` sẽ **chạy `xuLy` ngay lập tức** và truyền kết quả (thường là `undefined`) vào. Phải truyền chính hàm: `addEventListener('click', xuLy)`.

**2. Quên `preventDefault()` khi xử lý form.** Trang bị tải lại ngay sau khi bấm "Thêm", dữ liệu vừa thêm biến mất, và bạn chỉ kịp thấy chớp màn hình. Gọi `event.preventDefault()` ở dòng đầu hàm xử lý `submit`.

**3. Gắn sự kiện cho phần tử chưa tồn tại.** Gắn `click` cho các nút Xóa **trước** khi chúng được tạo, hoặc chỉ gắn cho các nút lúc đầu, thì nút thêm sau không phản hồi. Dùng ủy quyền sự kiện trên phần tử cha cố định.

**4. Nhầm `target` với `currentTarget`.** Trong ủy quyền, `event.target` có thể là chữ hoặc phần tử con bên trong nút. Dùng `event.target.closest('button')` để lấy đúng nút.

**5. Chỉ xử lý chuột.** Dùng `<div>` làm nút bấm thì người dùng bàn phím không bấm được. Hãy dùng thẻ `<button>`: nó nhận Enter, Space và được trình đọc màn hình nhận diện.

## Bài tập thực hành

Tạo bộ đếm ký tự cho ô "Giới thiệu bản thân" (tối đa 200 ký tự): khi gõ, đoạn `.con-lai` hiện `Còn lại 185 ký tự`; khi còn dưới 20 ký tự, đoạn đó có class `canh-bao`. Thêm nút "Xóa nội dung" làm trống ô và cập nhật lại bộ đếm.

Gợi ý: viết một hàm `capNhat()` dùng chung cho sự kiện `input` và cho nút xóa.

<details>
<summary>Xem lời giải</summary>

```js dom
const TOI_DA = 200;
const oNhap = document.querySelector('.gioi-thieu');
const conLai = document.querySelector('.con-lai');
const nutXoa = document.querySelector('.nut-xoa');

function capNhat() {
  const con = TOI_DA - oNhap.value.length;
  conLai.textContent = `Còn lại ${con} ký tự`;
  conLai.classList.toggle('canh-bao', con < 20);
}

oNhap.addEventListener('input', capNhat);
nutXoa.addEventListener('click', () => {
  oNhap.value = '';
  capNhat();
  oNhap.focus();
});
capNhat();
```

</details>

## Tóm tắt

- Trình duyệt phát sự kiện khi người dùng tương tác; code đăng ký hàm xử lý bằng `addEventListener`.
- Đối tượng event cho biết `target`, `key`…; `preventDefault()` chặn hành vi mặc định như gửi form.
- Sự kiện nổi bọt từ con lên cha; ủy quyền sự kiện dùng một hàm trên cha cho mọi con, kể cả con thêm sau.
- Truyền hàm, không gọi hàm; kiểm tra dữ liệu và dừng sớm khi không hợp lệ.
- Dùng `<button>` thật để hỗ trợ bàn phím và trình đọc màn hình.

## Đọc thêm

- [Giới thiệu sự kiện – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events)
- [addEventListener – MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [Event bubbling – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)
