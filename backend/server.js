const app = require('./app');
const { sequelize } = require('./src/models');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;

// Database Sync and Server Startup
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    try {
      const [rows] = await sequelize.query('SELECT DISTINCT student_id FROM submissions');
      if (Array.isArray(rows) && rows.length > 0) {
        for (const r of rows) {
          const sid = r?.student_id == null ? null : String(r.student_id);
          if (!sid) continue;
          await sequelize.query(
            'INSERT INTO users (id, name, role, current_streak, highest_streak, last_activity_date, created_at, updated_at) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) ' +
            'ON CONFLICT (id) DO NOTHING',
            { bind: [sid, `Student ${sid}`, 'student', 0, 0, null] }
          );
        }
      }
    } catch (_) {}

    try {
      const [rows] = await sequelize.query(`
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'evaluation_runs' AND c.contype = 'u'
      `);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const name = String(r?.conname || '');
          if (name && name.toLowerCase().includes('submission')) {
            await sequelize.query(`ALTER TABLE evaluation_runs DROP CONSTRAINT IF EXISTS "${name}"`);
          }
        }
      }
    } catch (_) {}
    
    await sequelize.sync({ alter: true });
    console.log('Database synced.');
  } catch (error) {
    console.warn('[server] DB connection skipped (PostgreSQL not running locally):', error.message);
    console.warn('[server] Running in memory/mock fallback mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Assessment Engine API running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}
