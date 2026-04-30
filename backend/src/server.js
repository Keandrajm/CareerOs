require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize DB (runs schema migrations on first load)
require('./db');

const jobsRouter = require('./routes/jobs');
const packetsRouter = require('./routes/packets');
const approvalsRouter = require('./routes/approvals');
const logsRouter = require('./routes/logs');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.DASHBOARD_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CareerOS API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ai_provider: process.env.AI_PROVIDER || 'not set',
    discord: !!process.env.DISCORD_WEBHOOK_URL
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/jobs', jobsRouter);
app.use('/api/packets', packetsRouter);
app.use('/api/jobs', approvalsRouter);   // approval actions on /api/jobs/:id/*
app.use('/api/logs', logsRouter);

// ── Scheduler trigger ─────────────────────────────────────────────────────────
app.post('/api/scheduler/trigger', async (req, res) => {
  try {
    scheduler.runNow();
    res.json({ status: 'triggered', message: 'Manual scan started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[CareerOS] API running on http://localhost:${PORT}`);
  console.log(`[CareerOS] AI provider: ${process.env.AI_PROVIDER || 'openai'}`);
  scheduler.init();
});

module.exports = app;
