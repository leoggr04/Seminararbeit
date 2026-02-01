const ActivityPost = require('../models/activityPostModel');
const ActivityType = require('../models/activityTypeModel');
const Participants = require('../models/participantsModel');

async function createType(name, icon_url) {
  return ActivityType.createActivityType(name, icon_url);
}

async function listTypes() {
  return ActivityType.getAllActivityTypes();
}

async function createPost(data) {
  return ActivityPost.createActivityPost(data);
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
  return added;
}

async function leavePost(postId, userId) {
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  const removed = await Participants.removeParticipant(postId, userId);
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
  listParticipants,
};
