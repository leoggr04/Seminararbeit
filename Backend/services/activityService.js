const ActivityPost = require('../models/activityPostModel');
const ActivityType = require('../models/activityTypeModel');
const Participants = require('../models/participantsModel');
const ChatService = require('./chatService');

async function createType(name, icon_url) {
  return ActivityType.createActivityType(name, icon_url);
}

async function listTypes() {
  return ActivityType.getAllActivityTypes();
}

async function createPost(data) {
  console.log('[Activity] Creating activity post with data:', data);
  const post = await ActivityPost.createActivityPost(data);
  console.log('[Activity] Post created:', post);

  if (!post || !post.post_id) {
    throw new Error('post_create_failed');
  }

  const chatName = `Activity: ${(data.description || '').trim() || 'Activity'} (${post.post_id})`;
  console.log('[Activity] Creating chat with name:', chatName, 'for user:', data.user_id);
  const chat = await ChatService.createChat(data.user_id, [data.user_id], chatName);

  if (!chat || !chat.chat_id) {
    throw new Error('chat_create_failed');
  }

  console.log('[Activity] Chat created successfully:', chat);
  return { ...post, chat_id: chat.chat_id };
}

async function getPost(id) {
  return ActivityPost.getActivityPostById(id);
}

async function listPosts(opts) {
  return ActivityPost.listActivityPosts(opts);
}

async function updatePost(postId, userId, fields) {
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  if (post.user_id !== userId) throw new Error('forbidden');
  return ActivityPost.updateActivityPost(postId, fields);
}

async function deletePost(postId, userId) {
  const post = await ActivityPost.getActivityPostById(postId)
  if (!post) throw new Error('not_found');
  if (post.user_id !== userId) throw new Error('forbidden');
  return ActivityPost.deleteActivityPost(postId);
}

async function joinPost(postId, userId) {
  // ensure post exists
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  if (post.user_id === userId) throw new Error('owner_cannot_join');
  const added = await Participants.addParticipant(postId, userId);
  
  // Also add to associated chat
  try {
    // Chat name format: "Activity: {description} ({postId})"
    const chats = await ChatService.listChatsForUser(post.user_id);
    const activityChat = chats.find((c) => c.chat_name && c.chat_name.includes(`(${postId})`) && c.chat_name.startsWith('Activity:'));
    if (activityChat) {
      await ChatService.addParticipant(activityChat.chat_id, post.user_id, userId);
    }
  } catch (err) {
    console.error('Error adding user to activity chat:', err);
  }
  
  return added;
}

async function leavePost(postId, userId) {
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  const removed = await Participants.removeParticipant(postId, userId);
  
  // Also remove from associated chat
  try {
    const chats = await ChatService.listChatsForUser(post.user_id);
    const activityChat = chats.find((c) => c.chat_name && c.chat_name.includes(`(${postId})`) && c.chat_name.startsWith('Activity:'));
    if (activityChat) {
      await ChatService.removeParticipant(activityChat.chat_id, userId, userId);
    }
  } catch (err) {
    console.error('Error removing user from activity chat:', err);
  }
  
  return removed;
}

async function removeParticipant(postId, actorUserId, participantUserId) {
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  if (post.user_id !== actorUserId) throw new Error('forbidden');
  if (post.user_id === participantUserId) throw new Error('cannot_remove_owner');

  const isParticipant = await Participants.isParticipant(postId, participantUserId);
  if (!isParticipant) throw new Error('participant_not_found');

  const removed = await Participants.removeParticipant(postId, participantUserId);
  
  // Also remove from associated chat
  try {
    const chats = await ChatService.listChatsForUser(post.user_id);
    const activityChat = chats.find((c) => c.chat_name && c.chat_name.includes(`(${postId})`) && c.chat_name.startsWith('Activity:'));
    if (activityChat) {
      await ChatService.removeParticipant(activityChat.chat_id, actorUserId, participantUserId);
    }
  } catch (err) {
    console.error('Error removing user from activity chat:', err);
  }
  
  return removed;
}

async function listParticipants(postId) {
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  return Participants.listParticipants(postId);
}

async function listPostsByUser(userId) {
  return ActivityPost.getActivityPostsByUser(userId);
}

async function listPostsBySelf(userId) {
  return ActivityPost.getActivityPostsByUserOrJoined(userId);
}

module.exports = {
  createType,
  listTypes,
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  listPostsByUser,
  listPostsBySelf,
  joinPost,
  leavePost,
  removeParticipant,
  listParticipants,
};
