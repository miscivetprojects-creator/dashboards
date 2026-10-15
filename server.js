const path = require('path');
const { app, startServer } = require('./backend/server');

const PORT = parseInt(process.env.PORT || '5000', 10);

if (require.main === module) {
  startServer(PORT).catch((err) => {
    console.error('Failed to start Civet Dashboards server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
