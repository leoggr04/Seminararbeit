const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// GET /api/users
router.get('/', authenticate, userController.listUsers);

// GET /api/users/by-email?email=<email>
router.get('/by-email', authenticate, userController.getUserByEmail);

// GET /api/users/:id
router.get('/:id', authenticate, userController.getUser);

// DELETE /api/users/:id
router.delete('/:id', authenticate, userController.deleteUser);

// POST /api/users/request-reset
router.post('/request-reset', userController.requestPasswordReset);

// POST /api/users/reset
router.post('/reset', userController.resetPassword);

module.exports = router;
