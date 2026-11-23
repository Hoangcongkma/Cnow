// Migration dữ liệu – idempotent, chạy tự động khi khởi động server (server.js) hoặc bằng `npm run migrate`.
// Mỗi migration chỉ chạm vào bản ghi còn ở định dạng cũ nên chạy lại nhiều lần vẫn an toàn.
const mongoose = require('mongoose');
const { Course, Comment, Post } = require('./models');

const MIGRATIONS = [
  {
    name: 'lessons-to-sections',
    // Khóa học cũ có mảng `lessons` phẳng → chuyển thành 1 chương "Nội dung khóa học", giữ nguyên _id từng bài.
    async up() {
      const col = Course.collection;
      const legacy = await col.find({ lessons: { $exists: true } }).toArray();
      for (const c of legacy) {
        const update = { $unset: { lessons: '' } };
        if (!Array.isArray(c.sections) || !c.sections.length) {
          update.$set = {
            sections:
              Array.isArray(c.lessons) && c.lessons.length
                ? [{ _id: new mongoose.Types.ObjectId(), title: 'Nội dung khóa học', lessons: c.lessons }]
                : [],
          };
        }
        await col.updateOne({ _id: c._id }, update);
      }
      return legacy.length;
    },
  },
  {
    name: 'comments-to-qa',
    // Bình luận chung cũ → câu hỏi của bài học đầu tiên. Giữ nguyên bản ghi Comment (chỉ đánh dấu migrated).
    async up() {
      const comments = await Comment.find({ migrated: { $ne: true } });
      let n = 0;
      for (const cm of comments) {
        const course = await Course.findById(cm.course);
        const first = course && course.lessons[0];
        if (!first) continue;
        await Post.collection.insertOne({
          course: cm.course,
          lesson: first._id,
          user: cm.user,
          parent: null,
          content: cm.content,
          hidden: cm.hidden,
          votes: [],
          best: false,
          createdAt: cm.createdAt,
          updatedAt: cm.updatedAt,
        });
        await Comment.updateOne({ _id: cm._id }, { $set: { migrated: true } });
        n++;
      }
      return n;
    },
  },
  {
    name: 'course-status',
    // Khóa học cũ chỉ có `published` → status = published ? 'published' : 'draft'
    async up() {
      const a = await Course.collection.updateMany(
        { status: { $exists: false }, published: { $ne: false } },
        { $set: { status: 'published', published: true } },
      );
      const b = await Course.collection.updateMany({ status: { $exists: false }, published: false }, { $set: { status: 'draft' } });
      return a.modifiedCount + b.modifiedCount;
    },
  },
  {
    name: 'avatars-to-gridfs',
    // Ảnh đại diện cũ nằm trên đĩa (uploads/avatars/<tên>.webp) → chép vào GridFS cùng tên. Chỉ ĐỌC đĩa, không xóa file cũ.
    // Ảnh đã có trong GridFS thì bỏ qua (idempotent); file không còn trên đĩa thì giữ nguyên trường avatar (hiện chữ cái đầu).
    async up() {
      const fs = require('fs/promises');
      const path = require('path');
      const { uploadDir } = require('./config');
      const { User } = require('./models');
      const { NAME_RE, findAvatar, putFile } = require('./services/avatar');
      let n = 0;
      for (const u of await User.find({ avatar: { $type: 'string' } }).select('avatar')) {
        if (!NAME_RE.test(u.avatar) || (await findAvatar(u.avatar))) continue;
        const data = await fs.readFile(path.join(uploadDir, 'avatars', u.avatar)).catch(() => null);
        if (!data) continue;
        await putFile(u.avatar, data, { user: String(u._id), migrated: true });
        n++;
      }
      return n;
    },
  },
];

async function runMigrations({ log = console.log } = {}) {
  for (const m of MIGRATIONS) {
    const n = await m.up();
    if (n) log(`✓ Migration ${m.name}: ${n} bản ghi`);
  }
}

module.exports = { runMigrations, MIGRATIONS };

// Chạy trực tiếp: npm run migrate
if (require.main === module) {
  const config = require('./config');
  (async () => {
    await mongoose.connect(config.mongoUri);
    await runMigrations();
    console.log('✓ Migration xong');
    await mongoose.disconnect();
  })().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
