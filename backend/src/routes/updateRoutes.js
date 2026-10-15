const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getCollection } = require('../db/mongoClient');

function getPrimaryLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function resolveInstallerPath() {
  const candidates = [
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.8.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.7.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.6.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.5.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.4.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.3.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.2.exe',
    'c:\\Users\\USER\\Documents\\Civet Applications\\dashboards\\desktop\\dist\\Civet MIS Setup 1.0.1.exe',
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.8.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.7.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.6.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.5.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.4.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.3.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.2.exe'),
    path.resolve(__dirname, '../../../desktop/dist/Civet MIS Setup 1.0.1.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.8.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.7.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.6.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.5.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.4.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.3.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.2.exe'),
    path.resolve(process.cwd(), 'desktop/dist/Civet MIS Setup 1.0.1.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.8.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.7.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.6.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.5.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.4.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.3.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.2.exe'),
    path.resolve(process.cwd(), '../desktop/dist/Civet MIS Setup 1.0.1.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.8.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.7.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.6.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.5.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.4.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.3.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.2.exe'),
    path.resolve(process.resourcesPath || '', 'Civet MIS Setup 1.0.1.exe')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const distDir = path.resolve(__dirname, '../../../desktop/dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    const exe = files.find(f => f.endsWith('.exe') && !f.includes('blockmap'));
    if (exe) {
      return path.join(distDir, exe);
    }
  }

  return null;
}

router.get('/check', async (req, res) => {
  try {
    const coll = getCollection('app_updates');
    const clientVersion = req.query.version || '1.0.0';
    let latest = await coll.findOne({}, { sort: { created_at: -1 } });

    if (!latest) {
      const hostIp = getPrimaryLocalIp();
      latest = {
        version: '1.0.1',
        release_date: new Date().toISOString().split('T')[0],
        title: 'Civet MIS 1.0.1 - Master Data & System Update',
        changelog: [
          'Master Data: Auto-generated serial code series starting from 0001 (e.g. VND-0001)',
          'Master Data: Duplicate name prevention across all registers',
          'Master Data: Removed Status column from all tables',
          'Database: Cleared all dummy and test records from cloud database',
          'Security: Configured admin mis@civetprojects.com credentials',
          'Desktop Engine: Self-contained standalone support for all workstations'
        ],
        download_url: `http://${hostIp}:5000/api/updates/download`,
        cloud_download_url: '',
        file_name: 'Civet MIS Setup 1.0.1.exe',
        file_size_mb: 116.5,
        is_critical: true,
        created_at: new Date()
      };
      await coll.insertOne(latest);
    }

    const hasUpdate = clientVersion !== latest.version;

    res.json({
      hasUpdate,
      currentVersion: clientVersion,
      latestVersion: latest.version,
      releaseDate: latest.release_date,
      title: latest.title,
      changelog: latest.changelog || [],
      downloadUrl: latest.download_url,
      cloudDownloadUrl: latest.cloud_download_url || '',
      fileName: latest.file_name,
      fileSizeMb: latest.file_size_mb,
      isCritical: !!latest.is_critical,
      hostIp: getPrimaryLocalIp()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const coll = getCollection('app_updates');
    const latest = await coll.findOne({}, { sort: { created_at: -1 } });
    if (!latest) {
      return res.status(404).json({ error: 'No update information registered.' });
    }
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download', (req, res) => {
  const filePath = resolveInstallerPath();
  if (!filePath) {
    return res.status(404).json({
      error: 'Installer file not found on server host.',
      instruction: 'Please copy Civet MIS Setup 1.0.0.exe from desktop/dist or use cloud download link.'
    });
  }

  const fileName = path.basename(filePath);
  res.download(filePath, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed downloading installer file' });
    }
  });
});

router.post('/check-in', async (req, res) => {
  try {
    const coll = getCollection('installed_devices');
    const { deviceId, hostname, platform, version, userEmail } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const doc = {
      device_id: deviceId,
      hostname: hostname || 'Unknown Host',
      platform: platform || 'Desktop',
      version: version || '1.0.0',
      user_email: userEmail || 'Not Authenticated',
      ip: req.ip || req.socket.remoteAddress,
      last_seen: new Date()
    };

    await coll.updateOne(
      { device_id: deviceId },
      { $set: doc },
      { upsert: true }
    );

    res.json({ success: true, timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/devices', async (req, res) => {
  try {
    const coll = getCollection('installed_devices');
    const devices = await coll.find({}).sort({ last_seen: -1 }).toArray();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const coll = getCollection('app_updates');
    const { version, title, changelog, downloadUrl, cloudDownloadUrl, isCritical, fileSizeMb } = req.body;

    if (!version || !title) {
      return res.status(400).json({ error: 'Version and title are required' });
    }

    const hostIp = getPrimaryLocalIp();
    const doc = {
      version,
      release_date: new Date().toISOString().split('T')[0],
      title,
      changelog: Array.isArray(changelog) ? changelog : [changelog],
      download_url: downloadUrl || `http://${hostIp}:5000/api/updates/download`,
      cloud_download_url: cloudDownloadUrl || '',
      file_name: 'Civet MIS Setup 1.0.0.exe',
      file_size_mb: fileSizeMb || 116.5,
      is_critical: Boolean(isCritical),
      created_at: new Date()
    };

    await coll.insertOne(doc);
    res.json({ success: true, update: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
