const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_EXPIRES_DAYS || '14', 10);

function signAccessToken(user) {
  const payload = {
    sub: user.user_id,
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function generateRefreshTokenPlain() {
  return crypto.randomBytes(48).toString('hex');
}

async function saveRefreshToken(userId, tokenPlain) {
  const hash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 3600 * 1000);
  await db.query(
    'INSERT INTO user_refresh_tokens(user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
  return { expiresAt };
}

async function removeRefreshToken(tokenPlain) {
  const hash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
  await db.query('DELETE FROM user_refresh_tokens WHERE token_hash = $1', [hash]);
}

async function useRefreshToken(tokenPlain) {
  const hash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
  const res = await db.query('SELECT id, user_id FROM user_refresh_tokens WHERE token_hash = $1 AND expires_at > now()', [hash]);
  const row = res.rows[0];
  if (!row) throw new Error('invalid_refresh');

  // rotate: delete old token and create new
  await db.query('DELETE FROM user_refresh_tokens WHERE id = $1', [row.id]);
  const newPlain = generateRefreshTokenPlain();
  await saveRefreshToken(row.user_id, newPlain);
  const user = await User.getUserById(row.user_id);
  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken: newPlain };
}

async function loginUserByEmail(email, password) {
  const user = await User.getUserByEmail(email);
  if (!user) return null;
  const bcrypt = require('bcryptjs');
  const match = await bcrypt.compare(password, user.password_hash); // password ist hier plaintext und das zweite ein Hash
  if (!match) return null;

  const accessToken = signAccessToken(user);
  const refreshPlain = generateRefreshTokenPlain();
  await saveRefreshToken(user.user_id, refreshPlain);
  return { accessToken, refreshToken: refreshPlain, user };
}

async function registerUser(first_name, last_name, email, password) {
  if (!first_name || !last_name || !email || !password) throw new Error('invalid_input');
  const existing = await User.getUserByEmail(email);
  if (existing) throw new Error('email_taken');

  const bcrypt = require('bcryptjs');
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const hash = await bcrypt.hash(password, rounds);
  const newUser = await User.createUser(first_name, last_name, email, hash);
  return newUser;
}

module.exports = { loginUserByEmail, useRefreshToken, removeRefreshToken, signAccessToken, registerUser };
