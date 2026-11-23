// Ẩn / hiện các khóa học video YouTube miễn phí (danh sách slug lấy từ data/free-videos.json). KHÔNG xóa dữ liệu.
// Chạy: npm run video-courses -- hide   (status = draft → không hiện công khai, học viên chưa vào học được)
//       npm run video-courses -- show   (status = published → hiện lại như cũ, bài học/tiến độ còn nguyên)
//       npm run video-courses           (chỉ liệt kê trạng thái)
const { trusted } = require('mongoose');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config');
const { Course, Enrollment } = require('../src/models');

const FILE = path.join(__dirname, '..', 'data', 'free-videos.json');
const action = process.argv[2];

(async () => {
  if (action && !['hide', 'show'].includes(action)) throw new Error('Tham số chỉ nhận: hide | show');
  const data = require(FILE);
  const slugs = (Array.isArray(data) ? data : data.courses).map((c) => c.slug);
  await mongoose.connect(config.mongoUri);
  if (action) {
    const status = action === 'hide' ? 'draft' : 'published';
    const r = await Course.updateMany({ slug: trusted({ $in: slugs }) }, { $set: { status, published: status === 'published' } });
    console.log(`✓ ${action === 'hide' ? 'Đã ẩn' : 'Đã hiện lại'} ${r.modifiedCount} khóa học`);
  }
  for (const c of await Course.find({ slug: trusted({ $in: slugs }) }).select('slug status sections')) {
    const n = await Enrollment.countDocuments({ course: c._id });
    console.log(`  ${c.slug.padEnd(28)} ${c.status.padEnd(10)} ${String(c.lessons.length).padStart(3)} bài, ${n} ghi danh`);
  }
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
