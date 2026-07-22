const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security and Performance Middlewares
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(compression());

// CORS - allow frontend dev server and Docker frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://frontend:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl) 
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

app.use(express.json());

// Serve evaluation artifacts written by the worker (/app/artifacts in Docker).
app.use('/artifacts', express.static(path.resolve(__dirname, '..', 'artifacts')));

const submissionRoutes = require('./src/routes/submissionRoutes');
const submissionController = require('./src/controllers/submissionController');
const adminRoutes = require('./src/routes/adminRoutes');
const trainerRoutes = require('./src/routes/trainerRoutes');
const questionRoutes = require('./src/routes/questionRoutes');

// Routes will be mounted here
app.use('/api/submissions', submissionRoutes);
// Convenience alias to match spec examples (same handler, protected by submission/run ownership checks).
app.get('/submissions/:id/artifacts/:filename', submissionController.getSubmissionArtifact);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/questions', questionRoutes);

// User management endpoints
app.get('/api/users/:id', async (req, res) => {
  try {
    const { User } = require('./src/models');
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users - Create or upsert a user (used by frontend on first load)
app.post('/api/users', async (req, res) => {
  try {
    const { User } = require('./src/models');
    const { id, name, role } = req.body;
    
    if (!id) return res.status(400).json({ error: 'id is required' });
    
    const [user, created] = await User.findOrCreate({
      where: { id: String(id) },
      defaults: {
        name: name || `Student ${id}`,
        role: role || 'student',
        current_streak: 0,
        highest_streak: 0,
        last_activity_date: null,
      }
    });
    
    res.status(created ? 201 : 200).json(user);
  } catch (e) {
    console.error('Create user error:', e);
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// GET /api/users - List all users (for admin)
app.get('/api/users', async (req, res) => {
  try {
    const { User } = require('./src/models');
    const users = await User.findAll({ order: [['created_at', 'ASC']] });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Assessment Engine API is running' });
});

module.exports = app;
