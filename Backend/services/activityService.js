const ActivityPost = require('../models/activityPostModel');
const ActivityType = require('../models/activityTypeModel');

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
  // Ensure only owner can update
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  if (post.user_id !== userId) throw new Error('forbidden');
  return ActivityPost.updateActivityPost(postId, fields);
}

async function deletePost(postId, userId) {
  const post = await ActivityPost.getActivityPostById(postId);
  if (!post) throw new Error('not_found');
  if (post.user_id !== userId) throw new Error('forbidden');
  return ActivityPost.deleteActivityPost(postId);
}

async function listPostsByUser(userId) {
  return ActivityPost.getActivityPostsByUser(userId);
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
};
