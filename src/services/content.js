/* eslint-disable security/detect-non-literal-fs-filename -- chỉ đọc file trong thư mục content/ của repo (slug đã kiểm tra bằng regex), không nhận đường dẫn từ người dùng web */
// Đọc bài học văn bản trong content/<slug-khoa>/<so-thu-tu>-<slug-bai>.md (dùng chung cho import-content và check-content)
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./markdown');

const ROOT = path.join(__dirname, '..', '..', 'content');
const FILE_RE = /^(\d{2,3})-([a-z0-9-]+)\.md$/;
// "Đọc thêm" và mọi liên kết trong bài chỉ được trỏ tới tài liệu chính thức
const ALLOWED_LINK = [
  /^https:\/\/developer\.mozilla\.org\//,
  /^https:\/\/nodejs\.org\//,
  /^https:\/\/expressjs\.com\//,
  /^https:\/\/(www\.)?mongodb\.com\/docs\//,
  /^https:\/\/(www\.)?php\.net\//,
];

const listCourses = (root = ROOT) =>
  fs.existsSync(root)
    ? fs
        .readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^[a-z0-9-]+$/.test(d.name))
        .map((d) => d.name)
        .sort()
    : [];

const listLessonFiles = (slug, root = ROOT) =>
  fs
    .readdirSync(path.join(root, slug))
    .filter((f) => FILE_RE.test(f))
    .sort();

/** Số từ phần văn xuôi (bỏ code, HTML, cú pháp Markdown). Tiếng Việt: mỗi âm tiết cách nhau bởi khoảng trắng tính là 1 từ. */
function wordCount(body) {
  const prose = String(body)
    .replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, ' ') // khối code
    .replace(/``[^\n]*?``|`[^`\n]*`/g, ' x ') // code trong dòng (đếm là 1 từ)
    // eslint-disable-next-line security/detect-unsafe-regex -- tuyến tính (không lượng từ lồng nhau chồng lấn), chạy trên file bài học của repo
    .replace(/<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/gi, ' ') // chỉ thẻ HTML thật (không nuốt "i < 5 … n > 0")
    .replace(/\]\([^)]*\)/g, ']'); // URL của liên kết
  return (prose.match(/[\p{L}\p{N}]+/gu) || []).length;
}

/** Các khối code: [{ info, lang, flags:Set, code, output (khối ```text output ngay sau, nếu có) }] */
function codeBlocks(body) {
  const blocks = [];
  const re = /^```([^\n]*)\n([\s\S]*?)^```\s*$/gm;
  let m;
  while ((m = re.exec(body))) {
    const info = m[1].trim();
    const [lang = '', ...flags] = info.split(/\s+/);
    blocks.push({ info, lang: lang.toLowerCase(), flags: new Set(flags), code: m[2], index: m.index, end: re.lastIndex });
  }
  // Gắn khối kết quả mong đợi (```text output) cho khối js liền trước
  for (let i = 0; i < blocks.length - 1; i++) {
    const b = blocks[i];
    const nx = blocks[i + 1];
    const between = body.slice(b.end, nx.index);
    if (['js', 'javascript'].includes(b.lang) && nx.lang === 'text' && nx.flags.has('output') && between.trim().length < 200)
      b.output = nx.code;
  }
  return blocks;
}

// Liên kết trong phần văn bản (bỏ qua URL nằm trong khối code / code trong dòng, ví dụ http://localhost:3000)
const links = (body) =>
  [
    ...String(body)
      .replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, ' ')
      .replace(/``[^\n]*?``|`[^`\n]*`/g, ' ')
      .matchAll(/https?:\/\/[^\s)<>"'`]+/g),
  ].map((x) => x[0].replace(/[.,;:]+$/, ''));

/** Đọc + kiểm tra một bài. Trả về { lesson, errors, warnings, meta }. */
function loadLessonFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(src);
  const errors = [];
  const warnings = [];
  const name = path.basename(file);
  if (!FILE_RE.test(name)) errors.push('tên file phải dạng 01-ten-bai.md');
  if (!data.title || typeof data.title !== 'string') errors.push('thiếu title');
  if (!(Number(data.minutes) > 0)) errors.push('minutes phải là số > 0');
  if (typeof data.preview !== 'boolean') errors.push('preview phải là true/false');
  const objectives = Array.isArray(data.objectives) ? data.objectives.map(String) : [];
  if (objectives.length < 3 || objectives.length > 5) errors.push('objectives cần 3–5 mục');
  const quiz = Array.isArray(data.quiz) ? data.quiz : [];
  if (quiz.length < 3 || quiz.length > 5) errors.push('quiz cần 3–5 câu');
  quiz.forEach((q, i) => {
    if (!q || !q.question || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !String(o ?? '').trim()))
      errors.push(`quiz câu ${i + 1}: cần question + đúng 4 options`);
    if (!(Number.isInteger(q?.answer) && q.answer >= 0 && q.answer <= 3)) errors.push(`quiz câu ${i + 1}: answer phải là 0–3`);
    if (!q?.explain) errors.push(`quiz câu ${i + 1}: thiếu explain`);
  });
  const headings = String(body)
    .split('\n')
    .filter((line) => line.startsWith('## '));
  for (const h of ['Lỗi hay gặp', 'Bài tập thực hành', 'Tóm tắt', 'Đọc thêm'])
    if (!headings.some((line) => line.toLowerCase().includes(h.toLowerCase()))) errors.push(`thiếu mục "## ${h}"`);
  if (!/<details>/.test(body)) errors.push('bài tập cần lời giải ẩn trong <details>');
  for (const l of links(body)) if (!ALLOWED_LINK.some((re) => re.test(l))) errors.push(`liên kết không thuộc tài liệu chính thức: ${l}`);
  const words = wordCount(body);
  if (words < 800 || words > 1500) warnings.push(`độ dài ${words} từ (yêu cầu 800–1500)`);

  const materials = `## Mục tiêu bài học\n\n${objectives.map((o) => `- ${o}`).join('\n')}\n\n${body.trim()}\n`;
  return {
    errors,
    warnings,
    meta: { file: name, words, blocks: codeBlocks(body), links: links(body) },
    lesson: {
      title: String(data.title || '')
        .trim()
        .slice(0, 200),
      minutes: Math.min(600, Math.round(Number(data.minutes) || 10)),
      preview: data.preview === true,
      section: data.section ? String(data.section).trim().slice(0, 150) : null,
      materials,
      quiz: quiz.map((q) => ({
        question: String(q.question).trim(),
        options: (q.options || []).map((o) => String(o).trim()),
        answer: q.answer,
        explain: String(q.explain || '').trim(),
      })),
    },
  };
}

module.exports = { ROOT, ALLOWED_LINK, listCourses, listLessonFiles, loadLessonFile, wordCount, codeBlocks, links };
