const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const User = require('../models/userModel');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function requestPasswordReset(email) {
  const user = await User.getUserByEmail(email);
  if (!user) return null; // don't reveal existence

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Save token to DB
  await User.setResetToken(user.user_id, token, expiresAt);

  // In production: send token via email. For demo return token.
  return { userId: user.user_id, token, expiresAt };
}

async function resetPassword(token, newPassword) {
  // validate token and get user
  const user = await User.getUserByResetToken(token);
  if (!user) return { success: false, reason: 'invalid_or_expired' };

  // Basic password policy (example)
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return { success: false, reason: 'policy' };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Use transaction to update password and clear token
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await User.updatePassword(user.user_id, hash, client);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { requestPasswordReset, resetPassword };
