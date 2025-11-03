const authService = require('../services/authService');

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password]
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 *       409:
 *         description: Email already in use
 */

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const result = await authService.loginUserByEmail(email, password);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken, user: { user_id: result.user.user_id, name: result.user.name, email: result.user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - auth
 *     summary: Login and receive access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Invalid credentials
 */

async function register(req, res) {
  try {
    const { first_name, last_name, email, password } = req.body;
    if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'first Name, last Name,email,password required' });
    const created = await authService.registerUser(first_name, last_name, email, password);  // hieer ein Fehler!!
    return res.status(201).json({ success: true, user: created });
  } catch (err) {
    if (err.message === 'email_taken') return res.status(409).json({ error: 'email already in use' });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const result = await authService.useRefreshToken(refreshToken);
    return res.json(result);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - auth
 *     summary: Exchange a refresh token for a new access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Invalid refresh token
 */


async function logout(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    await authService.removeRefreshToken(refreshToken);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { login, refresh, logout, register };
