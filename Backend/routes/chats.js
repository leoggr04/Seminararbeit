const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// Create chat (with initial participants)
router.post('/', authenticate, ChatController.createChat);

// List chats for authenticated user
router.get('/', authenticate, ChatController.listChatsForUser);

// Participants
router.post('/:chatId/participants', authenticate, ChatController.addParticipant);
router.delete('/:chatId/participants/:userId', authenticate, ChatController.removeParticipant);
router.get('/:chatId/participants', authenticate, ChatController.listParticipants);

// Messages
router.get('/:chatId/messages', authenticate, ChatController.listMessages);
router.post('/:chatId/messages', authenticate, ChatController.sendMessage);

module.exports = router;
