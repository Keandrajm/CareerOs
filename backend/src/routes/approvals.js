const express = require('express');
const router = express.Router();
const db = require('../db');
const { logEvent } = require('./logs');

function updateJobStatus(jobId, status, action, notes = null) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, jobId);
  db.prepare(`INSERT INTO user_approvals (job_id, action, notes) VALUES (?, ?, ?)`).run(jobId, action, notes);
  logEvent('approval', `Job #${jobId} marked as ${action}`, { jobId, action, status });
}

// POST /api/jobs/:id/approve
router.post('/:id/approve', (req, res) => {
  try {
    const { notes } = req.body;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    updateJobStatus(job.id, 'approved', 'approved', notes);
    res.json({ message: 'Job approved', jobId: job.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/reject
router.post('/:id/reject', (req, res) => {
  try {
    const { notes } = req.body;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    updateJobStatus(job.id, 'rejected', 'rejected', notes);
    res.json({ message: 'Job rejected', jobId: job.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/save
router.post('/:id/save', (req, res) => {
  try {
    const { notes } = req.body;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    updateJobStatus(job.id, 'saved', 'saved_for_later', notes);
    res.json({ message: 'Job saved for later', jobId: job.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/self-applied
router.post('/:id/self-applied', (req, res) => {
  try {
    const { notes, applied_date } = req.body;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    updateJobStatus(job.id, 'self_applied', 'self_applied', notes);

    // Record in application_status
    const appliedDate = applied_date || new Date().toISOString().split('T')[0];
    const d7  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];
    const d14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO application_status (job_id, status, notes, applied_date, follow_up_7_day, follow_up_14_day)
      VALUES (?, 'self_applied', ?, ?, ?, ?)
    `).run(job.id, notes, appliedDate, d7, d14);

    res.json({ message: 'Job marked as self-applied', jobId: job.id, follow_up_7_day: d7, follow_up_14_day: d14 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
