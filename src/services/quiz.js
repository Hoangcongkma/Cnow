// Trắc nghiệm cuối bài: chấm điểm hoàn toàn ở server
const PASS_RATIO = 0.7;
const MAX_QUESTIONS = 20;

/** Chấm bài. body chứa q0..qN = chỉ số phương án (0–3). */
function grade(quiz, body) {
  const answers = quiz.map((_, i) => {
    const v = Number.parseInt(String(body[`q${i}`] ?? ''), 10);
    return Number.isInteger(v) && v >= 0 && v <= 3 ? v : -1;
  });
  const correct = quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const total = quiz.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, pct, passed: total > 0 && correct / total >= PASS_RATIO, answers };
}

/** Đọc quiz từ form quản trị (các trường lặp tên: question, optA..optD, answer, explain). */
function parseQuizForm(body) {
  const arr = (v) => (Array.isArray(v) ? v : v === undefined ? [] : [v]).map((x) => String(x ?? ''));
  const qs = arr(body.question);
  const A = arr(body.optA);
  const B = arr(body.optB);
  const C = arr(body.optC);
  const D = arr(body.optD);
  const ans = arr(body.answer);
  const ex = arr(body.explain);
  const quiz = [];
  const errors = [];
  qs.forEach((q, i) => {
    const question = q.trim().slice(0, 500);
    const options = [A[i], B[i], C[i], D[i]].map((o) =>
      String(o || '')
        .trim()
        .slice(0, 300),
    );
    if (!question && options.every((o) => !o)) return; // khối trống → bỏ qua
    const answer = Number.parseInt(ans[i], 10);
    if (!question) errors.push(`Câu ${i + 1}: thiếu nội dung câu hỏi.`);
    if (options.some((o) => !o)) errors.push(`Câu ${i + 1}: cần đủ 4 phương án.`);
    if (!(answer >= 0 && answer <= 3)) errors.push(`Câu ${i + 1}: chưa chọn đáp án đúng.`);
    quiz.push({
      question,
      options,
      answer: answer >= 0 && answer <= 3 ? answer : 0,
      explain: String(ex[i] || '')
        .trim()
        .slice(0, 1000),
    });
  });
  if (quiz.length > MAX_QUESTIONS) errors.push(`Tối đa ${MAX_QUESTIONS} câu hỏi mỗi bài.`);
  return { quiz, errors };
}

const resultFor = (progress, lessonId) => (progress?.quizResults || []).find((r) => String(r.lesson) === String(lessonId)) || null;

// Giới hạn làm lại: tối đa 3 lần nộp / 1 giờ cho mỗi bài (chống nộp dồn để dò đáp án)
const MAX_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

/** Số lần còn được nộp trong cửa sổ 1 giờ và thời điểm được làm tiếp (khi đã hết lượt). */
function attemptsInfo(progress, lessonId, now = Date.now()) {
  const recent = (progress?.quizAttempts || [])
    .filter((a) => String(a.lesson) === String(lessonId) && now - new Date(a.at).getTime() < ATTEMPT_WINDOW_MS)
    .map((a) => new Date(a.at).getTime())
    .sort((a, b) => a - b);
  const left = Math.max(0, MAX_ATTEMPTS - recent.length);
  const retryAt = left ? null : new Date(recent[recent.length - MAX_ATTEMPTS] + ATTEMPT_WINDOW_MS);
  return { left, retryAt };
}

/**
 * Giữ 1 lượt nộp một cách NGUYÊN TỬ (2 lần nộp cùng lúc không vượt giới hạn). Trả về true nếu còn lượt.
 * Progress phải tồn tại sẵn.
 */
async function takeAttempt(Progress, userId, courseId, lessonId, now = new Date()) {
  const since = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
  await Progress.updateOne({ user: userId, course: courseId }, { $pull: { quizAttempts: { at: { $lt: since } } } });
  const r = await Progress.updateOne(
    {
      user: userId,
      course: courseId,
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ['$quizAttempts', []] },
                cond: { $and: [{ $eq: ['$$this.lesson', lessonId] }, { $gte: ['$$this.at', since] }] },
              },
            },
          },
          MAX_ATTEMPTS,
        ],
      },
    },
    { $push: { quizAttempts: { lesson: lessonId, at: now } } },
  );
  return r.modifiedCount === 1;
}

const minutesUntil = (d, now = Date.now()) => Math.max(1, Math.ceil((d.getTime() - now) / 60000));

module.exports = {
  PASS_RATIO,
  MAX_QUESTIONS,
  MAX_ATTEMPTS,
  grade,
  parseQuizForm,
  resultFor,
  attemptsInfo,
  takeAttempt,
  minutesUntil,
};
