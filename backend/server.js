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
function resolveFrontendDist() {
  if (process.env.FRONTEND_DIST && require('fs').existsSync(process.env.FRONTEND_DIST)) {
    return process.env.FRONTEND_DIST;
  }
  const candidates = [
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, 'frontend/dist'),
    path.join(__dirname, '../dist'),
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'frontend/dist'),
    path.join(process.cwd(), 'dist')
  ];
  for (const c of candidates) {
    if (require('fs').existsSync(c)) {
      return c;
    }
  }
  return path.join(__dirname, '../frontend/dist');
}
const frontendDist = resolveFrontendDist();
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexFile = path.join(frontendDist, 'index.html');
  if (require('fs').existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  res.status(200).send('CIVET DASHBOARDS API Server is running. Frontend build not found at: ' + frontendDist);
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