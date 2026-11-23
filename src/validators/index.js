// Kiểm tra đầu vào bằng zod cho MỌI route: params, query, body.
// - params sai định dạng (id, slug…) → 404 (không tiết lộ lý do).
// - body sai cấu trúc (sai kiểu, quá dài, mảng/object thay cho chuỗi, giá trị ngoài whitelist) → 400 với thông báo chung.
// - query (bộ lọc, phân trang) dễ dãi: giá trị sai bị bỏ qua thay vì báo lỗi, để link cũ / link sửa tay không gãy.
// Trường không khai báo trong schema bị loại khỏi req.body/req.query (chống mass assignment).
// Kiểm tra nghiệp vụ (tên đăng nhập hợp lệ, mật khẩu đủ mạnh…) vẫn nằm trong route để trả thông báo thân thiện.
const { z } = require('zod');

/** Chuỗi tối đa `max` ký tự. */
const str = (max) => z.string().max(max);
/** Chuỗi tùy chọn tối đa `max` ký tự. */
const optStr = (max) => str(max).optional();
const oid = z.string().regex(/^[a-f0-9]{24}$/i);
const slug = z.string().regex(/^[a-z0-9-]{1,120}$/);
const flag = z.enum(['0', '1']).optional();
/** Trường lặp tên trong form (name="x" nhiều lần) → chuỗi hoặc mảng chuỗi. */
const list = (max, items = 50) => z.union([str(max), z.array(str(max)).max(items)]).optional();
/** Tham số query dễ dãi: sai thì coi như không có. */
const q = (schema) => schema.optional().catch(undefined);
/** Tham số query dạng chuỗi tối đa `max` ký tự (dễ dãi: sai thì bỏ qua). */
const qs = (max) => q(str(max));

/** Gán đè thuộc tính chỉ đọc của Express 5 (req.query là getter). */
function setProp(req, key, value) {
  Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true });
}

const notFound = (res) =>
  res.status(404).render('error', { title: 'Không tìm thấy', message: 'Trang hoặc dữ liệu bạn tìm không tồn tại.' });
const badRequest = (res) =>
  res
    .status(400)
    .render('error', { title: 'Yêu cầu không hợp lệ', message: 'Dữ liệu gửi lên không hợp lệ. Vui lòng tải lại trang và thử lại.' });

/**
 * Middleware kiểm tra đầu vào.
 * @param {{ params?: import('zod').ZodType, query?: import('zod').ZodType, body?: import('zod').ZodType, bare?: boolean }} spec
 *   bare: trả 404 rỗng (route trả file/ảnh, không render trang HTML)
 */
function validate(spec) {
  return (req, res, next) => {
    if (spec.params) {
      const r = spec.params.safeParse(req.params);
      if (!r.success) return spec.bare ? res.status(404).end() : notFound(res);
      Object.assign(req.params, r.data);
    }
    if (spec.query) {
      const r = spec.query.safeParse(req.query);
      if (!r.success) return badRequest(res);
      setProp(req, 'query', r.data);
    }
    if (spec.body) {
      const r = spec.body.safeParse(req.body || {});
      if (!r.success) return badRequest(res);
      req.body = r.data;
    }
    next();
  };
}

module.exports = { z, str, optStr, oid, slug, flag, list, q, qs, validate };
