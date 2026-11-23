// Nhập bài học văn bản do Cnow tự biên soạn từ content/<slug-khoa>/*.md vào khóa học có cùng slug.
// Chạy: npm run import:content [slug-khoa ...]   (không truyền slug = mọi khóa trong content/; an toàn khi chạy lại)
//
// - Bài cũ có CÙNG TIÊU ĐỀ giữ nguyên _id → tiến độ học, ghi chú, hỏi đáp không bị mất.
// - Frontmatter `section` (tùy chọn) gom các bài liên tiếp thành chương; mặc định 1 chương "Nội dung khóa học".
// - Quiz trong frontmatter được nạp vào hệ thống trắc nghiệm (chấm điểm ở server).
// - Bài văn bản không có video: youtubeId và thông tin nguồn video cũ bị gỡ.
// Nên chạy `npm run check:content` trước để chạy thử mọi đoạn code.
const mongoose = require('mongoose');
const config = require('../src/config');
const { Course } = require('../src/models');
const { runMigrations } = require('../src/migrations');
const { notifyNewLessons } = require('../src/services/notify');
const { ROOT, listCourses, listLessonFiles, loadLessonFile } = require('../src/services/content');
const path = require('path');

const norm = (s) =>
  String(s || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

async function importCourse(slug, { log = console.log } = {}) {
  const course = await Course.findOne({ slug });
  if (!course) {
    log(`⚠ Bỏ qua "${slug}": chưa có khóa học với slug này (chạy npm run seed hoặc tạo trong trang quản trị).`);
    return null;
  }
  const files = listLessonFiles(slug);
  const loaded = files.map((f) => loadLessonFile(path.join(ROOT, slug, f)));
  const bad = loaded.filter((x) => x.errors.length);
  if (bad.length) {
    for (const b of bad) log(`✗ ${slug}/${b.meta.file}: ${b.errors.join('; ')}`);
    log(`✗ Không nhập "${slug}" vì có bài chưa hợp lệ.`);
    return null;
  }
  const oldByTitle = new Map(course.lessons.map((l) => [norm(l.title), l]));
  const oldSections = new Map(course.sections.map((s) => [norm(s.title), s]));
  const sections = [];
  let kept = 0;
  for (const { lesson: l } of loaded) {
    const secTitle = l.section || (sections.length ? sections[sections.length - 1].title : 'Nội dung khóa học');
    let sec = sections[sections.length - 1];
    if (!sec || sec.title !== secTitle) {
      sec = { title: secTitle, lessons: [] };
      const old = oldSections.get(norm(secTitle));
      if (old) sec._id = old._id;
      sections.push(sec);
    }
    const old = oldByTitle.get(norm(l.title));
    if (old) {
      kept++;
      oldByTitle.delete(norm(l.title));
    }
    sec.lessons.push({
      ...(old ? { _id: old._id } : {}),
      title: l.title,
      minutes: l.minutes,
      preview: l.preview,
      materials: l.materials,
      quiz: l.quiz,
      youtubeId: undefined,
      sourceName: undefined,
      sourceUrl: undefined,
      license: undefined,
    });
  }
  const oldIds = new Set(course.lessons.map((l) => String(l._id)));
  course.sections = sections;
  await course.save();
  // Bài mới (không trùng tiêu đề bài cũ) → thông báo cho học viên đã ghi danh
  await notifyNewLessons(
    course,
    course.lessons.filter((l) => !oldIds.has(String(l._id))),
  );
  const total = sections.reduce((t, s) => t + s.lessons.length, 0);
  log(`✓ ${course.title}: ${total} bài (giữ _id ${kept} bài cũ, bỏ ${oldByTitle.size} bài cũ không còn trong content/)`);
  return course;
}

module.exports = { importCourse };

if (require.main === module) {
  (async () => {
    await mongoose.connect(config.mongoUri);
    await runMigrations();
    const slugs = process.argv.slice(2).length ? process.argv.slice(2) : listCourses();
    let failed = 0;
    for (const s of slugs) if (!(await importCourse(s))) failed++;
    await mongoose.disconnect();
    if (failed) process.exit(1);
  })().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
