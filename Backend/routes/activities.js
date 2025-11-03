const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');

// Activity types (admin or open endpoints)
router.post('/types', authenticate, ActivityController.createType);
router.get('/types', ActivityController.listTypes);

// Activity posts
router.post('/posts', authenticate, ActivityController.createPost);
router.get('/posts', ActivityController.listPosts);
router.get('/posts/:id', ActivityController.getPost);
router.put('/posts/:id', authenticate, ActivityController.updatePost);
router.delete('/posts/:id', authenticate, ActivityController.deletePost);

// posts by user
router.get('/user/:userId', ActivityController.listPostsByUser);

module.exports = router;
