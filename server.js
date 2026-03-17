const express = require('express');
const cors = require('cors');
const { NodeSSH } = require('node-ssh');
const config = require('./config');
const monitoring = require('./lib/monitoring');
const backup = require('./lib/backup');
const mail = require('./lib/mail');
const db = require('./lib/db');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Raise global EventEmitter listener limit to prevent MaxListenersExceededWarning
// from SSH2's internal Client when multiple concurrent SSH connections are active
EventEmitter.defaultMaxListeners = 20;


const app = express();

// Middleware
app.use(express.json());
if (config.api.enableCors) {
  app.use(cors());
}

// API Key authentication middleware (optional)
const authenticateApiKey = (req, res, next) => {
  if (!config.api.apiKey) {
    return next(); // No API key required
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (apiKey === config.api.apiKey) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
};

// Cache for metrics
let cachedMetrics = null;
let lastFetch = 0;

/**
 * Get or fetch metrics with caching
 */
async function getMetrics(forceRefresh = false) {
  const now = Date.now();

  // Return cached data if still fresh
  if (!forceRefresh && cachedMetrics && (now - lastFetch < config.api.refreshInterval)) {
    return cachedMetrics;
  }

  const ssh = new NodeSSH();
  // Prevent MaxListenersExceededWarning when SSH reconnects rapidly
  if (ssh.connection) ssh.connection.setMaxListeners(20);
  try {
    let sshConnection = null;

    // Connect via SSH if in remote mode
    if (config.mode === 'remote') {
      if (!config.vps.host || !config.vps.username) {
        throw new Error('VPS credentials not configured for remote mode');
      }
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }

    // Fetch all metrics
    const metrics = await monitoring.getAllMetrics(sshConnection, config);

    // Update cache
    cachedMetrics = metrics;
    lastFetch = now;

    return metrics;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  } finally {
    ssh.dispose();
  }
}

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: config.mode,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get all metrics
 */
app.get('/api/metrics', authenticateApiKey, async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const metrics = await getMetrics(forceRefresh);
    res.json({
      ...metrics,
      server_mode: config.mode,
      server_host: config.mode === 'remote' ? config.vps.host : 'localhost',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get CPU metrics only
 */
app.get('/api/metrics/cpu', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      cpu: metrics.cpu,
      top_processes: metrics.top_processes,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get memory metrics only
 */
app.get('/api/metrics/memory', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      memory: metrics.memory,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get disk metrics only
 */
app.get('/api/metrics/disk', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      disks: metrics.disks,
      disk_io: metrics.disk_io,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Docker metrics only
 */
app.get('/api/metrics/docker', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      docker: metrics.docker,
      all_containers: metrics.all_containers,
      container_logs: metrics.container_logs || {},
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get network metrics only
 */
app.get('/api/metrics/network', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      network: metrics.network,
      bandwidth: metrics.bandwidth || null,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get services status only
 */
app.get('/api/metrics/services', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      services: metrics.services,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get PM2 processes only
 */
app.get('/api/metrics/pm2', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      pm2: metrics.pm2,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get logs
 */
app.get('/api/metrics/logs', authenticateApiKey, async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json({
      logs: metrics.logs,
      timestamp: metrics.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Monthly Bandwidth API (via vnstat)
 */
app.get('/api/metrics/bandwidth/monthly', authenticateApiKey, async (req, res) => {
  const ssh = new NodeSSH();
  try {
    let sshConnection = null;
    if (config.mode === 'remote') {
      if (!config.vps.host || !config.vps.username) {
        return res.status(400).json({ error: 'VPS credentials not configured' });
      }
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }
    const data = await monitoring.getMonthlyBandwidth(sshConnection);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    ssh.dispose();
  }
});

/**
 * Historical Metrics API (15-day history from SQLite)
 */
app.get('/api/metrics/history', authenticateApiKey, async (req, res) => {
  try {
    const days = parseInt(req.query.days || '15');
    const aggregated = req.query.raw === 'true'
      ? await db.getMetricsHistory(days)
      : await db.getMetricsHistoryAggregated(days);
    res.json({ success: true, days, data: aggregated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get container logs (granular)
 */
app.get('/api/metrics/docker/:name/logs', authenticateApiKey, async (req, res) => {
  const ssh = new NodeSSH();
  try {
    const { name } = req.params;
    const lines = req.query.lines || 100;

    let sshConnection = null;
    if (config.mode === 'remote') {
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }

    const logs = await monitoring.getContainerLogs(sshConnection, name, lines);

    res.json({ name, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    ssh.dispose();
  }
});

/**
 * Get container processes (granular)
 */
app.get('/api/metrics/docker/:name/top', authenticateApiKey, async (req, res) => {
  const ssh = new NodeSSH();
  try {
    const { name } = req.params;

    let sshConnection = null;
    if (config.mode === 'remote') {
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }

    const processes = await monitoring.getContainerProcesses(sshConnection, name);

    res.json({ name, processes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    ssh.dispose();
  }
});

/**
 * Trigger Backup
 */
app.post('/api/backup/run', authenticateApiKey, async (req, res) => {
  const ssh = new NodeSSH();
  try {
    const { type, settings } = req.body;
    let result;

    let sshConnection = null;
    if (config.mode === 'remote') {
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }

    if (type === 'client') {
      const source = settings?.path || '.';
      result = await backup.backupClient(sshConnection, source, settings);
    } else if (type === 'db') {
      if (!settings) throw new Error('Database settings required');
      result = await backup.backupDatabase(sshConnection, settings);
    } else {
      throw new Error('Invalid backup type');
    }

    if (result.success && settings?.email) {
      let localFilePath = result.file;

      // If remote, download the file to local server first to attach it
      if (config.mode === 'remote') {
        localFilePath = path.join('/tmp', `download-${path.basename(result.file)}`);
        try {
          await ssh.getFile(localFilePath, result.file);
        } catch (downloadError) {
          console.error('Failed to download backup for email:', downloadError);
          return res.json({ ...result, emailStatus: 'Failed to download file for email' });
        }
      }

      // Send the email
      const mailResult = await mail.sendMail({
        to: settings.email,
        subject: `[VPS Backup] ${type === 'db' ? 'Database Dump' : 'Client Archive'} - ${path.basename(result.file)}`,
        text: `Your backup is complete.\n\nType: ${type.toUpperCase()}\nFile: ${path.basename(result.file)}\nTimestamp: ${result.timestamp}\n\nPlease find the attached file.`,
        attachments: [
          {
            filename: path.basename(result.file),
            path: localFilePath
          }
        ]
      });

      // Cleanup local downloaded file
      if (config.mode === 'remote') {
        fs.unlink(localFilePath, () => { });
      }

      result.emailStatus = mailResult.success ? 'Sent' : `Failed: ${mailResult.error}`;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    ssh.dispose();
  }
});

/**
 * List Backups
 */
app.get('/api/backup/list', authenticateApiKey, async (req, res) => {
  const ssh = new NodeSSH();
  try {
    let sshConnection = null;
    if (config.mode === 'remote') {
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }

    // List files in /tmp matching backup-*
    const command = 'ls -1 /tmp/backup-* 2>/dev/null';
    const result = await monitoring.execCommand(sshConnection, command);

    const files = result.stdout.split('\n')
      .filter(f => f.trim())
      .map(f => ({
        name: f.split('/').pop(),
        path: f,
        type: f.includes('db') ? 'database' : 'client'
      }));

    res.json({ success: true, backups: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    ssh.dispose();
  }
});

app.get('/', (req, res) => {
  res.send('Server Monitoring Tools running..');
});


// ─── Background Metric Recorder ──────────────────────────────────────────────
/**
 * Parse a percentage string like "64.5%" into a float (64.5)
 */
function parsePct(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace('%', '')) || 0;
}

/**
 * Parse human-readable bytes like "2.4 GB" into GB as a float
 */
function parseGB(str) {
  if (!str) return 0;
  const match = String(str).match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const units = { B: 1e-9, KB: 1e-6, MB: 1e-3, GB: 1, TB: 1e3 };
  return val * (units[unit] || 1);
}

async function recordMetricsSnapshot() {
  const ssh = new NodeSSH();
  try {
    let sshConnection = null;
    if (config.mode === 'remote') {
      if (!config.vps.host || !config.vps.username) return;
      await ssh.connect(config.vps);
      sshConnection = ssh;
    }

    const metrics = await monitoring.getAllMetrics(sshConnection, config);

    const cpu_usage = parsePct(metrics.cpu);
    const ram_usage = parsePct(metrics.memory?.percent);
    const ram_used_gb = parseGB(metrics.memory?.used);
    const ram_total_gb = parseGB(metrics.memory?.total);
    const mainDisk = metrics.disks?.[0];
    const disk_usage = parsePct(mainDisk?.usage);
    const disk_used = mainDisk?.used || 'N/A';
    const disk_total = mainDisk?.size || 'N/A';

    await db.insertMetric({ cpu_usage, ram_usage, disk_usage, ram_used_gb, ram_total_gb, disk_used, disk_total });
    console.log(`[DB] Recorded snapshot — CPU: ${cpu_usage}%, RAM: ${ram_usage}%, Disk: ${disk_usage}%`);

    // Purge data older than 15 days
    await db.purgeOldData(15);
  } catch (err) {
    console.error('[DB] Failed to record metric snapshot:', err.message);
  } finally {
    // Always dispose SSH to prevent EventEmitter listener accumulation
    ssh.dispose();
  }
}

// Start server
const PORT = config.api.port;
app.listen(PORT, async () => {
  console.log(`🚀 VPS Monitoring API Server running on http://localhost:${PORT}`);
  console.log(`📊 Mode: ${config.mode}`);
  console.log(`🌐 Server: ${config.mode === 'remote' ? config.vps.host : 'localhost'}`);
  console.log(`📡 Dashboard: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${config.api.apiKey ? 'Enabled' : 'Disabled'}`);
  console.log(`\n📖 API Documentation: http://localhost:${PORT}`);

  // Initialize SQLite database
  await db.initializeDatabase();
  console.log('[DB] 15-day metrics recording is active (every 10 minutes).');

  // Record one snapshot on startup
  recordMetricsSnapshot();

  // Then record every 10 minutes (600,000 ms)
  setInterval(recordMetricsSnapshot, 10 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  db.db.close(() => console.log('[DB] SQLite connection closed.'));
  process.exit(0);
});
