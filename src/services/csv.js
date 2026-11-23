// Xuất CSV cho Excel: UTF-8 có BOM (đọc đúng tiếng Việt), CRLF, chống CSV/formula injection
const BOM = '﻿';

/** Một ô: số giữ nguyên; chuỗi bắt đầu bằng = + - @ (hoặc tab, CR) bị thêm dấu ' để Excel không hiểu là công thức. */
function cell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (v instanceof Date) return Number.isNaN(+v) ? '' : v.toISOString();
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n;]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  return BOM + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** Gửi file CSV về trình duyệt. name chỉ gồm a-z0-9-. */
function sendCsv(res, name, headers, rows) {
  const safe = String(name).replace(/[^a-z0-9-]/gi, '') || 'export';
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${safe}.csv"`,
    'Cache-Control': 'no-store',
  });
  res.send(toCsv(headers, rows));
}

module.exports = { cell, toCsv, sendCsv };
