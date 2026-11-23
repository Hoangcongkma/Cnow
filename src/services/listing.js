// Danh sách có phân trang / tìm kiếm / lọc cho trang quản trị (25 dòng/trang).
// Mọi tham số từ query được ép về chuỗi; chuỗi tìm kiếm được escape trước khi đưa vào RegExp (chống regex injection/ReDoS).
const { User } = require('../models');

const PER_PAGE = 25;
/** Một giá trị query dạng chuỗi (mảng → phần tử đầu, thiếu → ""). */
const one = (v) => String(Array.isArray(v) ? v[0] : (v ?? '')).trim();
const { searchRegex } = require('../utils/security');

/** Regex tìm kiếm không phân biệt hoa thường, đã escape (tối đa 80 ký tự). */
const textRx = (s) => searchRegex(s, 80);
/** Giá trị query thuộc whitelist `allowed`, nếu không trả về `dflt`. */
const pick = (v, allowed, dflt = '') => (allowed.includes(one(v)) ? one(v) : dflt);

/** id người dùng khớp tên / email / tên đăng nhập (tìm kiếm ở trang đơn hàng, người học). */
async function userIdsMatching(q, limit = 5000) {
  const rx = textRx(q);
  return (
    await User.find({ $or: [{ name: rx }, { email: rx }, { username: rx }] })
      .select('_id')
      .limit(limit)
      .lean()
  ).map((u) => u._id);
}

/** Đếm + lấy đúng 1 trang. sort: object Mongo. populate: [[path, select], …]. */
async function paginate(Model, filter, { page: rawPage, sort, per = PER_PAGE, populate = [], select } = {}) {
  const total = await Model.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(rawPage), 10) || 1));
  let q = Model.find(filter)
    .sort(sort)
    .skip((page - 1) * per)
    .limit(per);
  if (select) q = q.select(select);
  for (const [path, fields] of populate) q = q.populate(path, fields);
  return { items: await q, total, page, pages, per };
}

/** Tạo hàm qs(overrides) giữ nguyên bộ lọc hiện tại (bỏ tham số rỗng) – dùng cho link phân trang, sắp xếp, xuất CSV. */
const queryString =
  (params) =>
  (overrides = {}) => {
    const merged = { ...params, ...overrides };
    const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== 1));
    const s = new URLSearchParams(clean).toString();
    return s ? `?${s}` : '?';
  };

module.exports = { PER_PAGE, one, textRx, pick, userIdsMatching, paginate, queryString };
