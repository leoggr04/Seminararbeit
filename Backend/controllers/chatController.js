const ChatService = require('../services/chatService');

/**
 * @openapi
 * /api/chats:
 *   post:
 *     tags:
 *       - chat
 *     summary: Create a new chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chat_name:
 *                 type: string
 *                 example: "Friday Running Group"
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2,3]
 *     responses:
 *       201:
 *         description: Chat created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 */
async function createChat(req, res) {
  const { participantIds, chat_name } = req.body || {};
  try {
    const chat = await ChatService.createChat(participantIds || [], chat_name || null);
    return res.status(201).json(chat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/chats:
 *   get:
 *     tags:
 *       - chat
 *     summary: List chats for authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 */

async function addParticipant(req, res) {
  const chatId = parseInt(req.params.chatId, 10);
  const { userId } = req.body || {};
  if (Number.isNaN(chatId) || !userId) return res.status(400).json({ error: 'invalid input' });
  try {
    const p = await ChatService.addParticipant(chatId, userId);
    return res.status(201).json(p);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/chats/{chatId}/participants:
 *   post:
 *     tags:
 *       - chat
 *     summary: Add a participant to a chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Participant added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Participant'
 */

async function removeParticipant(req, res) {
  const chatId = parseInt(req.params.chatId, 10);
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(chatId) || Number.isNaN(userId)) return res.status(400).json({ error: 'invalid input' });
  try {
    const p = await ChatService.removeParticipant(chatId, userId);
    return res.json({ success: true, removed: p });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/chats/{chatId}/participants/{userId}:
 *   delete:
 *     tags:
 *       - chat
 *     summary: Remove a participant from a chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Participant removed
 */

async function listParticipants(req, res) {
  const chatId = parseInt(req.params.chatId, 10);
  if (Number.isNaN(chatId)) return res.status(400).json({ error: 'invalid input' });
  try {
    const list = await ChatService.listParticipants(chatId);
    return res.json({ data: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/chats/{chatId}/participants:
 *   get:
 *     tags:
 *       - chat
 *     summary: List participants of a chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Participants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Participant'
 */

async function listChatsForUser(req, res) {
  const userId = req.user.user_id;
  try {
    const chats = await ChatService.listChatsForUser(userId);
    return res.json({ data: chats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/chats/{chatId}/messages:
 *   post:
 *     tags:
 *       - chat
 *     summary: Send a message in a chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello everyone"
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       403:
 *         description: Not a participant
 */

async function sendMessage(req, res) {
  const chatId = parseInt(req.params.chatId, 10);
  const senderId = req.user.user_id;
  const { content } = req.body || {};
  if (Number.isNaN(chatId) || !content) return res.status(400).json({ error: 'invalid input' });
  try {
    const msg = await ChatService.sendMessage(chatId, senderId, content);
    return res.status(201).json(msg);
  } catch (err) {
    if (err.message === 'forbidden') return res.status(403).json({ error: 'not a participant' });
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/chats/{chatId}/messages:
 *   get:
 *     tags:
 *       - chat
 *     summary: List messages in a chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 */

async function listMessages(req, res) {
  const chatId = parseInt(req.params.chatId, 10);
  if (Number.isNaN(chatId)) return res.status(400).json({ error: 'invalid input' });
  try {
    const messages = await ChatService.listMessages(chatId);
    return res.json({ data: messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

module.exports = {
  createChat,
  addParticipant,
  removeParticipant,
  listParticipants,
  listChatsForUser,
  sendMessage,
  listMessages,
};
