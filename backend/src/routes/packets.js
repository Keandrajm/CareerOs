const express = require('express');
const router = express.Router();
const db = require('../db');

// ── GET /api/packets ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const packets = db.prepare(`
      SELECT ap.*, j.title, j.company, j.score, j.label, j.status,
             j.salary_text, j.remote_status, j.source_url
      FROM application_packets ap
      JOIN jobs j ON ap.job_id = j.id
      ORDER BY ap.created_at DESC
    `).all();

    const enriched = packets.map(p => {
      let parsed = null;
      try { parsed = JSON.parse(p.packet_json); } catch (_) {}
      return { ...p, packet: parsed };
    });

    res.json({ count: enriched.length, packets: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/packets/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const packet = db.prepare(`
      SELECT ap.*, j.title, j.company, j.score, j.label, j.status,
             j.salary_text, j.remote_status, j.source_url, j.description
      FROM application_packets ap
      JOIN jobs j ON ap.job_id = j.id
      WHERE ap.id = ?
    `).get(req.params.id);

    if (!packet) return res.status(404).json({ error: 'Packet not found' });

    let parsed = null;
    try { parsed = JSON.parse(packet.packet_json); } catch (_) {}

    const resume = db.prepare('SELECT * FROM resume_versions WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(packet.job_id);
    const cover  = db.prepare('SELECT * FROM cover_letters WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(packet.job_id);
    const score  = db.prepare('SELECT * FROM job_scores WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(packet.job_id);

    res.json({ ...packet, packet: parsed, resume, coverLetter: cover, scoreDetails: score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
