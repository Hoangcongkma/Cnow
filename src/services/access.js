const { Enrollment } = require('../models');

/** Nhân sự (admin, cộng tác viên): xem được mọi bài học của khóa đã xuất bản. */
const isStaff = (user) => Boolean(user) && ['admin', 'collaborator'].includes(user.role);
/** Giảng viên của khóa học: tác giả khóa học hoặc admin. */
const isInstructor = (user, course) =>
  Boolean(user) && (user.role === 'admin' || String(course.author?._id || course.author) === String(user._id || user.id));

/** Quyền học: học viên đã ghi danh hoặc staff (admin, CTV) – staff xem được mọi bài của khóa đã xuất bản. */
async function access(req, course) {
  const enrolled = Boolean(req.user) && Boolean(await Enrollment.exists({ user: req.user.id, course: course._id }));
  const staff = isStaff(req.user);
  return { enrolled, staff, full: enrolled || staff };
}

module.exports = { access, isStaff, isInstructor };
