// Render Markdown tài liệu/bài đọc phía server: marked → tô màu code bằng highlight.js → lọc XSS bằng sanitize-html.
// Kết quả an toàn để in bằng <%- %> (ngoại lệ duy nhất ngoài include).
const { Marked } = require('marked');
const hljs = require('highlight.js');
const sanitizeHtml = require('sanitize-html');
const YAML = require('yaml');

/** "Vòng lặp For" → "vong-lap-for" (bỏ dấu tiếng Việt). */
function slugify(s) {
  return (
    String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'muc'
  );
}

function makeMarked(toc) {
  const used = new Map();
  return new Marked({
    gfm: true,
    renderer: {
      code({ text, lang }) {
        const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
        const html = hljs.highlight(text, { language, ignoreIllegals: true }).value; // highlight.js tự escape HTML
        return `<pre><code class="hljs language-${language}">${html}</code></pre>\n`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const level = Math.min(6, Math.max(2, depth)); // h1 của tài liệu → h2 (tiêu đề trang đã là h1)
        const plain = inner
          .replace(/<[^>]*>/g, '')
          .replace(/&[a-z#0-9]+;/gi, ' ')
          .trim();
        let id = `muc-${slugify(plain)}`;
        const n = used.get(id) || 0;
        used.set(id, n + 1);
        if (n) id += `-${n + 1}`;
        if (level <= 3) toc.push({ id, text: plain, level });
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
    },
  });
}

const HEADING_ID = /^muc-[a-z0-9-]{1,70}$/;
const headingTransform = (tag) => (t, attribs) => ({ tagName: tag, attribs: HEADING_ID.test(attribs.id || '') ? { id: attribs.id } : {} });

const SANITIZE = {
  allowedTags: [
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'del',
    's',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'pre',
    'span',
    'kbd',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'input',
    'details',
    'summary',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    th: ['align'],
    td: ['align'],
    ol: ['start'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'], // chỉ id dạng muc-… (chống DOM clobbering)
    input: ['type', 'checked', 'disabled'], // danh sách việc cần làm của GFM: - [x] ...
  },
  allowedClasses: { code: ['hljs', 'language-*'], span: ['hljs-*', 'language-*'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    h1: headingTransform('h2'),
    h2: headingTransform('h2'),
    h3: headingTransform('h3'),
    h4: headingTransform('h4'),
    h5: headingTransform('h5'),
    h6: headingTransform('h6'),
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' } }),
    input: (tag, attribs) =>
      attribs.type === 'checkbox'
        ? {
            tagName: 'input',
            attribs: { type: 'checkbox', disabled: 'disabled', ...(attribs.checked !== undefined ? { checked: 'checked' } : {}) },
          }
        : { tagName: 'span', attribs: {} },
  },
};

/** Render + lọc XSS. Trả về { html, toc: [{id, text, level}] }. */
function renderDoc(src) {
  const text = String(src || '').trim();
  if (!text) return { html: '', toc: [] };
  const toc = [];
  const html = sanitizeHtml(makeMarked(toc).parse(text), SANITIZE);
  return { html, toc };
}

/** Markdown → HTML an toàn (marked → highlight.js → sanitize-html); in bằng <%- %> được. @param {string} src */
function renderMarkdown(src) {
  return renderDoc(src).html;
}

/** Tách frontmatter YAML ở đầu file Markdown: ---\n...\n--- */
function parseFrontmatter(src) {
  const m = String(src)
    .replace(/^\uFEFF/, '')
    .match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: String(src) };
  return { data: YAML.parse(m[1]) || {}, body: m[2] };
}

module.exports = { renderMarkdown, renderDoc, parseFrontmatter };
