const db = require('../db');

async function createChat(chatName = null) {
  const res = await db.query('INSERT INTO chats (chat_name, created_at) VALUES ($1, now()) RETURNING chat_id, chat_name, created_at', [chatName]);
  return res.rows[0];
}

async function getChatById(chatId) {
  const res = await db.query('SELECT chat_id, chat_name, created_at FROM chats WHERE chat_id = $1', [chatId]);
  return res.rows[0] || null;
}

async function listChatsForUser(userId) {
  const q = `SELECT c.chat_id, c.chat_name, c.created_at
             FROM chats c
             JOIN chat_participants cp ON cp.chat_id = c.chat_id
             WHERE cp.user_id = $1
             ORDER BY c.created_at DESC`;
  const res = await db.query(q, [userId]);
  return res.rows;
}

module.exports = { createChat, getChatById, listChatsForUser };
