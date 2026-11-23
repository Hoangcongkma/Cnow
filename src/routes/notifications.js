// Thông báo của người dùng: danh sách, mở (đánh dấu đã đọc rồi chuyển tới link), đánh dấu tất cả đã đọc
const router = require('express').Router();
const { validate } = require('../validators');
const S = require('../validators/schemas');
const { Notification } = require('../models');

// Số thông báo chưa đọc cho chuông trên thanh menu (mọi trang)
async function unreadCount(req, res, next) {
  res.locals.unread = 0;
  if (req.user) res.locals.unread = await Notification.countDocuments({ user: req.user._id, read: false }).catch(() => 0);
  next();
}

router.get('/notifications', validate(S.none), async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.render('user/notifications', { title: 'Thông báo', items });
});

// Mở một thông báo: chỉ của chính mình; link chỉ là đường dẫn nội bộ (schema kiểm tra) → không có open redirect
router.post('/notifications/:id/open', validate(S.notifications.open), async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { read: true } }, { new: true }).catch(
    () => null,
  );
  if (!n) return res.redirect('/notifications');
  res.redirect(n.link && n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/notifications');
});

router.post('/notifications/read-all', validate(S.notifications.readAll), async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.redirect('/notifications');
});

module.exports = router;
module.exports.unreadCount = unreadCount;
