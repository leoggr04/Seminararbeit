const Chat = require('../models/chatModel');
const ChatParticipant = require('../models/chatParticipantModel');
const Message = require('../models/messageModel');
const Notification = require('../models/notificationModel');
const { broadcastChatsUpdate, broadcastChatUpdate } = require('./wsHub');

async function ensureParticipantOrThrow(chatId, userId) {
  const isPart = await ChatParticipant.isParticipant(chatId, userId);
  if (!isPart) throw new Error('forbidden');
}

async function createChat(participantIds = [], chatName = null) {
  const chat = await Chat.createChat(chatName);
  const chatId = chat.chat_id;
  for (const uid of participantIds) {
    await ChatParticipant.addParticipant(chatId, uid);
  }
  broadcastChatsUpdate({ action: 'chat_created', chatId, chatName });
  return chat;
}

async function addParticipant(chatId, requesterId, userId) {
  await ensureParticipantOrThrow(chatId, requesterId);
  const result = await ChatParticipant.addParticipant(chatId, userId);
  broadcastChatUpdate(chatId, { action: 'participant_added', userId });
  return result;
}

async function removeParticipant(chatId, requesterId, userId) {
  await ensureParticipantOrThrow(chatId, requesterId);
  const result = await ChatParticipant.removeParticipant(chatId, userId);
  broadcastChatUpdate(chatId, { action: 'participant_removed', userId });
  return result;
}

async function listParticipants(chatId, requesterId) {
  await ensureParticipantOrThrow(chatId, requesterId);
  return ChatParticipant.listParticipants(chatId);
}

async function listChatsForUser(userId) {
  return Chat.listChatsForUser(userId);
}

async function sendMessage(chatId, senderId, content) {
  await ensureParticipantOrThrow(chatId, senderId);
  const msg = await Message.createMessage({ chat_id: chatId, sender_id: senderId, content });
  // notify other participants
  const parts = await ChatParticipant.listParticipants(chatId);
  for (const p of parts) {
    if (p.user_id !== senderId) {
      // lightweight notification content
      const notifContent = { chat_id: chatId, message_id: msg.message_id, preview: content.slice(0, 200) };
      await Notification.createNotification(p.user_id, 'new_message', notifContent);
    }
  }
  broadcastChatUpdate(chatId, { action: 'message_created', message: msg });
  return msg;
}

async function listMessages(chatId, requesterId, opts = {}) {
  await ensureParticipantOrThrow(chatId, requesterId);
  return Message.getMessagesByChat(chatId, opts);
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
