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
  const q = `SELECT
               c.chat_id,
               c.chat_name,
               c.created_at,
               cp.role,
               cp.last_read_at,
               lm.message_id AS last_message_id,
               lm.sent_at AS last_message_at,
               lm.sender_id AS last_message_sender_id,
               CASE
                 WHEN lm.message_id IS NULL THEN false
                 WHEN cp.last_read_at IS NULL THEN lm.sender_id <> cp.user_id
                 ELSE lm.sent_at > cp.last_read_at AND lm.sender_id <> cp.user_id
               END AS has_unread
             FROM chats c
             JOIN chat_participants cp ON cp.chat_id = c.chat_id
             LEFT JOIN LATERAL (
               SELECT m.message_id, m.sent_at, m.sender_id
               FROM messages m
               WHERE m.chat_id = c.chat_id
               ORDER BY m.sent_at DESC, m.message_id DESC
               LIMIT 1
             ) lm ON true
             WHERE cp.user_id = $1
             ORDER BY COALESCE(lm.sent_at, c.created_at) DESC, c.created_at DESC`;
  const res = await db.query(q, [userId]);
  return res.rows;
}

module.exports = { createChat, getChatById, listChatsForUser };
