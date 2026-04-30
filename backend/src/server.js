require('dotenv').config();
const express = require('express');

require('./db');

const jobsRouter = require('./routes/jobs');
const packetsRouter = require('./routes/packets');
const approvalsRouter = require('./routes/approvals');
const logsRouter = require('./routes/logs');
const scheduler = require('./scheduler');
const {
  requestId,
  securityHeaders,
  corsMiddleware,
  apiLimiter,
  mutationLimiter,
  requireAccessKey,
  notFound,
  errorHandler
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(securityHeaders());
app.use(corsMiddleware());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CareerOS API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiLimiter(), mutationLimiter(), requireAccessKey);
app.use('/api/jobs', jobsRouter);
app.use('/api/packets', packetsRouter);
app.use('/api/jobs', approvalsRouter);
app.use('/api/logs', logsRouter);

app.post('/api/scheduler/trigger', async (req, res) => {
  try {
    scheduler.runScan();
    res.json({ status: 'triggered', message: 'Manual scan started' });
  } catch (err) {
    res.status(500).json({ error: err.message, requestId: req.id });
  }
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[CareerOS] API running on port ${PORT}`);
  console.log(`[CareerOS] Access key protection: ${process.env.CAREEROS_API_KEY ? 'enabled' : 'not configured'}`);
  scheduler.init();
});

module.exports = app;
