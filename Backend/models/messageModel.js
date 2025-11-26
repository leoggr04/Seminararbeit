const db = require('../db');

async function createMessage({ chat_id, sender_id, content }) {
  const q = `INSERT INTO messages (chat_id, sender_id, content, sent_at) VALUES ($1,$2,$3,now()) RETURNING message_id, chat_id, sender_id, content, sent_at`;
  const res = await db.query(q, [chat_id, sender_id, content]);
  return res.rows[0];
}

async function getMessagesByChat(chatId, { limit = 100, offset = 0 } = {}) {
  const q = 'SELECT message_id, chat_id, sender_id, content, sent_at FROM messages WHERE chat_id = $1 ORDER BY sent_at ASC LIMIT $2 OFFSET $3';
  const res = await db.query(q, [chatId, limit, offset]);
  return res.rows;
}

async function getMessageById(id) {
  const res = await db.query('SELECT message_id, chat_id, sender_id, content, sent_at FROM messages WHERE message_id = $1', [id]);
  return res.rows[0] || null;
}

module.exports = { createMessage, getMessagesByChat, getMessageById };
