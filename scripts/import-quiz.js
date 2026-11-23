// Nhập trắc nghiệm cho một khóa học từ file JSON (khớp bài học theo mã video YouTube).
// Chạy: npm run import:quiz [đường-dẫn-file.json]   (mặc định data/quiz-javascript.json, an toàn khi chạy lại)
// Định dạng: { "course": "<slug>", "lessons": { "<youtubeId>": [{ question, options[4], answer (0-3), explain }] } }
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config');
const { Course } = require('../src/models');
const { runMigrations } = require('../src/migrations');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'quiz-javascript.json'));

(async () => {
  const input = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  await mongoose.connect(config.mongoUri);
  await runMigrations();
  const course = await Course.findOne({ slug: input.course });
  if (!course) throw new Error(`Không tìm thấy khóa học "${input.course}" – hãy chạy npm run import:videos trước.`);
  let n = 0;
  for (const lesson of course.lessons) {
    const items = input.lessons[lesson.youtubeId];
    if (!items) {
      console.warn(`⚠ Bài "${lesson.title}" chưa có câu hỏi trong file`);
      continue;
    }
    lesson.quiz = items.map((q) => ({ question: q.question, options: q.options, answer: q.answer, explain: q.explain }));
    n++;
  }
  await course.save(); // schema kiểm tra đủ 4 phương án và đáp án 0–3
  console.log(`✓ Đã cập nhật trắc nghiệm cho ${n}/${course.lessons.length} bài của "${course.title}"`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('✗', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
