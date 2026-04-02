const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const ChatParticipant = require('../models/chatParticipantModel');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

let wss = null;
const chatListClients = new Set();
const chatRoomClients = new Map(); // chatId -> Set<WebSocket>

async function authenticateToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.getUserById(payload.sub);
    return user || null;
  } catch (err) {
    return null;
  }
}

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function removeClientFromRoom(chatId, ws) {
  const room = chatRoomClients.get(String(chatId));
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) chatRoomClients.delete(String(chatId));
}

function registerSocket(ws, { type, chatId = null, userId = null }) {
  ws._wsMeta = { type, chatId, userId };

  if (type === 'chats') {
    chatListClients.add(ws);
  } else if (type === 'chat' && chatId != null) {
    const key = String(chatId);
    if (!chatRoomClients.has(key)) chatRoomClients.set(key, new Set());
    chatRoomClients.get(key).add(ws);
  }

  ws.on('close', () => {
    if (type === 'chats') {
      chatListClients.delete(ws);
    } else if (type === 'chat' && chatId != null) {
      removeClientFromRoom(chatId, ws);
    }
  });
}

async function handleUpgrade(req, socket, head) {
  if (!wss) {
    socket.destroy();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const user = await authenticateToken(token);
  if (!user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const path = url.pathname;

  if (path === '/api/ws/chats') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
      registerSocket(ws, { type: 'chats', userId: user.user_id });
      safeSend(ws, { type: 'connected', scope: 'chats' });
    });
    return;
  }

  const chatMatch = path.match(/^\/api\/ws\/chats\/(\d+)$/);
  if (chatMatch) {
    const chatId = parseInt(chatMatch[1], 10);
    if (Number.isNaN(chatId)) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const isParticipant = await ChatParticipant.isParticipant(chatId, user.user_id);
    if (!isParticipant) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
      registerSocket(ws, { type: 'chat', chatId, userId: user.user_id });
      safeSend(ws, { type: 'connected', scope: 'chat', chatId });
    });
    return;
  }

  socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
  socket.destroy();
}

function initWebSocket(server) {
  wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    handleUpgrade(req, socket, head).catch((err) => {
      console.error('[WS] upgrade error:', err);
      socket.destroy();
    });
  });

  return wss;
}

function broadcastChatsUpdate(payload = {}) {
  const message = { type: 'chats_updated', ...payload };
  for (const ws of chatListClients) {
    safeSend(ws, message);
  }
}

function broadcastChatUpdate(chatId, payload = {}) {
  const message = { type: 'chat_updated', chatId, ...payload };
  const room = chatRoomClients.get(String(chatId));
  if (room) {
    for (const ws of room) {
      safeSend(ws, message);
    }
  }
  broadcastChatsUpdate({ chatId, ...payload });
}

module.exports = {
  initWebSocket,
  broadcastChatsUpdate,
  broadcastChatUpdate,
};
