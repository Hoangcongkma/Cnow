// Kiểm tra bài học trong content/: frontmatter, bố cục, độ dài, liên kết chính thức và CHẠY THỬ mọi khối code JavaScript/Node.
// Chạy: npm run check:content [slug-khoa ...]
//
// Quy ước khối code (chuỗi sau ```):
//   ```js            chạy bằng node, phải chạy hết không lỗi
//   ```js dom        code trình duyệt: chạy với DOM giả lập (scripts/lib/dom-stub.js), gọi thử mọi hàm xử lý sự kiện
//   ```js server     server HTTP: chạy với biến PORT, gửi GET / và chờ phản hồi < 500, rồi tắt
//   ```js db         cần MongoDB: MONGODB_URI trỏ tới CSDL tạm cnow_lesson_check (bị xóa sau khi kiểm tra)
//   ```js error      ví dụ "Lỗi hay gặp": PHẢI ném lỗi
//   ```js file=a.js  lưu khối với tên a.js (và chạy) để các khối sau require('./a') / import './a.mjs'
//   ```js esm        chạy dạng ES module (.mjs) – dùng cho cú pháp import/export
//   ```js norun      không chạy (chỉ dùng khi thật cần, bị đếm riêng trong báo cáo)
//   ```text output   đặt ngay sau khối js → kết quả in ra phải khớp từng dòng
//   ```css / ```html  không chạy được bằng node → kiểm tra cú pháp (postcss / htmlparser2: thẻ mở-đóng phải cân)
//   ```php           kiểm tra cú pháp bằng php-parser (chưa chạy bằng PHP thật – ghi chú trong báo cáo)
// Bản chạy thử được lưu trong content/_checks/<slug>/ (+ REPORT.md). Có lỗi thì thoát với mã 1 – không commit.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT, listCourses, listLessonFiles, loadLessonFile } = require('../src/services/content');

const CHECKS = path.join(ROOT, '_checks');
const STUB = path.join(__dirname, 'lib', 'dom-stub.js');
const CHECK_DB = 'mongodb://127.0.0.1:27017/cnow_lesson_check';
const RUNNABLE = new Set(['js', 'javascript']);
let port = 4300;

function run(file, { env = {}, timeout = 8000, server = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { cwd: path.dirname(file), env: { ...process.env, ...env, NODE_ENV: 'development' } });
    let out = '';
    let err = '';
    let done = false;
    let httpStatus = null;
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      resolve({ out, err, httpStatus, ...r });
    };
    const timer = setTimeout(() => finish({ code: 'TIMEOUT' }), timeout);
    child.on('exit', (code) => finish({ code }));
    if (server) {
      (async () => {
        for (let i = 0; i < 40 && !done; i++) {
          await new Promise((r) => setTimeout(r, 150));
          try {
            const r = await fetch(`http://127.0.0.1:${env.PORT}/`, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
            httpStatus = r.status;
            await r.text();
            finish({ code: 0 });
            return;
          } catch {
            /* server chưa sẵn sàng */
          }
        }
      })();
    }
  });
}

// HTML/CSS không chạy bằng node được → kiểm tra cú pháp: CSS bằng postcss, HTML bằng htmlparser2 (thẻ mở/đóng phải cân)
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function checkCss(code) {
  try {
    require('postcss').parse(code);
    return null;
  } catch (e) {
    return e.reason || e.message;
  }
}
// PHP: máy kiểm tra chưa có PHP → chỉ kiểm tra cú pháp bằng php-parser (KHÔNG chạy thật)
function checkPhp(code) {
  const Engine = require('php-parser');
  const p = new Engine({ parser: { php8: true, suppressErrors: false, extractDoc: false }, ast: { withPositions: true } });
  const src = /<\?(php|=)/.test(code) ? code : `<?php\n${code}`;
  try {
    p.parseCode(src);
    return null;
  } catch (e) {
    return e.message;
  }
}
function checkHtml(code) {
  const { Parser } = require('htmlparser2');
  const stack = [];
  const problems = [];
  const p = new Parser(
    {
      onopentagname(name) {
        if (!VOID.has(name)) stack.push(name);
      },
      onclosetag(name, implied) {
        if (VOID.has(name)) return;
        if (implied) {
          problems.push(`thẻ <${name}> không được đóng`);
        }
        const i = stack.lastIndexOf(name);
        if (i === -1) problems.push(`thẻ đóng </${name}> thừa`);
        else stack.splice(i);
      },
    },
    { lowerCaseTags: true, recognizeSelfClosing: true },
  );
  p.write(code);
  p.end();
  return problems.length ? [...new Set(problems)].join(', ') : null;
}

