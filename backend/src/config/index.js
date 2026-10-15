const path = require('path');
const os = require('os');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function resolveDataDirectory() {
  const isPackaged = __dirname.includes('app.asar');
  if (isPackaged) {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
    return path.join(appData, 'Civet MIS', 'data');
  }
  return path.resolve(__dirname, '../../data');
}

const dataDir = process.env.CIVET_DATA_DIR || resolveDataDirectory();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://civetprojects:MisCivet1234@civetproject.g5pcxry.mongodb.net/civet_dashboards?retryWrites=true&w=majority&appName=civetproject',
  SESSION_SECRET: process.env.SESSION_SECRET || 'civet_management_mis_secure_session_key_2026',
  SESSION_TIMEOUT_MINUTES: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '120', 10),
  DATA_DIR: dataDir,
  EXCEL_TEMPLATES_DIR: path.join(dataDir, 'templates'),
  UPLOADS_DIR: path.join(dataDir, 'uploads')
};
