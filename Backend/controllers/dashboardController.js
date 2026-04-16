const DashboardService = require('../services/dashboardService');

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags:
 *       - dashboard
 *     summary: Get dashboard summary for the authenticated user
 *     description: Returns lifetime and period-based counts for tracked user activity.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         required: false
 *         schema:
 *           type: integer
 *           example: 30
 *         description: Number of days to include in the period summary.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Maximum number of recent events to return.
 *     responses:
 *       200:
 *         description: Dashboard summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         days:
 *                           type: integer
 *                           example: 30
 *                         from:
 *                           type: string
 *                           format: date-time
 *                         to:
 *                           type: string
 *                           format: date-time
 *                     counts:
 *                       type: object
 *                       properties:
 *                         lifetime:
 *                           $ref: '#/components/schemas/DashboardEventCounts'
 *                         period:
 *                           $ref: '#/components/schemas/DashboardEventCounts'
 *                     recentEvents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DashboardEvent'
 *       500:
 *         description: Server error
 */
async function getSummary(req, res) {
  const userId = req.user.user_id;
  const days = Number(req.query.days || 30);

  try {
    const summary = await DashboardService.getSummary(userId, {
      days: Number.isFinite(days) && days > 0 ? days : 30,
      limit: Number(req.query.limit || 20),
    });
    return res.json({ data: summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/dashboard/events:
 *   get:
 *     tags:
 *       - dashboard
 *     summary: List dashboard events for the authenticated user
 *     description: Returns the raw analytics events stored for the current user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventType
 *         required: false
 *         schema:
 *           type: string
 *           example: chat_message_sent
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 50
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           example: 0
 *     responses:
 *       200:
 *         description: Dashboard events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DashboardEvent'
 *       500:
 *         description: Server error
 */
async function listEvents(req, res) {
  const userId = req.user.user_id;
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);

  try {
    const events = await DashboardService.listEvents(userId, {
      eventType: req.query.eventType || null,
      from: req.query.from || null,
      to: req.query.to || null,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    });
    return res.json({ data: events });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

module.exports = {
  getSummary,
  listEvents,
};