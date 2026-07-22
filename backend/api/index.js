/**
 * Vercel Serverless Entry Point for the Assessment Engine API.
 *
 * Unlike `server.js` (which calls startServer() on load and crashes if DB is
 * unreachable), this module exports the Express `app` directly so Vercel can
 * invoke individual request handlers without a persistent process.
 *
 * DB / Redis connectivity errors are caught per-request and returned as
 * structured JSON so the function never crashes at cold-start.
 */

const app = require('../app');
const { sequelize } = require('../src/models');
const dotenv = require('dotenv');

dotenv.config();

// Attempt a one-time DB sync on first cold start (non-blocking)
let dbReady = false;
let dbError = null;

const initDb = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false }); // safe read-only sync in prod
    dbReady = true;
    console.log('[vercel] DB connected and synced.');
  } catch (err) {
    dbError = err.message;
    console.error('[vercel] DB connection failed:', err.message);
  }
};

// Kick off DB init (don't await — Vercel handler will proceed)
const dbInitPromise = initDb();

// Middleware to attach DB status to every request
app.use((req, res, next) => {
  req.dbReady = dbReady;
  req.dbError = dbError;
  next();
});

// Health check that reports DB status
app.get('/health', (req, res) => {
  res.json({
    status: dbReady ? 'ok' : 'degraded',
    db: dbReady ? 'connected' : `disconnected: ${dbError}`,
    message: 'Assessment Engine API',
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
