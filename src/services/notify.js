// Tạo thông báo cho người dùng. Không bao giờ làm hỏng thao tác chính nếu ghi thông báo lỗi.
const { logger } = require('../logger');
const { Notification, Enrollment } = require('../models');

const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

async function notify(userIds, { type, text, link }) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))];
  if (!ids.length) return 0;
  try {
    await Notification.insertMany(
      ids.map((user) => ({ user, type, text: short(text, 300), link })),
      { ordered: false },
    );
    return ids.length;
  } catch (e) {
    logger.error({ err: e, type }, 'Không tạo được thông báo');
    return 0;
  }
}

/** Báo cho mọi học viên đã ghi danh khi khóa học có bài mới. */
async function notifyNewLessons(course, newLessons) {
  if (!course.published || !newLessons.length) return 0;
  const users = (await Enrollment.find({ course: course._id }).select('user').lean()).map((e) => e.user);
  const first = newLessons[0];
  const index = course.lessons.findIndex((l) => String(l._id) === String(first._id));
  const more = newLessons.length > 1 ? ` và ${newLessons.length - 1} bài khác` : '';
  return notify(users, {
    type: 'new_lesson',
    text: `Khóa học “${short(course.title, 80)}” có bài mới: “${short(first.title, 80)}”${more}.`,
    link: `/learn/${course.slug}?lesson=${Math.max(0, index)}`,
  });
}

module.exports = { notify, notifyNewLessons };
