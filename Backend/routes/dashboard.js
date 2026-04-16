const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, DashboardController.getSummary);
router.get('/events', authenticate, DashboardController.listEvents);

module.exports = router;