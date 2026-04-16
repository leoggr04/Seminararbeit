const DashboardEvent = require('../models/dashboardEventModel');

const EVENT_TYPES = [
  'activity_created',
  'activity_joined',
  'activity_left',
  'activity_participant_removed',
  'chat_created',
  'chat_message_sent',
  'chat_participant_added',
  'chat_participant_removed',
  'chat_left',
];

function normalizeCounts(rows = []) {
  const counts = {};
  for (const type of EVENT_TYPES) counts[type] = 0;

  for (const row of rows) {
    if (!row?.event_type) continue;
    counts[row.event_type] = Number(row.count) || 0;
  }

  return counts;
}

async function recordEvent({ userId, eventType, entityType = null, entityId = null, metadata = {}, createdAt = new Date() }) {
  return DashboardEvent.createEvent({
    userId,
    eventType,
    entityType,
    entityId,
    metadata,
    createdAt,
  });
}

async function safeRecordEvent(payload) {
  try {
    return await recordEvent(payload);
  } catch (err) {
    console.error('[Dashboard] Failed to record event:', err);
    return null;
  }
}

async function getSummary(userId, { days = 30, limit = 20 } = {}) {
  const now = new Date();
  const from = new Date(now.getTime() - Number(days) * 24 * 60 * 60 * 1000);

  const [lifetimeRows, periodRows, recentEvents] = await Promise.all([
    DashboardEvent.countEvents(userId),
    DashboardEvent.countEvents(userId, { from }),
    DashboardEvent.listEvents(userId, { from, limit }),
  ]);

  return {
    period: {
      days: Number(days),
      from,
      to: now,
    },
    counts: {
      lifetime: normalizeCounts(lifetimeRows),
      period: normalizeCounts(periodRows),
    },
    recentEvents,
  };
}

async function listEvents(userId, options = {}) {
  return DashboardEvent.listEvents(userId, options);
}

module.exports = {
  EVENT_TYPES,
  recordEvent: safeRecordEvent,
  getSummary,
  listEvents,
};