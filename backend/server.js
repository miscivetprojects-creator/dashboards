const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./src/config');
const { connectDB } = require('./src/db/mongoClient');
const { initializeMasterData } = require('./src/models/schemas');
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const workspaceRoutes = require('./src/routes/workspaceRoutes');
const registerRoutes = require('./src/routes/registerRoutes');
const masterRoutes = require('./src/routes/masterRoutes');
const updateRoutes = require('./src/routes/updateRoutes');
const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'CIVET DASHBOARDS — Management MIS',
    timestamp: new Date().toISOString()
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/updates', updateRoutes);
const frontendDist = process.env.FRONTEND_DIST || (require('fs').existsSync(path.join(__dirname, '../frontend/dist')) 
  ? path.join(__dirname, '../frontend/dist') 
  : path.join(__dirname, 'frontend/dist'));
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('CIVET DASHBOARDS API Server is running. Frontend Vite dev server running on port 5173.');
    }
  });
});
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});
async function startServer(overridePort) {
  try {
    console.log('[CIVET MIS] Initializing database...');
    await connectDB();
    console.log('[CIVET MIS] Checking master schema and admin seed...');
    await initializeMasterData();
    const port = overridePort || config.PORT || 5000;
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        console.log(`=======================================================`);
        console.log(` CIVET DASHBOARDS — MANAGEMENT MIS SERVER RUNNING`);
        console.log(` URL: http://localhost:${port}`);
        console.log(` Default Admin: mis@civetprojects.com / Civet@111`);
        console.log(`=======================================================`);
        resolve(server);
      });
      server.on('error', reject);
    });
  } catch (err) {
    console.error('Failed to start Civet Dashboards server:', err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}
if (require.main === module) {
  startServer();
}
module.exports = { app, startServer };