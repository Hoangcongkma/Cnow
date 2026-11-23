// Tiện ích YouTube dùng chung cho scripts/import-videos.js và trang quản trị.
// Mã video chỉ được tách từ link/mã người dùng nhập và phải được YouTube oEmbed xác nhận – không bao giờ tự tạo mã.
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Tách mã video từ link YouTube (watch?v=, youtu.be/, /embed/, /shorts/, /live/) hoặc mã 11 ký tự. Không hợp lệ → null. */
function videoId(input) {
  const raw = String(input || '').trim();
  if (ID_RE.test(raw)) return raw;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/);
      if (m) id = m[2];
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

/** Gọi YouTube oEmbed để lấy tiêu đề và tên kênh thật. Ném lỗi nếu video không tồn tại, riêng tư hoặc cấm nhúng. */
async function oembed(id, timeoutMs = 10000) {
  if (!ID_RE.test(String(id))) throw new Error('Mã video không hợp lệ');
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'cnow-import-videos' },
  });
  if (!res.ok)
    throw new Error(
      `HTTP ${res.status}${res.status === 401 || res.status === 403 ? ' (video cấm nhúng hoặc riêng tư)' : res.status === 404 || res.status === 400 ? ' (không tồn tại)' : ''}`,
    );
  const data = await res.json();
  if (!data.title || !data.author_name) throw new Error('oEmbed thiếu tiêu đề hoặc tên kênh');
  return { title: String(data.title).trim(), sourceName: String(data.author_name).trim().slice(0, 120), sourceUrl: watchUrl };
}

module.exports = { ID_RE, videoId, oembed };
