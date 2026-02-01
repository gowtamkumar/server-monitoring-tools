const express = require('express');
const cors = require('cors');
const { NodeSSH } = require('node-ssh');
const config = require('./config');
const monitoring = require('./lib/monitoring');
const backup = require('./lib/backup');
const mail = require('./lib/mail');
const fs = require('fs');
const path = require('path');

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
    res.json(metrics);
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
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VPS Monitor | ${config.mode.toUpperCase()}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        :root {
          --bg: #0f172a;
          --card-bg: #1e293b;
          --accent: #6366f1;
          --success: #22c55e;
          --warning: #f59e0b;
          --danger: #ef4444;
          --text: #f8fafc;
          --text-dim: #94a3b8;
          
          /* Boss UI Variables */
          --boss-gold: #fbbf24;
          --boss-bg: #111;
          --boss-panel: #1a1a1a;
        }

        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #334155; padding-bottom: 1.5rem; }
        .logo { font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; color: var(--accent); }
        .server-info { text-align: right; }
        .server-info p { color: var(--text-dim); font-size: 0.875rem; }
        
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .badge-success { background: rgba(34, 197, 94, 0.1); color: var(--success); border: 1px solid var(--success); }
        
        /* Boss UI Styles */
        .boss-panel { background: var(--boss-panel); border: 1px solid #333; border-top: 3px solid var(--boss-gold); padding: 2rem; border-radius: 0.5rem; margin-bottom: 2rem; }
        .boss-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; border-bottom: 1px solid #333; padding-bottom: 1rem; }
        .boss-title { font-family: 'Playfair Display', serif; color: var(--boss-gold); font-size: 1.5rem; letter-spacing: 1px; text-transform: uppercase; }
        .boss-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .boss-card { background: #000; border: 1px solid #333; padding: 1.5rem; border-radius: 0.25rem; position: relative; overflow: hidden; }
        .boss-card::before { content:''; position: absolute; top:0; left:0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, var(--boss-gold), transparent); }
        .boss-input { width: 100%; padding: 0.75rem; background: #222; border: 1px solid #444; color: #fff; margin-bottom: 1rem; border-radius: 0.25rem; font-family: monospace; }
        .boss-input:focus { border-color: var(--boss-gold); outline: none; }
        .boss-label { display: block; color: var(--text-dim); margin-bottom: 0.5rem; font-size: 0.8rem; text-transform: uppercase; }
        .boss-btn { background: var(--boss-gold); color: #000; font-weight: bold; width: 100%; padding: 1rem; text-transform: uppercase; letter-spacing: 1px; border: none; cursor: pointer; transition: all 0.3s; }
        .boss-btn:hover { background: #fff; }
        .boss-btn:disabled { background: #555; cursor: not-allowed; }
        .boss-status { font-family: monospace; color: var(--success); margin-top: 1rem; min-height: 1.5rem; }

        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        
        .card { background: var(--card-bg); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #334155; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .card-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
        .card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(99, 102, 241, 0.1); color: var(--accent); }
        
        .metric-value { font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .progress-container { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin: 1rem 0; }
        .progress-bar { height: 100%; background: var(--accent); transition: width 0.5s ease; width: 0%; }
        
        .data-list { list-style: none; }
        .data-item { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #334155; font-size: 0.9rem; }
        .data-item:last-child { border-bottom: none; }
        .data-label { color: var(--text-dim); }
        
        table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 1rem; }
        th { color: var(--text-dim); font-size: 0.75rem; text-transform: uppercase; padding: 1rem; border-bottom: 1px solid #334155; }
        td { padding: 1rem; border-bottom: 1px solid #334155; font-size: 0.9rem; }
        tr:hover { background: rgba(255,255,255,0.02); }
        
        .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem; }
        .status-active { background: var(--success); box-shadow: 0 0 10px var(--success); }
        .status-inactive { background: var(--danger); box-shadow: 0 0 10px var(--danger); }
        
        .btn { padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; background: var(--accent); color: white; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; }
        .btn:hover { filter: brightness(1.2); }
        .btn-outline { background: transparent; border: 1px solid var(--accent); color: var(--accent); }
        
        .tabs { display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid #334155; }
        .tab { padding: 1rem; cursor: pointer; color: var(--text-dim); border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        
        .section { display: none; }
        .section.active { display: block; }
        
        #last-update { font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem; }
        
        .security-flag { background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 1rem; margin-bottom: 1rem; border-radius: 0 0.5rem 0.5rem 0; }
        
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .loading { animation: pulse 2s infinite; }
        
        pre { background: #000; padding: 1rem; border-radius: 0.5rem; color: #0f0; font-family: 'Fira Code', monospace; font-size: 0.8rem; height: 300px; overflow-y: auto; white-space: pre-wrap; margin-top: 1rem; }
        
        #modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; align-items: center; justify-content: center; }
        .modal-content { background: var(--card-bg); width: 80%; max-width: 900px; border-radius: 1rem; padding: 2rem; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div class="logo">
            <i class="fas fa-server"></i>
            VPS MONITOR
          </div>
          <div class="server-info">
            <p>Host: <strong>${config.mode === 'remote' ? config.vps.host : 'localhost'}</strong></p>
            <p>Mode: <span class="badge badge-success">${config.mode}</span></p>
            <div id="last-update">Syncing...</div>
          </div>
        </header>

        <div class="metrics-grid">
          <div class="card">
            <div class="card-header">
              <h2>CPU Usage</h2>
              <div class="card-icon"><i class="fas fa-microchip"></i></div>
            </div>
            <div class="metric-value" id="cpu-val">0%</div>
            <div class="progress-container"><div class="progress-bar" id="cpu-bar"></div></div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>RAM Usage</h2>
              <div class="card-icon"><i class="fas fa-memory"></i></div>
            </div>
            <div class="metric-value" id="ram-val">0/0</div>
            <div class="progress-container"><div class="progress-bar" id="ram-bar"></div></div>
            <div id="ram-details" style="font-size: 0.8rem; color: var(--text-dim)">Checking...</div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>Disk Health</h2>
              <div class="card-icon"><i class="fas fa-hdd"></i></div>
            </div>
            <div class="metric-value" id="disk-val">0%</div>
            <div class="progress-container"><div class="progress-bar" id="disk-bar" style="background: var(--success)"></div></div>
            <div id="disk-mount" style="font-size: 0.8rem; color: var(--text-dim)">Mount: /</div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>Network</h2>
              <div class="card-icon"><i class="fas fa-network-wired"></i></div>
            </div>
            <div id="net-speed" style="font-size: 1.25rem; font-weight: bold; color: var(--accent)">0 B/s</div>
            <div class="data-list" style="margin-top: 1rem">
              <div class="data-item"><span class="data-label">Total RX</span> <span id="net-rx">0</span></div>
              <div class="data-item"><span class="data-label">Total TX</span> <span id="net-tx">0</span></div>
            </div>
          </div>
        </div>

        <div id="security-alerts-container"></div>

        <div class="tabs">
          <div class="tab active" onclick="showSection('docker')"><i class="fab fa-docker"></i> Docker</div>
          <div class="tab" onclick="showSection('processes')"><i class="fas fa-list"></i> Processes</div>
          <div class="tab" onclick="showSection('services')"><i class="fas fa-cogs"></i> Services</div>
          <div class="tab" onclick="showSection('logs')"><i class="fas fa-file-alt"></i> Logs</div>
          <div class="tab" onclick="showSection('backups')" style="color: var(--boss-gold)"><i class="fas fa-shield-alt"></i> Backups</div>
          <div class="tab" onclick="showSection('api-doc')"><i class="fas fa-book"></i> API</div>
        </div>

        <div id="docker" class="card section active">
          <table>
            <thead>
              <tr>
                <th>Container</th>
                <th>Status</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Net I/O</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="docker-tbody">
              <tr><td colspan="6" class="loading">Loading containers...</td></tr>
            </tbody>
          </table>
        </div>

        <div id="processes" class="card section">
          <table>
            <thead>
              <tr>
                <th>PID</th>
                <th>User</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Command</th>
              </tr>
            </thead>
            <tbody id="proc-tbody">
              <tr><td colspan="5">Loading processes...</td></tr>
            </tbody>
          </table>
        </div>

        <div id="services" class="card section">
          <div class="metrics-grid" id="services-grid">
            <!-- Services will be injected here -->
          </div>
        </div>

        <div id="logs" class="card section">
          <div class="card-header">
            <h2>System Logs</h2>
            <button onclick="document.getElementById('log-output').innerText = 'Logs cleared. Next sync in 30s...'" class="btn btn-outline btn-sm"><i class="fas fa-eraser"></i> Clear</button>
          </div>
          <pre id="log-output">Fetching logs...</pre>
        </div>

        <div id="backups" class="section">
          <div class="boss-panel">
            <div class="boss-header">
              <h2 class="boss-title"><i class="fas fa-crown"></i> System Backup Manager</h2>
              <div class="badge" style="background: var(--boss-gold); color: #000">Authorized Access Only</div>
            </div>
            
            <div class="boss-grid">
              <!-- Client Backup -->
              <div class="boss-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem">
                  <h3 style="color:white; text-transform:uppercase">Inner Client System</h3>
                  <div id="client-size-badge" class="badge" style="background:#333; color:var(--boss-gold)">Size: --</div>
                </div>
                
                <div class="boss-label">Source Path</div>
                <input type="text" id="backup-client-path" class="boss-input" value="." placeholder="/path/to/app">
                
                <div class="boss-label">Exclude Patterns</div>
                <input type="text" id="backup-client-excludes" class="boss-input" placeholder="node_modules, .git">
                
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem">
                  <input type="checkbox" id="backup-client-email-toggle" onchange="document.getElementById('backup-client-email').style.display = this.checked ? 'block' : 'none'">
                  <label for="backup-client-email-toggle" class="boss-label" style="margin-bottom:0">Email Result</label>
                </div>
                <input type="email" id="backup-client-email" class="boss-input" style="display:none" placeholder="boss@example.com">
                
                <button onclick="runBackup('client')" id="btn-backup-client" class="boss-btn"><i class="fas fa-save"></i> Initiate Backup</button>
                <div id="status-client" class="boss-status">Status: Ready</div>
                
                <div style="margin-top:1.5rem; border-top:1px solid #333; padding-top:1rem;">
                  <div class="boss-label" style="display:flex; justify-content:space-between; align-items:center;">
                    Existing Backups
                    <i class="fas fa-sync" style="cursor:pointer" onclick="loadBackups()"></i>
                  </div>
                  <div id="backup-list" style="max-height:100px; overflow-y:auto; font-size:0.75rem;">
                    <div style="color:#666; font-style:italic">Click sync to load records...</div>
                  </div>
                </div>
              </div>

              <!-- Database Backup -->
              <div class="boss-card">
                <h3 style="color:white; margin-bottom:1.5rem; text-transform:uppercase">Database Vault</h3>
                
                <div class="boss-label">Database Type</div>
                <select id="backup-db-type" class="boss-input">
                  <option value="mysql">MySQL / MariaDB</option>
                  <option value="postgres">PostgreSQL</option>
                </select>

                <div class="boss-label">Host</div>
                <input type="text" id="backup-db-host" class="boss-input" value="localhost">

                <div class="boss-label">Database Name</div>
                <input type="text" id="backup-db-name" class="boss-input" placeholder="db_name">

                <div class="boss-label">User</div>
                <input type="text" id="backup-db-user" class="boss-input" placeholder="root">

                <div class="boss-label">Password</div>
                <input type="password" id="backup-db-pass" class="boss-input" placeholder="••••••••">

                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem">
                  <input type="checkbox" id="backup-db-email-toggle" onchange="document.getElementById('backup-db-email').style.display = this.checked ? 'block' : 'none'">
                  <label for="backup-db-email-toggle" class="boss-label" style="margin-bottom:0">Email Result</label>
                </div>
                <input type="email" id="backup-db-email" class="boss-input" style="display:none" placeholder="boss@example.com">
                
                <button onclick="runBackup('db')" id="btn-backup-db" class="boss-btn"><i class="fas fa-database"></i> Dump Database</button>
                <div id="status-db" class="boss-status">Status: Ready</div>
              </div>
            </div>

            <div style="margin-top: 2rem;">
               <h3 style="color:white; margin-bottom:1rem; font-size:0.9rem; text-transform:uppercase">Backup History</h3>
               <div id="backup-console" style="background:black; padding:1rem; border:1px solid #333; color:#0f0; font-family:monospace; height:150px; overflow-y:auto; font-size:0.8rem;">
                  > System initialized...
               </div>
            </div>
          </div>
        </div>

        <div id="api-doc" class="card section">
          <div class="card-header"><h2>API Documentation</h2></div>
          <p style="color: var(--text-dim); margin-bottom: 1rem;">Click on any endpoint to view the raw JSON data in a new tab.</p>
          <div class="metrics-grid">
            <div class="card" style="padding: 1rem;">
              <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--accent);">System Metrics</h3>
              <a href="/api/metrics" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: 0.5rem;"><i class="fas fa-link"></i> /api/metrics</a>
              <a href="/api/metrics/cpu" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: 0.5rem;"><i class="fas fa-microchip"></i> /api/metrics/cpu</a>
              <a href="/api/metrics/memory" target="_blank" class="btn btn-outline" style="width: 100%;"><i class="fas fa-memory"></i> /api/metrics/memory</a>
            </div>
            <div class="card" style="padding: 1rem;">
              <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--accent);">Infrastructure</h3>
              <a href="/api/metrics/docker" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: 0.5rem;"><i class="fab fa-docker"></i> /api/metrics/docker</a>
              <a href="/api/metrics/network" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: 0.5rem;"><i class="fas fa-network-wired"></i> /api/metrics/network</a>
              <a href="/api/metrics/services" target="_blank" class="btn btn-outline" style="width: 100%;"><i class="fas fa-cogs"></i> /api/metrics/services</a>
            </div>
            <div class="card" style="padding: 1rem;">
              <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--accent);">Application</h3>
              <a href="/api/metrics/pm2" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: 0.5rem;"><i class="fas fa-rocket"></i> /api/metrics/pm2</a>
              <a href="/api/metrics/disk" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: 0.5rem;"><i class="fas fa-hdd"></i> /api/metrics/disk</a>
              <a href="/health" target="_blank" class="btn btn-outline" style="width: 100%;"><i class="fas fa-heartbeat"></i> /health</a>
            </div>
          </div>
        </div>
      </div>

      <div id="modal">
        <div class="modal-content">
          <div class="card-header">
            <h2 id="modal-title">Details</h2>
            <button onclick="closeModal()" class="btn btn-outline"><i class="fas fa-times"></i></button>
          </div>
          <pre id="modal-body"></pre>
        </div>
      </div>

      <script>
        function showSection(id) {
          document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          const target = document.getElementById(id);
          if (target) target.classList.add('active');
          if (event && event.currentTarget) event.currentTarget.classList.add('active');
        }

        async function fetchMetrics() {
          try {
            const res = await fetch('/api/metrics');
            const data = await res.json();
            updateUI(data);
          } catch (err) {
            console.error('Fetch error:', err);
          }
        }

        function updateUI(data) {
          // Update Timestamp & Monitor Health
          document.getElementById('last-update').innerHTML = 
            'Last sync: ' + new Date(data.timestamp).toLocaleTimeString() + '<br>' +
            '<span style="font-size: 0.7rem; color: var(--accent)">' +
              'Monitor: ' + (data.monitor?.uptime || "0s") + ' UP | ' + (data.monitor?.memory || "0MB") + ' RAM | Node ' + (data.monitor?.node || "N/A") +
            '</span>';

          // CPU
          const cpu = parseFloat(data.cpu);
          document.getElementById('cpu-val').innerText = data.cpu;
          document.getElementById('cpu-bar').style.width = data.cpu;
          document.getElementById('cpu-bar').style.backgroundColor = cpu > 80 ? 'var(--danger)' : cpu > 50 ? 'var(--warning)' : 'var(--accent)';

          // RAM
          if (data.memory) {
            document.getElementById('ram-val').innerText = data.memory.percent || (data.memory.used + '/' + data.memory.total);
            document.getElementById('ram-bar').style.width = data.memory.percent || '0%';
            document.getElementById('ram-details').innerText = 'Used: ' + data.memory.used + ' / Total: ' + data.memory.total;
          }

          // Disk
          if (data.disks && data.disks.length > 0) {
            const main = data.disks[0];
            document.getElementById('disk-val').innerText = main.usage;
            document.getElementById('disk-bar').style.width = main.usage;
            document.getElementById('disk-mount').innerText = 'Mount: ' + main.mount + ' (' + main.size + ')';
          }

          // Network
          if (data.network) {
            document.getElementById('net-rx').innerText = data.network.total_rx;
            document.getElementById('net-tx').innerText = data.network.total_tx;
            
            if (data.network_speed) {
              const speed = data.network_speed[data.network.interface] || Object.values(data.network_speed)[0];
              if (speed && typeof speed !== 'string') {
                document.getElementById('net-speed').innerText = 'RX: ' + speed.rx + ' | TX: ' + speed.tx;
              }
            }
          }

          // Security
          const secContainer = document.getElementById('security-alerts-container');
          secContainer.innerHTML = '';
          if (data.security_alerts && data.security_alerts.length > 0) {
            data.security_alerts.forEach(alert => {
              const div = document.createElement('div');
              div.className = 'security-flag';
              div.innerHTML = \`<strong><i class="fas fa-exclamation-triangle"></i> SECURITY ALERT</strong>: 
                              PID \${alert.pid} (\${alert.command}) is running from \${alert.reason}.\`;
              secContainer.appendChild(div);
            });
          }

          // Docker
          const dockerTable = document.getElementById('docker-tbody');
          dockerTable.innerHTML = '';
          const stats = data.docker || [];
          data.all_containers.forEach(container => {
            const stat = stats.find(s => s.name === container.name) || {};
            const tr = document.createElement('tr');
            const isActive = container.status.toLowerCase().includes('up');
            
            tr.innerHTML = \`
              <td><strong>\${container.name}</strong><br><small style="color:var(--text-dim)">\${container.image}</small></td>
              <td><span class="status-dot \${isActive ? 'status-active' : 'status-inactive'}"></span> \${container.status}</td>
              <td>\${stat.cpu || '--'}</td>
              <td>\${stat.memUsage || '--'} (\${stat.memPerc || '--'})</td>
              <td>\${stat.netIO || '--'}</td>
              <td>
                <button onclick="viewLogs('\${container.name}')" class="btn btn-outline" title="Logs"><i class="fas fa-terminal"></i></button>
                <button onclick="viewTop('\${container.name}')" class="btn btn-outline" title="Top"><i class="fas fa-list-ol"></i></button>
              </td>
            \`;
            dockerTable.appendChild(tr);
          });

          // Processes
          const procTable = document.getElementById('proc-tbody');
          procTable.innerHTML = '';
          data.top_processes.slice(0, 15).forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
              <td>\${p.pid}</td>
              <td>\${p.user}</td>
              <td style="color:var(--accent); font-weight:bold">\${p.cpu}</td>
              <td>\${p.mem}</td>
              <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${p.command}">\${p.command}</td>
            \`;
            procTable.appendChild(tr);
          });

          // Services
          const servGrid = document.getElementById('services-grid');
          servGrid.innerHTML = '';
          Object.entries(data.services).forEach(([name, status]) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = \`
              <div class="card-header">
                <h2 style="font-size:0.8rem">\${name}</h2>
                <span class="status-dot \${status === 'active' ? 'status-active' : 'status-inactive'}"></span>
              </div>
              <div style="font-weight:bold; color:\${status === 'active' ? 'var(--success)' : 'var(--danger)'}">\${status.toUpperCase()}</div>
            \`;
            servGrid.appendChild(card);
          });

          // Logs
          document.getElementById('log-output').innerText = data.logs;
          
          // Client Size
          if (data.client_size) {
            document.getElementById('client-size-badge').innerText = 'Size: ' + data.client_size;
          }
        }

        async function viewLogs(name) {
          openModal('Logs: ' + name);
          document.getElementById('modal-body').innerText = 'Streaming logs...';
          const res = await fetch('/api/metrics/docker/' + name + '/logs');
          const data = await res.json();
          document.getElementById('modal-body').innerText = data.logs;
        }

        async function viewTop(name) {
          openModal('Internal Processes: ' + name);
          document.getElementById('modal-body').innerText = 'Querying container...';
          const res = await fetch('/api/metrics/docker/' + name + '/top');
          const data = await res.json();
          
          let table = 'PID\\tUSER\\tCPU\\tMEM\\tCOMMAND\\n' + '-'.repeat(60) + '\\n';
          data.processes.forEach(p => {
            table += \`\${p.pid}\\t\${p.user}\\t\${p.cpu}\\t\${p.mem}\\t\${p.command}\\n\`;
          });
          document.getElementById('modal-body').innerText = table;
        }

        function openModal(title) {
          document.getElementById('modal').style.display = 'flex';
          document.getElementById('modal-title').innerText = title;
        }

        function closeModal() {
          document.getElementById('modal').style.display = 'none';
        }

        async function runBackup(type) {
          const btn = document.getElementById('btn-backup-' + type);
          const status = document.getElementById('status-' + type);
          
          let settings = {};
          if (type === 'client') {
            settings.path = document.getElementById('backup-client-path').value;
            settings.excludes = document.getElementById('backup-client-excludes').value;
            if (document.getElementById('backup-client-email-toggle').checked) {
              settings.email = document.getElementById('backup-client-email').value;
              if (!settings.email) return alert('Enter email address');
            }
          } else if (type === 'db') {
            settings.type = document.getElementById('backup-db-type').value;
            settings.host = document.getElementById('backup-db-host').value;
            settings.name = document.getElementById('backup-db-name').value;
            settings.user = document.getElementById('backup-db-user').value;
            settings.password = document.getElementById('backup-db-pass').value;
            if (document.getElementById('backup-db-email-toggle').checked) {
              settings.email = document.getElementById('backup-db-email').value;
              if (!settings.email) return alert('Enter email address');
            }
            
            if (!settings.name || !settings.user) {
              alert('Please fill in database details');
              return;
            }
          }

          // UI Update
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
          status.innerText = 'Status: BACKUP IN PROGRESS...';
          status.style.color = 'var(--warning)';
          logToConsole(\`[\${type.toUpperCase()}] Starting backup job...\`);

          try {
             const res = await fetch('/api/backup/run', {
               method: 'POST',
               headers: {'Content-Type': 'application/json'},
               body: JSON.stringify({ type, settings })
             });
             const data = await res.json();
             
             if (data.success) {
               status.innerText = 'Status: COMPLETED';
               status.style.color = 'var(--success)';
               let msg = \`[\${type.toUpperCase()}] SUCCESS: \${data.message} (\${data.file})\`;
               if (data.emailStatus) msg += \` | Email: \${data.emailStatus}\`;
               logToConsole(msg);
             } else {
               status.innerText = 'Status: FAILED';
               status.style.color = 'var(--danger)';
               logToConsole(\`[\${type.toUpperCase()}] ERROR: \${data.error}\`);
             }
          } catch (err) {
             console.error(err);
             status.innerText = 'Status: NETWORK ERROR';
             status.style.color = 'var(--danger)';
             logToConsole(\`[\${type.toUpperCase()}] NETWORK ERROR: \${err.message}\`);
          } finally {
             btn.disabled = false;
             btn.innerHTML = type === 'client' ? '<i class="fas fa-save"></i> Initiate Backup' : '<i class="fas fa-database"></i> Dump Database';
          }
        }

        function logToConsole(msg) {
           const c = document.getElementById('backup-console');
           const time = new Date().toLocaleTimeString();
           c.innerHTML += \`<div><span style="color:#666">[\${time}]</span> \${msg}</div>\`;
           c.scrollTop = c.scrollHeight;
        }

        async function loadBackups() {
           const list = document.getElementById('backup-list');
           list.innerHTML = '<div style="color:var(--boss-gold)"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
           
           try {
             const res = await fetch('/api/backup/list');
             const data = await res.json();
             
             if (data.success && data.backups.length > 0) {
               list.innerHTML = data.backups.map(b => \`
                 <div style="padding: 5px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center;">
                    <span title="\${b.path}" style="color:\${b.type === 'database' ? 'var(--boss-gold)' : 'var(--text)'}">
                       \${b.name.length > 25 ? b.name.substring(0,25)+'...' : b.name}
                    </span>
                    <i class="fas fa-download" style="color:#666; cursor:not-allowed"></i>
                 </div>
               \`).join('');
             } else {
               list.innerHTML = '<div style="color:#666">No backups found in /tmp</div>';
             }
           } catch (err) {
             list.innerHTML = '<div style="color:var(--danger)">Failed to load</div>';
           }
        }

        // Auto Refresh
        setInterval(fetchMetrics, ${config.api.refreshInterval});
        fetchMetrics();
        loadBackups();
      </script>
    </body>
    </html>
  `);
});


// Start server
const PORT = config.api.port;
app.listen(PORT, () => {
  console.log(`🚀 VPS Monitoring API Server running on http://localhost:${PORT}`);
  console.log(`📊 Mode: ${config.mode}`);
  console.log(`🌐 Server: ${config.mode === 'remote' ? config.vps.host : 'localhost'}`);
  console.log(`📡 Dashboard: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${config.api.apiKey ? 'Enabled' : 'Disabled'}`);
  console.log(`\n📖 API Documentation: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
