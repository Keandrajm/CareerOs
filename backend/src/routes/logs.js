const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Utility: log an event (used by other modules) ─────────────────────────────
function logEvent(eventType, message, details = {}) {
  try {
    db.prepare(`
      INSERT INTO bot_logs (event_type, message, details_json)
      VALUES (?, ?, ?)
    `).run(eventType, message, JSON.stringify(details));
  } catch (err) {
    console.error('[logEvent] Failed to write log:', err.message);
  }
}

// ── GET /api/logs ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { event_type, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM bot_logs WHERE 1=1';
    const params = [];

    if (event_type) { query += ' AND event_type = ?'; params.push(event_type); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM bot_logs').get().count;

    res.json({ total, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.logEvent = logEvent;
