// Tính tiến độ học từ Progress (chỉ đếm bài còn tồn tại trong khóa học hiện tại)
function summarize(course, progress) {
  const lessons = course.lessons;
  const done = new Set((progress?.completedLessons || []).map(String));
  const completed = lessons.filter((l) => done.has(String(l._id))).length;
  const total = lessons.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  // "Học tiếp": bài đang xem dở; nếu bài đó đã học xong thì bài chưa học kế tiếp
  let resume = lessons.findIndex((l) => String(l._id) === String(progress?.lastLesson));
  if (resume < 0 || done.has(String(lessons[resume]._id))) {
    const from = Math.max(0, resume);
    const next = lessons.findIndex((l, i) => i >= from && !done.has(String(l._id)));
    resume = next >= 0 ? next : lessons.findIndex((l) => !done.has(String(l._id)));
    if (resume < 0) resume = 0;
  }
  return { done, completed, total, pct, resume, finished: total > 0 && completed === total };
}

module.exports = { summarize };
