const DashboardService = require('../services/dashboardService');

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