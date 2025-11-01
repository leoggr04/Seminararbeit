const db = require('../db');

async function addParticipant(postId, userId) {
  const q = 'INSERT INTO activity_participants (post_id, user_id, joined_at) VALUES ($1, $2, now()) ON CONFLICT DO NOTHING RETURNING *';
  const res = await db.query(q, [postId, userId]);
  return res.rows[0] || null;
}

async function removeParticipant(postId, userId) {
  const q = 'DELETE FROM activity_participants WHERE post_id = $1 AND user_id = $2 RETURNING *';
  const res = await db.query(q, [postId, userId]);
  return res.rows[0] || null;
}

async function listParticipants(postId) {
  const q = `SELECT ap.post_id, ap.user_id, ap.joined_at, u.name, u.email FROM activity_participants ap JOIN users u ON u.user_id = ap.user_id WHERE ap.post_id = $1 ORDER BY ap.joined_at`;
  const res = await db.query(q, [postId]);
  return res.rows;
}

async function isParticipant(postId, userId) {
  const q = 'SELECT 1 FROM activity_participants WHERE post_id = $1 AND user_id = $2 LIMIT 1';
  const res = await db.query(q, [postId, userId]);
  return res.rowCount > 0;
}

module.exports = { addParticipant, removeParticipant, listParticipants, isParticipant };
