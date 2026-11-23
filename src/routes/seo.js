// robots.txt và sitemap.xml
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const config = require('../config');
const { Course } = require('../models');

// Trang riêng tư / theo phiên không cần lập chỉ mục
const PRIVATE = ['/admin', '/learn', '/profile', '/my-courses', '/wishlist', '/orders', '/certificate', '/pay', '/login', '/register'];

router.get('/robots.txt', validate(S.none), (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600');
  const lines = ['User-agent: *'];
  if (process.env.DEMO_NOINDEX === 'true') lines.push('Disallow: /');
  else lines.push(...PRIVATE.map((p) => `Disallow: ${p}`), 'Allow: /');
  lines.push('', `Sitemap: ${config.baseUrl}/sitemap.xml`);
  res.send(lines.join('\n') + '\n');
});

const xml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

router.get('/sitemap.xml', validate(S.none), async (req, res) => {
  const courses = await Course.find({ published: true }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(5000).lean();
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/courses', priority: '0.9' },
    { loc: '/verify', priority: '0.3' },
    { loc: '/gioi-thieu', priority: '0.4' },
    ...courses.map((c) => ({ loc: `/courses/${c.slug}`, lastmod: c.updatedAt?.toISOString().slice(0, 10), priority: '0.8' })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${xml(config.baseUrl + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
    )
    .join('\n');
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

module.exports = router;
module.exports.PRIVATE = PRIVATE;
