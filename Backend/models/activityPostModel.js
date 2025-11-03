const db = require('../db');

async function createActivityPost({ user_id, activity_type_id, description, start_time, end_time, latitude, longitude, status }) {
  const q = `INSERT INTO activity_posts (user_id, activity_type_id, description, start_time, end_time, latitude, longitude, status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()) RETURNING *`;
  const params = [user_id, activity_type_id, description, start_time, end_time, latitude, longitude, status || 'offen'];
  const res = await db.query(q, params);
  return res.rows[0];
}

async function getActivityPostById(postId) {
  const res = await db.query('SELECT * FROM activity_posts WHERE post_id = $1', [postId]);
  return res.rows[0] || null;
}

async function getActivityPostsByUser(userId) {
  const res = await db.query('SELECT * FROM activity_posts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows;
}

async function listActivityPosts({ limit = 50, offset = 0 } = {}) {
  const res = await db.query('SELECT * FROM activity_posts ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
  return res.rows;
}

async function updateActivityPost(postId, fields = {}) {
  // Build dynamic SET clause
  const keys = Object.keys(fields);
  if (keys.length === 0) return getActivityPostById(postId);
  const setParts = keys.map((k, i) => `${k} = $${i + 1}`);
  const q = `UPDATE activity_posts SET ${setParts.join(', ')}, created_at = created_at WHERE post_id = $${keys.length + 1} RETURNING *`;
  const params = keys.map(k => fields[k]).concat([postId]);
  const res = await db.query(q, params);
  return res.rows[0];
}

async function deleteActivityPost(postId) {
  const res = await db.query('DELETE FROM activity_posts WHERE post_id = $1 RETURNING *', [postId]);
  return res.rows[0] || null;
}

module.exports = {
  createActivityPost,
  getActivityPostById,
  getActivityPostsByUser,
  listActivityPosts,
  updateActivityPost,
  deleteActivityPost,
};
