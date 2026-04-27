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

async function tableExists(client, tableName) {
  const res = await client.query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
  return Boolean(res.rows[0] && res.rows[0].reg);
}

async function deleteUserCascade(userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userExists = await tableExists(client, 'users');
    if (!userExists) {
      throw new Error('users_table_missing');
    }

    const userRes = await client.query('SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
    if (userRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const deleted = {
      user_id: userId,
      user_refresh_tokens: 0,
      dashboard_events: 0,
      notifications: 0,
      messages: 0,
      activity_participants: 0,
      activity_posts: 0,
      chat_participants: 0,
      chats: 0,
      users: 0,
    };

    if (await tableExists(client, 'user_refresh_tokens')) {
      const res = await client.query('DELETE FROM user_refresh_tokens WHERE user_id = $1', [userId]);
      deleted.user_refresh_tokens = res.rowCount;
    }

    if (await tableExists(client, 'dashboard_events')) {
      const res = await client.query('DELETE FROM dashboard_events WHERE user_id = $1', [userId]);
      deleted.dashboard_events = res.rowCount;
    }

    if (await tableExists(client, 'notifications')) {
      const res = await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      deleted.notifications = res.rowCount;
    }

    if (await tableExists(client, 'messages')) {
      const res = await client.query('DELETE FROM messages WHERE sender_id = $1', [userId]);
      deleted.messages = res.rowCount;
    }

    const activityPostsExist = await tableExists(client, 'activity_posts');
    const activityParticipantsExist = await tableExists(client, 'activity_participants');

    if (activityPostsExist && activityParticipantsExist) {
      const ownPostsRes = await client.query('SELECT post_id FROM activity_posts WHERE user_id = $1', [userId]);
      const ownPostIds = ownPostsRes.rows.map((r) => r.post_id);
      if (ownPostIds.length > 0) {
        const participantsRes = await client.query('DELETE FROM activity_participants WHERE post_id = ANY($1::int[])', [ownPostIds]);
        deleted.activity_participants += participantsRes.rowCount;
      }
    }

    if (activityParticipantsExist) {
      const res = await client.query('DELETE FROM activity_participants WHERE user_id = $1', [userId]);
      deleted.activity_participants += res.rowCount;
    }

    if (activityPostsExist) {
      const res = await client.query('DELETE FROM activity_posts WHERE user_id = $1', [userId]);
      deleted.activity_posts = res.rowCount;
    }

    const chatParticipantsExist = await tableExists(client, 'chat_participants');
    const chatsExist = await tableExists(client, 'chats');

    if (chatParticipantsExist) {
      const chatIdsRes = await client.query('SELECT chat_id FROM chat_participants WHERE user_id = $1', [userId]);
      const chatIds = chatIdsRes.rows.map((r) => r.chat_id);

      const res = await client.query('DELETE FROM chat_participants WHERE user_id = $1', [userId]);
      deleted.chat_participants = res.rowCount;

      if (chatsExist && chatIds.length > 0) {
        const cleanupRes = await client.query(
          `DELETE FROM chats c
           WHERE c.chat_id = ANY($1::int[])
             AND NOT EXISTS (
               SELECT 1
               FROM chat_participants cp
               WHERE cp.chat_id = c.chat_id
             )`,
          [chatIds]
        );
        deleted.chats = cleanupRes.rowCount;
      }
    }

    const userDeleteRes = await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    deleted.users = userDeleteRes.rowCount;

    await client.query('COMMIT');
    return deleted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { requestPasswordReset, resetPassword, deleteUserCascade };
