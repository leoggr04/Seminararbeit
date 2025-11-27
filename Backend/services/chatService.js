const Chat = require('../models/chatModel');
const ChatParticipant = require('../models/chatParticipantModel');
const Message = require('../models/messageModel');
const Notification = require('../models/notificationModel');

async function createChat(participantIds = [], chatName = null) {
  const chat = await Chat.createChat(chatName);
  const chatId = chat.chat_id;
  for (const uid of participantIds) {
    await ChatParticipant.addParticipant(chatId, uid);
  }
  return chat;
}

async function addParticipant(chatId, userId) {
  return ChatParticipant.addParticipant(chatId, userId);
}

async function removeParticipant(chatId, userId) {
  return ChatParticipant.removeParticipant(chatId, userId);
}

async function listParticipants(chatId) {
  return ChatParticipant.listParticipants(chatId);
}

async function listChatsForUser(userId) {
  return Chat.listChatsForUser(userId);
}

async function sendMessage(chatId, senderId, content) {
  // ensure sender is participant
  const isPart = await ChatParticipant.isParticipant(chatId, senderId);
  if (!isPart) throw new Error('forbidden');
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
  return msg;
}

async function listMessages(chatId, opts = {}) {
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
