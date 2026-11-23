# Sao lưu và khôi phục MongoDB

## Sao lưu

```bash
npm run backup                     # tự chọn: có mongodump thì dùng, không thì dùng driver Node
npm run backup -- --out=D:/cnow-backups
npm run backup -- --method=node    # ép dùng driver Node
```

- **Có MongoDB Database Tools** (`mongodump`): tạo `backups/cnow-YYYYMMDD-HHMMSS.archive.gz` (`--archive --gzip`).
- **Không có:** tạo thư mục `backups/cnow-YYYYMMDD-HHMMSS/` gồm:
  - mỗi collection một file `<tên>.jsonl.gz`, ở dạng Extended JSON chuẩn nên giữ đúng kiểu `ObjectId`, `Date`, `Binary` (gồm cả ảnh đại diện trong GridFS `avatars.files` / `avatars.chunks`);
  - `manifest.json` ghi số bản ghi và định nghĩa index.
- Script đọc `MONGODB_URI` như website. Chuỗi kết nối không được in ra màn hình.

Với Atlas (production), chạy từ máy có quyền truy cập DB:

```powershell
$env:NODE_ENV="production"; $env:BASE_URL="https://cnow.onrender.com"; $env:SESSION_SECRET="<như trên Render>"
$env:MONGODB_URI="<chuỗi Atlas>"
npm run backup -- --out=D:/cnow-backups
```

Atlas M0 (free) không có backup tự động, nên cần chạy script này định kỳ, ví dụ hằng tuần bằng Task Scheduler / cron.

## Khôi phục

```bash
npm run restore -- --from=backups/cnow-20261124-010203 --yes          # nạp thêm vào dữ liệu hiện có
npm run restore -- --from=backups/cnow-20261124-010203 --yes --drop   # xóa rồi nạp: về đúng trạng thái lúc sao lưu
npm run restore -- --from=backups/cnow-20261124.archive.gz --yes      # bản mongodump (cần mongorestore)
```

- Bắt buộc `--yes` vì thao tác ghi đè dữ liệu. Ở `NODE_ENV=production` cần thêm `--allow-production`.
- Index được tạo lại theo `manifest.json`. Sau khi khôi phục, khởi động lại server để chạy migration và kiểm tra index.
- Nên khôi phục thử vào một CSDL riêng (`MONGODB_URI=…/cnow_restore_test`) trước khi khôi phục đè lên CSDL thật.

## Bảo vệ bản sao lưu

- Thư mục `backups/` nằm trong `.gitignore`. Tuyệt đối không commit bản sao lưu.
- Bản sao lưu chứa dữ liệu cá nhân (C2, C3) và phiên đăng nhập (C1, xem [data-inventory.md](data-inventory.md)):
  - lưu trên ổ đĩa mã hóa (BitLocker / FileVault), giới hạn quyền đọc;
  - giữ tối đa 3 bản gần nhất;
  - xóa an toàn bản cũ.
- Kiểm tra định kỳ: test `test/privacy.test.js` sao lưu → làm mất dữ liệu → khôi phục, rồi so khớp số bản ghi, kiểu dữ liệu, file GridFS và index.
