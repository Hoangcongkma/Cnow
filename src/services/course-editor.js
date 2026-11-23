// Nghiệp vụ soạn khóa học / bài học: đọc form, cấu trúc chương–bài, xác nhận video, trạng thái duyệt.
const { videoId, oembed } = require('./youtube');
const { parseQuizForm } = require('./quiz');

/** Màu ảnh bìa được phép (public/js/app.js tô theo data-color) */
const COLORS = ['#f05123', '#e91e63', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#00897b', '#3f51b5'];
const STATUSES = ['draft', 'pending', 'published', 'rejected'];
const MAX_SECTIONS = 50;
const MAX_LESSONS = 500;
const MAX_NEW_VIDEOS = 50;
const LICENSE = 'Giấy phép chuẩn YouTube – chỉ nhúng, bản quyền thuộc tác giả';

const str = (v, max) =>
  String(v ?? '')
    .trim()
    .slice(0, max);
const clampMinutes = (v) => Math.min(600, Math.max(0, Math.round(Number(v)) || 0));

/** Quyền sửa khóa học: admin, hoặc tác giả (CTV tạo khóa). */
const canEdit = (user, course) => user.role === 'admin' || String(course.author) === String(user.id);

/** Một bài học trong JSON của trình dựng → object bài học (giữ dữ liệu cũ nếu id thuộc khóa học). */
function buildLesson(l, old, si, errors) {
  const title = str(l?.title, 200);
  const rawVideo = str(l?.youtubeId, 200);
  const yt = rawVideo ? videoId(rawVideo) : null;
  if (!title) errors.push(`Chương ${si + 1}: có bài học chưa có tiêu đề.`);
  if (rawVideo && !yt) errors.push(`Bài “${title || '?'}”: link/mã video YouTube không hợp lệ.`);
  const lesson = old ? old.toObject() : {};
  Object.assign(lesson, { title, youtubeId: yt || undefined, minutes: clampMinutes(l?.minutes), preview: Boolean(l?.preview) });
  // Đổi video thì nguồn cũ không còn đúng → xóa, sẽ lấy lại qua oEmbed
  if (!old || old.youtubeId !== lesson.youtubeId)
    Object.assign(lesson, { sourceName: undefined, sourceUrl: undefined, license: undefined });
  return lesson;
}

/**
 * Đọc cấu trúc chương/bài do trình dựng (public/js/app.js) gửi lên dạng JSON trong trường `structure`.
 * Bài học có id thuộc khóa học cũ được GIỮ NGUYÊN _id và mọi dữ liệu khác (tài liệu, trắc nghiệm…);
 * id lạ bị bỏ qua và coi như bài mới.
 * @returns {{ sections: object[], errors: string[] }}
 */
function parseStructure(raw, oldCourse) {
  let input;
  try {
    input = JSON.parse(String(raw || '[]'));
  } catch {
    return { sections: [], errors: ['Dữ liệu chương/bài không hợp lệ – hãy bật JavaScript và thử lại.'] };
  }
  if (!Array.isArray(input)) input = [];
  const errors = input.length > MAX_SECTIONS ? [`Tối đa ${MAX_SECTIONS} chương.`] : [];
  const oldSections = new Map((oldCourse?.sections || []).map((s) => [String(s._id), s]));
  const oldLessons = new Map((oldCourse?.lessons || []).map((l) => [String(l._id), l]));
  const usedIds = new Set();
  let count = 0;
  const sections = input.slice(0, MAX_SECTIONS).map((s, si) => {
    const sec = { title: str(s?.title, 150) || `Chương ${si + 1}`, lessons: [] };
    if (oldSections.has(String(s?.id))) sec._id = oldSections.get(String(s.id))._id;
    for (const l of Array.isArray(s?.lessons) ? s.lessons : []) {
      if (++count > MAX_LESSONS) {
        errors.push(`Tối đa ${MAX_LESSONS} bài học.`);
        break;
      }
      const lid = String(l?.id || '');
      const old = !usedIds.has(lid) && oldLessons.get(lid);
      if (old) usedIds.add(lid);
      sec.lessons.push(buildLesson(l, old, si, errors));
    }
    return sec;
  });
  return { sections, errors };
}

/** Video mới (chưa có nguồn) phải được YouTube oEmbed xác nhận và ghi công tác giả. Trả về danh sách lỗi. */
async function verifyVideos(sections) {
  const pending = sections.flatMap((s) => s.lessons).filter((l) => l.youtubeId && !l.sourceUrl);
  const errors = [];
  for (const l of pending.slice(0, MAX_NEW_VIDEOS)) {
    try {
      const info = await oembed(l.youtubeId, 6000);
      Object.assign(l, { sourceName: info.sourceName, sourceUrl: info.sourceUrl, license: LICENSE });
    } catch (e) {
      errors.push(`Bài “${l.title}”: YouTube không xác nhận được video ${l.youtubeId} (${e.message}).`);
    }
  }
  if (pending.length > MAX_NEW_VIDEOS) errors.push(`Mỗi lần lưu chỉ thêm tối đa ${MAX_NEW_VIDEOS} video mới.`);
  return errors;
}

/** Dữ liệu cho trình dựng chương/bài trong form (dạng thuần, có id dạng chuỗi). */
const builderData = (sections) =>
  (sections || []).map((s) => ({
    id: s._id ? String(s._id) : '',
    title: s.title,
    lessons: (s.lessons || []).map((l) => ({
      id: l._id ? String(l._id) : '',
      title: l.title,
      youtubeId: l.youtubeId || '',
      minutes: l.minutes ?? 10,
      preview: Boolean(l.preview),
      sourceName: l.sourceName || '',
    })),
  }));

/** Thông tin chung của khóa học từ form (chỉ các trường được phép). */
function parseCourse(body) {
  return {
    title: String(body.title || '').trim(),
    slug: String(body.slug || '')
      .trim()
      .toLowerCase(),
    summary: String(body.summary || '').trim(),
    description: String(body.description || '').trim(),
    level: body.level,
    price: Math.round(Number(body.price) * 100) / 100,
    tag: String(body.tag || '').trim(),
    color: COLORS.includes(body.color) ? body.color : COLORS[0],
  };
}

/**
 * Trạng thái sau khi lưu form. Admin chọn tự do. CTV chỉ "Lưu nháp" / "Gửi duyệt", KHÔNG tự xuất bản;
 * CTV sửa khóa ĐÃ xuất bản → quay về "Chờ duyệt" (admin phải duyệt lại nội dung mới), hoặc về nháp nếu chủ động ẩn.
 */
function nextStatus(user, current, body) {
  if (user.role === 'admin') return STATUSES.includes(body.status) ? body.status : current || 'published';
  if (current === 'published') return body.intent === 'unpublish' ? 'draft' : 'pending';
  return body.intent === 'submit' ? 'pending' : 'draft';
}

/** Câu bổ sung cho thông báo lưu khóa học theo trạng thái mới. */
const statusFlash = (s) =>
  ({ pending: ' Khóa học đã được gửi cho quản trị viên duyệt.', draft: ' Khóa học đang ở trạng thái nháp.' })[s] || '';

/** Lỗi lưu khóa học → thông báo dễ hiểu (không lộ chi tiết nội bộ). */
function humanize(err) {
  if (err.code === 11000) return 'Đường dẫn (slug) đã tồn tại, hãy chọn slug khác.';
  if (err.name === 'ValidationError') {
    return (
      'Dữ liệu chưa hợp lệ: ' +
      Object.values(err.errors)
        .map((e) => e.path)
        .join(', ')
    );
  }
  return 'Không lưu được khóa học.';
}

/**
 * Form sửa 1 bài học → { form, errors, yt, videoChanged }. Video mới được xác nhận qua oEmbed.
 * @param {object} body req.body đã qua zod
 * @param {object} lesson bài học hiện tại
 */
async function parseLessonForm(body, lesson) {
  const rawVideo = str(body.youtubeId, 200);
  const yt = rawVideo ? videoId(rawVideo) : null;
  const parsedQuiz = parseQuizForm(body);
  const form = {
    _id: lesson._id,
    title: str(body.title, 200),
    youtubeId: yt || rawVideo,
    minutes: clampMinutes(body.minutes),
    preview: body.preview === 'on',
    materials: String(body.materials || '')
      .replace(/\r\n/g, '\n')
      .slice(0, 40000),
    quiz: parsedQuiz.quiz,
  };
  const errors = [...parsedQuiz.errors];
  if (!form.title) errors.push('Bài học cần có tiêu đề.');
  if (rawVideo && !yt) errors.push('Link/mã video YouTube không hợp lệ.');
  const videoChanged = (yt || undefined) !== lesson.youtubeId;
  if (!errors.length && yt && videoChanged) {
    const probe = [{ lessons: [{ title: form.title, youtubeId: yt }] }];
    errors.push(...(await verifyVideos(probe)));
    const v = probe[0].lessons[0];
    Object.assign(form, { sourceName: v.sourceName, sourceUrl: v.sourceUrl, license: v.license });
  }
  return { form, errors, yt, videoChanged };
}

/** Ghi form đã kiểm tra vào bài học (chỉ các trường được phép). */
function applyLessonForm(lesson, { form, yt, videoChanged }) {
  Object.assign(lesson, {
    title: form.title,
    youtubeId: yt || undefined,
    minutes: form.minutes,
    preview: form.preview,
    materials: form.materials,
    quiz: form.quiz,
  });
  if (videoChanged) Object.assign(lesson, { sourceName: form.sourceName, sourceUrl: form.sourceUrl, license: form.license });
}

module.exports = {
  COLORS,
  STATUSES,
  canEdit,
  parseStructure,
  verifyVideos,
  builderData,
  parseCourse,
  nextStatus,
  statusFlash,
  humanize,
  parseLessonForm,
  applyLessonForm,
};
