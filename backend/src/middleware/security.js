const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

function parseOrigins(value) {
  return (value || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function buildAllowedOrigins() {
  return [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.DASHBOARD_URL,
    ...parseOrigins(process.env.ALLOWED_ORIGINS)
  ].filter(Boolean);
}

function secureCompare(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false
  });
}

function corsMiddleware() {
  const allowedOrigins = buildAllowedOrigins();
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CareerOS-Key', 'X-Request-Id'],
    credentials: false,
    maxAge: 86400
  });
}

function apiLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  });
}

function mutationLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.MUTATION_RATE_LIMIT_MAX || 40),
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
    message: { error: 'Too many write requests. Please slow down.' }
  });
}

function requireAccessKey(req, res, next) {
  const configuredKey = process.env.CAREEROS_API_KEY;
  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[security] CAREEROS_API_KEY is not set; API is running without dashboard access-key protection.');
    }
    return next();
  }

  const suppliedKey = req.headers['x-careeros-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (secureCompare(suppliedKey, configuredKey)) return next();

  return res.status(401).json({
    error: 'Access key required',
    code: 'CAREEROS_AUTH_REQUIRED'
  });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found', requestId: req.id });
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const safeMessage = status >= 500 && isProduction ? 'Internal server error' : (err.message || 'Internal server error');
  console.error('[ERROR]', req.id, err.stack || err.message);
  res.status(status).json({ error: safeMessage, requestId: req.id });
}

module.exports = {
  requestId,
  securityHeaders,
  corsMiddleware,
  apiLimiter,
  mutationLimiter,
  requireAccessKey,
  notFound,
  errorHandler
};
