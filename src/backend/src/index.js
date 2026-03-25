const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const { config } = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const { optionalAuth } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth');
const chapterRoutes = require('./routes/chapters');
const partnerRoutes = require('./routes/partners');
const investeeRoutes = require('./routes/investees');
const groupRoutes = require('./routes/groups');
const appointmentRoutes = require('./routes/appointments');
const recurringAppointmentRoutes = require('./routes/recurringAppointments');
const lookupRoutes = require('./routes/lookups');
const feedbackRoutes = require('./routes/feedback');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

// Background jobs
const { startMaterializeCron } = require('./jobs/materializeCron');

const app = express();

// --------------------------------------------------------------------------- Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use(optionalAuth);

// --------------------------------------------------------------------------- Swagger / OpenAPI
let swaggerDocument = {};
try {
  swaggerDocument = require('../swagger_output.json');
} catch (err) {
  console.warn('swagger_output.json not found. Run "npm run swagger" to generate it.');
}

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api/docs.json', (_req, res) => res.json(swaggerDocument));

// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/investees', investeeRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/recurring-appointments', recurringAppointmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', lookupRoutes);
app.use('/api/settings', settingsRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(config.port, () => {
  console.log(`SVP Analytics API running on port ${config.port}`);
  console.log(`Swagger docs: http://localhost:${config.port}/api/docs`);
  console.log(`Environment: ${config.nodeEnv}`);

  // Start background jobs
  startMaterializeCron();
});

module.exports = app;
