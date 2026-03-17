const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'metrics.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create and connect to the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Failed to connect to SQLite:', err.message);
  } else {
    console.log('[DB] Connected to SQLite metrics database at', DB_PATH);
  }
});

// Initialize tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS system_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cpu_usage REAL,
          ram_usage REAL,
          disk_usage REAL,
          ram_used_gb REAL,
          ram_total_gb REAL,
          disk_used TEXT,
          disk_total TEXT,
          timestamp TEXT DEFAULT (datetime('now'))
        )
      `, (err) => {
        if (err) {
          console.error('[DB] Failed to create table:', err.message);
          reject(err);
        } else {
          console.log('[DB] system_metrics table ready.');
          // Auto-purge data older than 15 days on startup
          purgeOldData().then(resolve).catch(reject);
        }
      });
    });
  });
}

/**
 * Insert a metric snapshot into the database
 */
function insertMetric({ cpu_usage, ram_usage, disk_usage, ram_used_gb, ram_total_gb, disk_used, disk_total }) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO system_metrics (cpu_usage, ram_usage, disk_usage, ram_used_gb, ram_total_gb, disk_used, disk_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([cpu_usage, ram_usage, disk_usage, ram_used_gb, ram_total_gb, disk_used, disk_total], function (err) {
      if (err) {
        console.error('[DB] Failed to insert metric:', err.message);
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
    stmt.finalize();
  });
}

/**
 * Get metrics from the last N days (default: 15)
 */
function getMetricsHistory(days = 15) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM system_metrics
       WHERE timestamp >= datetime('now', ?)
       ORDER BY timestamp ASC`,
      [`-${days} days`],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * Get aggregated hourly averages for the last N days (better for charting)
 */
function getMetricsHistoryAggregated(days = 15) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        strftime('%Y-%m-%d %H:00', timestamp) as hour,
        ROUND(AVG(cpu_usage), 2) as avg_cpu,
        ROUND(AVG(ram_usage), 2) as avg_ram,
        ROUND(AVG(disk_usage), 2) as avg_disk,
        ROUND(AVG(ram_used_gb), 2) as avg_ram_used_gb,
        ROUND(AVG(ram_total_gb), 2) as avg_ram_total_gb,
        MAX(disk_used) as disk_used,
        MAX(disk_total) as disk_total,
        COUNT(*) as sample_count
       FROM system_metrics
       WHERE timestamp >= datetime('now', ?)
       GROUP BY strftime('%Y-%m-%d %H', timestamp)
       ORDER BY hour ASC`,
      [`-${days} days`],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * Delete records older than 15 days to keep the database lean
 */
function purgeOldData(days = 15) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM system_metrics WHERE timestamp < datetime('now', ?)`,
      [`-${days} days`],
      function (err) {
        if (err) {
          console.error('[DB] Failed to purge old data:', err.message);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`[DB] Purged ${this.changes} old metric records (>${days} days).`);
          }
          resolve(this.changes);
        }
      }
    );
  });
}

module.exports = {
  db,
  initializeDatabase,
  insertMetric,
  getMetricsHistory,
  getMetricsHistoryAggregated,
  purgeOldData,
};
