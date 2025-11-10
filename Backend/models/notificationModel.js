const db = require('../db');

async function createNotification(userId, type, content) {
  const q = 'INSERT INTO notifications (user_id, type, content, created_at, read) VALUES ($1,$2,$3,now(),false) RETURNING notification_id, user_id, type, content, created_at, read';
  const res = await db.query(q, [userId, type, content]);
  return res.rows[0];
}

async function listNotifications(userId, { onlyUnread = false, limit = 50, offset = 0 } = {}) {
  const base = 'SELECT notification_id, user_id, type, content, created_at, read FROM notifications WHERE user_id = $1';
  const q = onlyUnread ? `${base} AND read = false ORDER BY created_at DESC LIMIT $2 OFFSET $3` : `${base} ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  const res = await db.query(q, [userId, limit, offset]);
  return res.rows;
}

async function markAsRead(notificationId) {
  const res = await db.query('UPDATE notifications SET read = true WHERE notification_id = $1 RETURNING *', [notificationId]);
  return res.rows[0] || null;
}

async function markAllRead(userId) {
  const res = await db.query('UPDATE notifications SET read = true WHERE user_id = $1 RETURNING *', [userId]);
  return res.rows;
}

module.exports = { createNotification, listNotifications, markAsRead, markAllRead };
