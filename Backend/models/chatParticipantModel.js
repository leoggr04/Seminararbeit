const db = require('../db');

async function addParticipant(chatId, userId, role = 'member') {
  const q = `INSERT INTO chat_participants (chat_id, user_id, joined_at, role) VALUES ($1,$2,now(),$3) ON CONFLICT DO NOTHING RETURNING chat_id, user_id, joined_at, role`;
  const res = await db.query(q, [chatId, userId, role]);
  return res.rows[0] || null;
}

async function removeParticipant(chatId, userId) {
  const q = 'DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2 RETURNING *';
  const res = await db.query(q, [chatId, userId]);
  return res.rows[0] || null;
}

async function listParticipants(chatId) {
  const q = `SELECT cp.chat_id, cp.user_id, cp.joined_at, cp.role, u.first_name, u.email FROM chat_participants cp JOIN users u ON u.user_id = cp.user_id WHERE cp.chat_id = $1 ORDER BY cp.joined_at`;
  const res = await db.query(q, [chatId]);
  return res.rows;
}

async function isParticipant(chatId, userId) {
  const q = 'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2 LIMIT 1';
  const res = await db.query(q, [chatId, userId]);
  return res.rowCount > 0;
}

module.exports = { addParticipant, removeParticipant, listParticipants, isParticipant };
