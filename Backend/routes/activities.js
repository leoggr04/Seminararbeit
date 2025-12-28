const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');

// Activity types (admin or open endpoints)
router.post('/types', authenticate, ActivityController.createType);
router.get('/types', ActivityController.listTypes);

// Activity posts
router.post('/posts', authenticate, ActivityController.createPost);
router.get('/posts', authenticate, ActivityController.listPosts);
router.get('/posts/:id', authenticate, ActivityController.getPost);
router.put('/posts/:id', authenticate, ActivityController.updatePost);
router.delete('/posts/:id', authenticate, ActivityController.deletePost);

// posts by user
router.get('/user/:userId', authenticate, ActivityController.listPostsByUser);
router.get('/self', authenticate, ActivityController.listPostsBySelf);
// participants endpoints
router.get('/posts/:id/participants', authenticate, ActivityController.listParticipants);
router.post('/posts/:id/join', authenticate, ActivityController.joinPost);
router.post('/posts/:id/leave', authenticate, ActivityController.leavePost);

module.exports = router;
