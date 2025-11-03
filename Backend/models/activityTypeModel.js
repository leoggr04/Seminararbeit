const db = require('../db');

async function createActivityType(name, icon_url) {
  const q = 'INSERT INTO activity_types (name, icon_url) VALUES ($1, $2) RETURNING activity_type_id, name, icon_url';
  const res = await db.query(q, [name, icon_url]);
  return res.rows[0];
}

async function getAllActivityTypes() {
  const res = await db.query('SELECT activity_type_id, name, icon_url FROM activity_types ORDER BY name');
  return res.rows;
}

async function getActivityTypeById(id) {
  const res = await db.query('SELECT activity_type_id, name, icon_url FROM activity_types WHERE activity_type_id = $1', [id]);
  return res.rows[0] || null;
}

module.exports = { createActivityType, getAllActivityTypes, getActivityTypeById };