const normOut = (s) =>
  String(s)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
const linkCache = new Map();
async function checkLink(url) {
  if (!linkCache.has(url)) {
    linkCache.set(
      url,
      (async () => {
        for (let i = 0; i < 2; i++) {
          try {
            const r = await fetch(url, {
              redirect: 'follow',
              signal: AbortSignal.timeout(15000),
              headers: { 'User-Agent': 'cnow-content-check' },
            });
            await r.arrayBuffer().catch(() => {});
            if (r.ok) return null;
            if (r.status === 404 || r.status === 410) return `HTTP ${r.status}`;
          } catch (e) {
            if (i) return e.message;
          }
        }
        return 'không truy cập được';
      })(),
    );
  }
  return linkCache.get(url);
}

async function checkCourse(slug) {
  const dir = path.join(CHECKS, slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const rows = [];
  let failed = 0;
  for (const f of listLessonFiles(slug)) {
    const { errors, warnings, meta, lesson } = loadLessonFile(path.join(ROOT, slug, f));
    let ran = 0;
    let skipped = 0;
    let parsed = 0;
    for (const [k, b] of meta.blocks.entries()) {
      if (b.lang === 'css' || b.lang === 'html' || b.lang === 'php') {
        const e = b.lang === 'css' ? checkCss(b.code) : b.lang === 'php' ? checkPhp(b.code) : checkHtml(b.code);
        parsed++;
        if (b.flags.has('error')) {
          if (!e) errors.push(`khối ${b.lang} error #${k + 1}: ví dụ lỗi nhưng không phát hiện lỗi cú pháp`);
        } else if (e) errors.push(`khối ${b.lang} #${k + 1}: lỗi cú pháp – ${e}`);
        continue;
      }
      if (!RUNNABLE.has(b.lang)) continue;
      if (b.flags.has('norun')) {
        skipped++;
        continue;
      }
      const named = [...b.flags].find((x) => x.startsWith('file='))?.slice(5);
      if (named && !/^[a-z0-9-]+\.(js|mjs|cjs)$/.test(named)) {
        errors.push(`khối code #${k + 1}: tên file không hợp lệ ${named}`);
        continue;
      }
      const ext = b.flags.has('esm') ? 'mjs' : 'js';
      const base = named || `${f.replace(/\.md$/, '')}-${String(k + 1).padStart(2, '0')}.${ext}`;
      const file = path.join(dir, base);
      const pre = b.flags.has('dom')
        ? `const __dom = require(${JSON.stringify(
            path
              .relative(dir, STUB)
              .replace(/\\/g, '/')
              .replace(/^(?!\.)/, './'),
          )});\n`
        : '';
      const post = b.flags.has('dom') ? '\n;__dom.fireAll();\n' : '\n';
      fs.writeFileSync(file, `// Chạy thử từ ${slug}/${f} – khối code #${k + 1} (${b.info})\n${pre}${b.code}${post}`);
      const env = {};
      if (b.flags.has('server')) env.PORT = String(++port);
      if (b.flags.has('db')) env.MONGODB_URI = CHECK_DB;
      const r = await run(file, { env, server: b.flags.has('server'), timeout: b.flags.has('db') ? 15000 : 8000 });
      ran++;
      const where = `khối code #${k + 1} (${b.info})`;
      const firstErr = (r.err.split('\n').find((l) => /Error|error/.test(l)) || r.err.split('\n')[0] || '').trim();
      if (b.flags.has('error')) {
        if (r.code === 0) errors.push(`${where}: mong đợi ném lỗi nhưng chạy thành công`);
      } else if (b.flags.has('server')) {
        if (!(r.httpStatus >= 200 && r.httpStatus < 500)) errors.push(`${where}: server không phản hồi GET / (${r.code} ${firstErr})`);
      } else if (r.code !== 0) {
        errors.push(`${where}: ${r.code === 'TIMEOUT' ? 'quá thời gian' : `lỗi – ${firstErr}`}`);
      }
      if (b.output !== undefined && !b.flags.has('error') && normOut(r.out) !== normOut(b.output)) {
        errors.push(
          `${where}: kết quả in ra không khớp khối "text output".\n      mong đợi: ${JSON.stringify(normOut(b.output))}\n      thực tế:  ${JSON.stringify(normOut(r.out))}`,
        );
      }
      fs.writeFileSync(
        file.replace(/\.[cm]?js$/, '.out.txt'),
        `exit: ${r.code}${r.httpStatus ? ` · GET / → ${r.httpStatus}` : ''}\n--- stdout ---\n${r.out}\n--- stderr ---\n${r.err}`,
      );
    }
    for (const l of [...new Set(meta.links)]) {
      const e = await checkLink(l);
      if (e) errors.push(`liên kết lỗi (${e}): ${l}`);
    }
    rows.push({ file: f, title: lesson.title, words: meta.words, ran, skipped, parsed, quiz: lesson.quiz.length, errors, warnings });
    if (errors.length) failed++;
  }
  const table = [
    '| Bài | Số từ | Code JS/Node đã chạy thử | HTML/CSS/PHP đã kiểm tra cú pháp | Câu quiz | Ghi chú |',
    '|---|---:|---:|---:|---:|---|',
    ...rows.map(
      (r) =>
        `| ${r.title} | ${r.words} | ${r.ran}${r.skipped ? ` (+${r.skipped} không chạy)` : ''} | ${r.parsed} | ${r.quiz} | ${r.errors.length ? `❌ ${r.errors.length} lỗi` : '✅'}${r.warnings.length ? ` ⚠ ${r.warnings.join('; ')}` : ''} |`,
    ),
  ];
  fs.writeFileSync(path.join(dir, 'REPORT.md'), `# Kiểm tra nội dung: ${slug}\n\n${table.join('\n')}\n`);
  console.log(`\n=== ${slug} ===\n${table.join('\n')}`);
  for (const r of rows) for (const e of r.errors) console.log(`  ✗ ${r.file}: ${e}`);
  for (const r of rows) for (const w of r.warnings) console.log(`  ⚠ ${r.file}: ${w}`);
  return failed;
}

(async () => {
  const slugs = process.argv.slice(2).length ? process.argv.slice(2) : listCourses();
  let failed = 0;
  for (const s of slugs) failed += await checkCourse(s);
  // Dọn CSDL tạm dùng cho khối ```js db
  try {
    const mongoose = require('mongoose');
    const c = await mongoose.createConnection(CHECK_DB, { serverSelectionTimeoutMS: 2000 }).asPromise();
    await c.dropDatabase();
    await c.close();
  } catch {
    /* không có MongoDB thì thôi */
  }
  console.log(
    failed
      ? `\n✗ ${failed} bài có lỗi – sửa rồi chạy lại trước khi import/commit.`
      : '\n✓ Tất cả bài hợp lệ, mọi đoạn code đã chạy thử thành công.',
  );
  process.exit(failed ? 1 : 0);
})();
