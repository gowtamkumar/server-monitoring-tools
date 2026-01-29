#!/usr/bin/env node
/**
 * VPS Monitoring CLI Tool
 * 
 * This is a command-line interface for monitoring VPS servers.
 * It can run in two modes:
 * - Remote: Connect to VPS via SSH and gather metrics
 * - Local: Run directly on the VPS and gather local metrics
 * 
 * Usage:
 *   node index.js                    # Run once and display metrics
 *   node index.js --json             # Output in JSON format
 *   node index.js --watch            # Continuous monitoring (refresh every 30s)
 */

const { NodeSSH } = require("node-ssh");
const config = require("./config");
const monitoring = require("./lib/monitoring");

// Parse command line arguments
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const watchMode = args.includes('--watch');
const helpMode = args.includes('--help') || args.includes('-h');

if (helpMode) {
  console.log(`
VPS Monitoring CLI Tool

Usage:
  node index.js [options]

Options:
  --json        Output metrics in JSON format
  --watch       Continuous monitoring (refresh every 30s)
  --help, -h    Show this help message

Environment Variables:
  MODE          'remote' or 'local' (default: remote)
  VPS_HOST      VPS server IP address
  VPS_USERNAME  VPS SSH username
  VPS_PASSWORD  VPS SSH password

Examples:
  node index.js                    # Run once, display formatted output
  node index.js --json             # Run once, output JSON
  node index.js --watch            # Continuous monitoring
  MODE=local node index.js         # Monitor local system
  `);
  process.exit(0);
}

/**
 * Format metrics for console output
 */
function formatMetrics(metrics) {
  console.log("\n" + "=".repeat(80));
  console.log(`🖥️  VPS MONITORING DASHBOARD - ${metrics.mode.toUpperCase()} MODE`);
  console.log(`📍 Server: ${metrics.ip}`);
  console.log(`🕒 Timestamp: ${metrics.timestamp}`);
  console.log("=".repeat(80));

  // Security Alerts
  if (metrics.security_alerts && metrics.security_alerts.length > 0) {
    console.log("\n⚠️  SECURITY ALERTS:");
    metrics.security_alerts.forEach(alert => {
      console.log(`   [FAIL] PID ${alert.pid} (${alert.command}): ${alert.reason}`);
      console.log(`          Args: ${alert.args.substring(0, 70)}...`);
    });
  }

  // CPU
  console.log("\n📊 CPU Usage: " + metrics.cpu);

  // Memory
  console.log("\n💾 Memory:");
  console.log(`   Total: ${metrics.memory.total}`);
  console.log(`   Used:  ${metrics.memory.used} (${metrics.memory.percent || 'N/A'})`);
  console.log(`   Free:  ${metrics.memory.free}`);
  if (metrics.memory.available) console.log(`   Avail: ${metrics.memory.available}`);

  // Disks
  console.log("\n💿 Disk Usage:");
  metrics.disks.forEach(disk => {
    if (disk.filesystem) {
      console.log(`   ${disk.mount}: ${disk.used}/${disk.size} (${disk.usage})`);
    }
  });

  // Services
  if (metrics.services && Object.keys(metrics.services).length > 0) {
    console.log("\n⚙️  Services:");
    Object.entries(metrics.services).forEach(([service, status]) => {
      const icon = status === 'active' ? '✅' : '❌';
      console.log(`   ${icon} ${service}: ${status}`);
    });
  }

  // Docker
  if (metrics.docker && metrics.docker.length > 0) {
    console.log("\n🐳 Docker Containers:");
    metrics.docker.forEach(container => {
      console.log(`   ${container.name}: CPU ${container.cpu}, Mem ${container.memUsage} (${container.memPerc || 'N/A'})`);
      if (container.netIO) console.log(`      Net I/O: ${container.netIO} | Block I/O: ${container.blockIO}`);
    });
  }

  // PM2
  if (metrics.pm2 && metrics.pm2.length > 0) {
    console.log("\n🔄 PM2 Processes:");
    metrics.pm2.forEach(proc => {
      console.log(`   [${proc.id}] ${proc.name}: ${proc.status} (CPU: ${proc.cpu}, Mem: ${proc.memory})`);
    });
  }

  // Top Processes
  if (metrics.top_processes && metrics.top_processes.length > 0) {
    console.log("\n🔝 Top Processes by CPU:");
    metrics.top_processes.slice(0, 5).forEach(proc => {
      console.log(`   ${proc.pid} ${proc.user} - CPU: ${proc.cpu}, Mem: ${proc.mem}`);
      console.log(`      ${proc.command.substring(0, 70)}`);
    });
  }

  // Network
  console.log("\n🌐 Network:");
  if (typeof metrics.network === 'string') {
    console.log(`   ${metrics.network}`);
  } else {
    console.log(`   Interface: ${metrics.network.interface || 'N/A'}`);
    console.log(`   Total: RX ${metrics.network.total_rx} | TX ${metrics.network.total_tx}`);
    if (metrics.network.daily_rx) {
      console.log(`   Daily: RX ${metrics.network.daily_rx} | TX ${metrics.network.daily_tx}`);
    }

    if (metrics.network_speed) {
      const iface = metrics.network.interface;
      const speed = metrics.network_speed[iface] || Object.values(metrics.network_speed)[0];
      if (speed && typeof speed !== 'string') {
        console.log(`   Speed: RX ${speed.rx} | TX ${speed.tx}`);
      }
    }
  }

  // Disk I/O
  if (Array.isArray(metrics.disk_io) && metrics.disk_io.length > 0) {
    console.log("\n📈 Disk I/O:");
    metrics.disk_io.forEach(disk => {
      console.log(`   ${disk.device}: ${disk.util} utilization`);
    });
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Main monitoring function
 */
async function runMonitoring() {
  const ssh = new NodeSSH();
  try {
    let sshConnection = null;

    // Connect via SSH if in remote mode
    if (config.mode === 'remote') {
      console.log(`🔌 Connecting to ${config.vps.host}...`);
      await ssh.connect(config.vps);
      sshConnection = ssh;
    } else {
      console.log("🏠 Running in local mode...");
    }

    // Gather metrics
    const metrics = await monitoring.getAllMetrics(sshConnection, config);

    // Output results
    if (jsonOutput) {
      console.log(JSON.stringify(metrics, null, 2));
    } else {
      formatMetrics(metrics);
    }

    return metrics;
  } catch (err) {
    console.error("❌ Error fetching metrics:", err.message);
    throw err;
  } finally {
    ssh.dispose();
  }
}

/**
 * Watch mode - continuous monitoring
 */
async function watchMonitoring() {
  console.log("👀 Watch mode enabled - refreshing every 30 seconds");
  console.log("Press Ctrl+C to stop\n");

  while (true) {
    await runMonitoring();
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

// Run the monitor
if (watchMode) {
  watchMonitoring().catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  runMonitoring()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

