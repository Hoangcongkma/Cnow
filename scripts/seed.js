// Tạo dữ liệu mẫu: tài khoản quản trị, cộng tác viên và các khóa học
// Chạy: npm run seed     (an toàn khi chạy lại – không tạo trùng)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config');
const { User, Course } = require('../src/models');
const { checkPassword } = require('../src/services/password');

const L = (titles, previewFirst = true) =>
  titles.map((t, i) => ({ title: t, minutes: 8 + ((i * 7) % 15), preview: previewFirst && i === 0 }));

const COURSES = [
  {
    slug: 'nhap-mon-lap-trinh',
    title: 'Nhập môn lập trình',
    tag: 'FREE',
    color: '#00897b',
    price: 0,
    level: 'Cơ bản',
    summary: 'Tư duy lập trình, biến, điều kiện, vòng lặp – khóa học miễn phí cho người mới bắt đầu.',
    lessons: L(['Lập trình là gì?', 'Biến và kiểu dữ liệu', 'Câu lệnh điều kiện', 'Vòng lặp', 'Hàm']),
  },
  {
    slug: 'html-css',
    title: 'HTML, CSS từ zero đến hero',
    tag: 'HTML CSS',
    color: '#2196f3',
    price: 14.99,
    level: 'Cơ bản',
    summary: 'Xây dựng giao diện web chuẩn, responsive với HTML5 và CSS3.',
    lessons: L([
      'Cấu trúc trang HTML',
      'Thẻ văn bản, liên kết, hình ảnh',
      'Selector và box model',
      'Flexbox',
      'CSS Grid',
      'Responsive design',
    ]),
  },
  {
    slug: 'javascript-co-ban',
    title: 'JavaScript cơ bản',
    tag: 'JS',
    color: '#f7b500',
    price: 19.99,
    level: 'Cơ bản',
    summary: 'Nắm vững JavaScript – ngôn ngữ của web: cú pháp, hàm, mảng, đối tượng, DOM.',
    lessons: L(['Giới thiệu JavaScript', 'Kiểu dữ liệu và toán tử', 'Hàm và phạm vi', 'Mảng và đối tượng', 'Làm việc với DOM', 'Sự kiện']),
  },
  {
    slug: 'nodejs-express',
    title: 'Node.js & Express',
    tag: 'NodeJS',
    color: '#4caf50',
    price: 24.99,
    level: 'Trung cấp',
    summary: 'Xây dựng web server và REST API với Node.js, Express và MongoDB.',
    lessons: L([
      'Node.js hoạt động thế nào',
      'npm và module',
      'Express routing',
      'Middleware',
      'Kết nối MongoDB với Mongoose',
      'Xác thực người dùng',
    ]),
  },
  {
    slug: 'php-mysql',
    title: 'PHP & MySQL',
    tag: 'PHP',
    color: '#9c27b0',
    price: 19.99,
    level: 'Trung cấp',
    summary: 'Lập trình web động với PHP và cơ sở dữ liệu MySQL.',
    lessons: L(['Cú pháp PHP', 'Form và xử lý dữ liệu', 'Kết nối MySQL với PDO', 'CRUD hoàn chỉnh', 'Phiên làm việc và cookie']),
  },
  {
    slug: 'web-design',
    title: 'Thiết kế web (Web design)',
    tag: 'DESIGN',
    color: '#e91e63',
    price: 29.99,
    level: 'Nâng cao',
    summary: 'Nguyên tắc thiết kế giao diện, màu sắc, bố cục và trải nghiệm người dùng.',
    lessons: L(['Nguyên tắc thị giác', 'Màu sắc và typography', 'Bố cục lưới', 'Thiết kế responsive', 'Prototype với Figma']),
  },
];

async function upsertUser({ username, name, email, role, password }) {
  const existing = await User.findOne({ username });
  if (existing) return { user: existing, created: false };
  const user = await User.create({ username, name, email, role, passwordHash: await bcrypt.hash(password, 12) });
  return { user, created: true };
}

/** Tạo 6 khóa học mẫu (chỉ thêm khóa chưa có) và nạp bài học văn bản. Dùng chung cho seed và kiểm thử. */
async function seedCourses(authorId) {
  let n = 0;
  for (const c of COURSES) {
    const { lessons, ...rest } = c;
    const doc = {
      ...rest,
      sections: [{ title: 'Nội dung khóa học', lessons }],
      author: authorId,
      description: c.summary,
      status: 'published',
      published: true,
    };
    const r = await Course.updateOne({ slug: c.slug }, { $setOnInsert: doc }, { upsert: true });
    n += r.upsertedCount;
  }
  const { importCourse } = require('./import-content');
  const { listCourses } = require('../src/services/content');
  const withContent = new Set(listCourses());
  for (const c of COURSES) if (withContent.has(c.slug)) await importCourse(c.slug);
  return n;
}

module.exports = { COURSES, seedCourses };

if (require.main === module)
  (async () => {
    await mongoose.connect(config.mongoUri);
    await require('../src/migrations').runMigrations();
    // KHÔNG BAO GIỜ in mật khẩu ra màn hình/log. Mật khẩu admin lấy từ SEED_ADMIN_PASSWORD (bắt buộc khi chưa có admin).
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@cnow.local';
    if (!(await User.exists({ username: 'admin' }))) {
      const pw = process.env.SEED_ADMIN_PASSWORD || '';
      const errors = pw ? checkPassword(pw, { username: 'admin', email: adminEmail }) : ['chưa khai báo'];
      if (errors.length) {
        throw new Error(`SEED_ADMIN_PASSWORD không hợp lệ (${errors.join(' ')}). Đặt biến môi trường này rồi chạy lại.`);
      }
    }
    const admin = await upsertUser({
      username: 'admin',
      name: 'Quản trị viên',
      email: adminEmail,
      role: 'admin',
      password: process.env.SEED_ADMIN_PASSWORD,
    });
    // CTV mẫu: mật khẩu từ SEED_COLLAB_PASSWORD; không khai báo → mật khẩu ngẫu nhiên không ai biết (không in ra)
    const collab = await upsertUser({
      username: 'congtacvien',
      name: 'Cộng tác viên',
      email: 'ctv@cnow.local',
      role: 'collaborator',
      password: process.env.SEED_COLLAB_PASSWORD || crypto.randomBytes(24).toString('base64url'),
    });

    const n = await seedCourses(collab.user._id);
    console.log(`✓ Khóa học: thêm mới ${n}/${COURSES.length}`);
    for (const a of [admin, collab]) {
      console.log(a.created ? `✓ Tạo tài khoản ${a.user.role}: ${a.user.username}` : `• Tài khoản ${a.user.username} đã tồn tại`);
    }
    if (admin.created) console.log('  Mật khẩu admin = giá trị SEED_ADMIN_PASSWORD (không in ra).');
    if (collab.created && !process.env.SEED_COLLAB_PASSWORD)
      console.log('  CTV mẫu có mật khẩu ngẫu nhiên (đặt SEED_COLLAB_PASSWORD nếu cần).');
    if (!(await User.exists({ username: 'admin', adminPinHash: { $type: 'string' } }))) {
      console.log('! Admin chưa có mã quản trị → chạy "npm run set:admin-pin" trước khi đăng nhập trang quản trị.');
    }
    await mongoose.disconnect();
  })().catch(async (e) => {
    console.error(`✗ ${e.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
