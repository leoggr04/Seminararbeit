const db = require('../db');

function buildFilters(userId, { eventType = null, from = null, to = null } = {}) {
  const clauses = ['user_id = $1'];
  const params = [userId];

  if (eventType) {
    params.push(eventType);
    clauses.push(`event_type = $${params.length}`);
  }

  if (from) {
    params.push(from);
    clauses.push(`created_at >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    clauses.push(`created_at <= $${params.length}`);
  }

  return { clauses, params };
}

async function createEvent({ userId, eventType, entityType = null, entityId = null, metadata = {}, createdAt = new Date() }) {
  const q = `
    INSERT INTO dashboard_events (user_id, event_type, entity_type, entity_id, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING event_id, user_id, event_type, entity_type, entity_id, metadata, created_at
  `;
  const res = await db.query(q, [userId, eventType, entityType, entityId, metadata, createdAt]);
  return res.rows[0];
}

async function listEvents(userId, { eventType = null, from = null, to = null, limit = 50, offset = 0 } = {}) {
  const { clauses, params } = buildFilters(userId, { eventType, from, to });
  params.push(limit, offset);
  const q = `
    SELECT event_id, user_id, event_type, entity_type, entity_id, metadata, created_at
    FROM dashboard_events
    WHERE ${clauses.join(' AND ')}
    ORDER BY created_at DESC, event_id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const res = await db.query(q, params);
  return res.rows;
}

async function countEvents(userId, { eventType = null, from = null, to = null } = {}) {
  const { clauses, params } = buildFilters(userId, { eventType, from, to });
  const q = `
    SELECT event_type, COUNT(*)::int AS count
    FROM dashboard_events
    WHERE ${clauses.join(' AND ')}
    GROUP BY event_type
  `;
  const res = await db.query(q, params);
  return res.rows;
}

module.exports = {
  createEvent,
  listEvents,
  countEvents,
};