const db = require('../db');

async function getAllUsers() {
  const res = await db.query('SELECT user_id, first_name, last_name, email FROM users ORDER BY user_id');
  return res.rows;
}

async function getUserById(id) {
  const res = await db.query('SELECT user_id, first_name, last_name, email FROM users WHERE user_id = $1', [id]);
  return res.rows[0] || null;
}

async function getUserByEmail(email) {
  const res = await db.query('SELECT user_id, first_name, last_name, email, password_hash, pw_reset_token, reset_token_timeout FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
}

async function getUserByResetToken(token) {
  const res = await db.query('SELECT user_id, first_name, last_name, email FROM users WHERE pw_reset_token = $1 AND reset_token_timeout > now()', [token]);
  return res.rows[0] || null;
}

async function setResetToken(userId, token, expiresAt, client) {
  const q = 'UPDATE users SET pw_reset_token = $1, reset_token_timeout = $2 WHERE user_id = $3';
  if (client) return client.query(q, [token, expiresAt, userId]);
  return db.query(q, [token, expiresAt, userId]);
}

async function updatePassword(id, hashedPassword, client) {
  const q = 'UPDATE users SET password_hash = $1, pw_reset_token = NULL, reset_token_timeout = NULL, updated_at = now() WHERE user_id = $2';
  if (client) return client.query(q, [hashedPassword, id]);
  return db.query(q, [hashedPassword, id]);
}

async function createUser(first_name, last_name, email, hashedPassword) {
  const q = `INSERT INTO users (first_name, last_name, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, now(), now()) RETURNING user_id, first_name, last_name, email`;
  const res = await db.query(q, [first_name, last_name, email, hashedPassword]);
  return res.rows[0];
}
module.exports = {
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByResetToken,
  setResetToken,
  updatePassword,
    createUser,
};
