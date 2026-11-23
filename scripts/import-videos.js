// Nhập khóa học MIỄN PHÍ từ video YouTube công khai, có ghi công tác giả.
// Chạy: npm run import:videos  [đường-dẫn-file.json]   (mặc định data/free-videos.json, an toàn khi chạy lại)
//
// Với mỗi link, script gọi YouTube oEmbed để lấy TIÊU ĐỀ và TÊN KÊNH THẬT.
// Link nào oEmbed lỗi (video riêng tư, đã xóa, cấm nhúng, sai link) thì bỏ qua và in cảnh báo.
// Mã video chỉ được tách từ link trong file JSON – script không bao giờ tự tạo mã video.
//
// Định dạng file JSON:
// {
//   "courses": [{
//     "slug": "html-css-mien-phi", "title": "Lộ trình HTML/CSS miễn phí",
//     "summary": "...", "description": "...", "level": "Cơ bản", "tag": "HTML CSS", "color": "#2196f3",
//     "license": "Giấy phép chuẩn YouTube – chỉ nhúng",        (mặc định cho mọi bài, có thể bỏ)
//     "sections": [                                             (tùy chọn – nếu không có thì dùng "lessons" thành 1 chương)
//       { "title": "Chương 1: Làm quen", "lessons": [ ...như dưới... ] }
//     ],
//     "lessons": [
//       { "url": "https://www.youtube.com/watch?v=...", "minutes": 12, "preview": true },
//       { "url": "https://youtu.be/...", "title": "Tiêu đề tự đặt (nếu muốn thay tiêu đề gốc)", "license": "CC BY" }
//     ]
//   }]
// }
// Giá luôn là 0: không gắn video của người khác vào khóa có phí.
// Khi nhập lại, bài học có cùng video giữ nguyên _id, tài liệu và trắc nghiệm (tiến độ học viên không bị mất).
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config');
const { User, Course } = require('../src/models');
const { videoId, oembed } = require('../src/services/youtube');
const { runMigrations } = require('../src/migrations');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'free-videos.json'));
const DEFAULT_LICENSE = 'Giấy phép chuẩn YouTube – chỉ nhúng, bản quyền thuộc tác giả';
const COLORS = ['#f05123', '#e91e63', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#00897b', '#3f51b5']; // khớp routes/admin.js
const LEVELS = ['Cơ bản', 'Trung cấp', 'Nâng cao'];

const warn = (msg) => console.warn(`⚠ ${msg}`);

(async () => {
  if (!fs.existsSync(FILE)) {
    console.error(`✗ Không tìm thấy ${FILE}. Xem định dạng ở đầu file scripts/import-videos.js.`);
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const list = Array.isArray(input) ? input : input.courses;
  if (!Array.isArray(list)) throw new Error('File JSON phải có mảng "courses"');

  await mongoose.connect(config.mongoUri);
  await runMigrations();
  const author = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id');
  let ok = 0,
    skipped = 0;

  for (const c of list) {
    const slug = String(c.slug || '')
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug) || !c.title) {
      warn(`Bỏ qua khóa thiếu slug/title hợp lệ: ${JSON.stringify(c.title || c.slug)}`);
      continue;
    }

    const existing = await Course.findOne({ slug });
    if (existing && existing.price > 0) {
      warn(`Bỏ qua "${slug}": khóa đã tồn tại và có phí – không gắn video của người khác vào khóa có phí.`);
      continue;
    }
    const oldByVideo = new Map((existing ? existing.lessons : []).filter((l) => l.youtubeId).map((l) => [l.youtubeId, l]));

    const rawSections =
      Array.isArray(c.sections) && c.sections.length ? c.sections : [{ title: 'Nội dung khóa học', lessons: c.lessons || [] }];
    const sections = [];
    const seen = new Set();
    let n = 0;
    for (const s of rawSections) {
      const lessons = [];
      for (const l of s.lessons || []) {
        const where = `${slug} – bài ${++n}`;
        const id = videoId(l.url);
        if (!id) {
          warn(`${where}: link không phải video YouTube hợp lệ (${l.url}) – bỏ qua`);
          skipped++;
          continue;
        }
        if (seen.has(id)) {
          warn(`${where}: video ${id} bị lặp – bỏ qua`);
          skipped++;
          continue;
        }
        let info;
        try {
          info = await oembed(id);
        } catch (e) {
          warn(`${where}: oEmbed lỗi cho ${l.url}: ${e.message} – bỏ qua`);
          skipped++;
          continue;
        }
        seen.add(id);
        const old = oldByVideo.get(id);
        lessons.push({
          ...(old ? { _id: old._id, materials: old.materials, quiz: old.quiz } : {}),
          title: String(l.title || info.title)
            .trim()
            .slice(0, 200),
          youtubeId: id,
          minutes: Math.max(0, Number(l.minutes) || 10),
          preview: Boolean(l.preview),
          sourceName: info.sourceName,
          sourceUrl: info.sourceUrl,
          license: String(l.license || c.license || DEFAULT_LICENSE)
            .trim()
            .slice(0, 120),
        });
        ok++;
        console.log(`  ✓ ${where}: ${info.title} — ${info.sourceName}`);
      }
      if (lessons.length)
        sections.push({
          title: String(s.title || 'Nội dung khóa học')
            .trim()
            .slice(0, 150),
          lessons,
        });
    }
    if (!sections.length) {
      warn(`Khóa "${slug}" không có video hợp lệ nào – không lưu.`);
      continue;
    }
    const total = sections.reduce((t, s) => t + s.lessons.length, 0);

    const data = {
      title: String(c.title).trim(),
      summary: String(c.summary || '').trim(),
      description: String(c.description || c.summary || '').trim(),
      level: LEVELS.includes(c.level) ? c.level : 'Cơ bản',
      tag: String(c.tag || 'FREE')
        .trim()
        .slice(0, 20),
      price: 0,
      sections,
    };
    if (existing) {
      Object.assign(existing, data);
      if (COLORS.includes(c.color)) existing.color = c.color;
      await existing.save();
      console.log(`✓ Cập nhật khóa "${data.title}" (${total} bài)`);
    } else {
      await Course.create({
        ...data,
        slug,
        color: COLORS.includes(c.color) ? c.color : '#00897b',
        status: 'published',
        author: author && author._id,
      });
      console.log(`✓ Tạo khóa "${data.title}" (${total} bài)`);
    }
  }

  console.log(`\nXong: ${ok} video đã xác nhận, ${skipped} link bị bỏ qua.`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
