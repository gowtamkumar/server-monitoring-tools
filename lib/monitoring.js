const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Formats bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Execute command either via SSH or locally
 * @param {Object|null} ssh - SSH connection object (null for local mode)
 * @param {string} command - Command to execute
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function execCommand(ssh, command) {
  if (ssh) {
    // Remote mode via SSH
    const result = await ssh.execCommand(command);
    return { stdout: result.stdout, stderr: result.stderr };
  } else {
    // Local mode
    return await execPromise(command);
  }
}

/**
 * Get CPU usage percentage
 */
async function getCPUUsage(ssh) {
  try {
    const result = await execCommand(ssh, "top -b -n1 | grep 'Cpu(s)'");
    // Match both "Cpu(s):" and "%Cpu(s):" formats
    const cpuMatch = result.stdout.match(/(\d+\.\d+)\s*id/);
    const cpuUsage = cpuMatch ? 100 - parseFloat(cpuMatch[1]) : null;
    return cpuUsage !== null ? cpuUsage.toFixed(2) + "%" : "N/A";
  } catch (err) {
    return "Error: " + err.message;
  }
}

/**
 * Get memory usage
 */
async function getMemoryUsage(ssh) {
  try {
    const result = await execCommand(ssh, "free -b"); // Use bytes for precise parsing
    const lines = result.stdout.split("\n");
    const memMatch = lines[1].match(/Mem:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);

    if (!memMatch) throw new Error("Could not parse memory output");

    const total = parseInt(memMatch[1]);
    const used = parseInt(memMatch[2]);
    const free = parseInt(memMatch[3]);
    const available = parseInt(memMatch[6]);

    return {
      total: formatBytes(total),
      used: formatBytes(used),
      free: formatBytes(free),
      available: formatBytes(available),
      percent: ((used / total) * 100).toFixed(1) + "%"
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get disk usage
 */
async function getDiskUsage(ssh) {
  try {
    const result = await execCommand(ssh, "df -h --output=source,size,used,avail,pcent,target -x tmpfs -x devtmpfs");
    const diskLines = result.stdout.split("\n").slice(1).filter(line => line.trim());
    return diskLines.map(line => {
      const parts = line.split(/\s+/);
      return {
        filesystem: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        usage: parts[4],
        mount: parts[5]
      };
    });
  } catch (err) {
    return [{ error: err.message }];
  }
}

/**
 * Get Docker container statistics
 */
async function getDockerStats(ssh) {
  try {
    const result = await execCommand(ssh, "docker stats --no-stream --format '{{.Name}}: {{.CPUPerc}} || {{.MemUsage}} || {{.MemPerc}} || {{.NetIO}} || {{.BlockIO}}'");
    if (!result.stdout) return [];

    return result.stdout.split("\n").filter(line => line.trim()).map(line => {
      const [name, cpu, mem, memPerc, net, block] = line.split(" || ");
      return {
        name: name.replace(':', ''),
        cpu,
        memUsage: mem,
        memPerc,
        netIO: net,
        blockIO: block
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Get all Docker containers (running and stopped)
 */
async function getAllContainers(ssh) {
  try {
    const result = await execCommand(ssh, "docker ps -a --format '{{.Names}} || {{.Status}} || {{.Image}} || {{.ID}}'");
    if (!result.stdout) return [];

    return result.stdout.split("\n").filter(line => line.trim()).map(line => {
      const [name, status, image, id] = line.split(" || ");
      return { name, status, image, id };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Get Docker container internal processes
 */
async function getContainerProcesses(ssh, containerName) {
  try {
    const result = await execCommand(ssh, `docker top ${containerName} -eo pid,user,%cpu,%mem,comm`);
    if (!result.stdout) return [];

    const lines = result.stdout.split("\n").filter(line => line.trim());
    const header = lines[0].toLowerCase().split(/\s+/);

    return lines.slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parts[0],
        user: parts[1],
        cpu: parts[2] + "%",
        mem: parts[3] + "%",
        command: parts.slice(4).join(" ")
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Get Docker container logs
 */
async function getContainerLogs(ssh, containerName, lines = 50) {
  try {
    const result = await execCommand(ssh, `docker logs --tail ${lines} ${containerName} 2>&1`);
    return result.stdout || result.stderr;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

/**
 * Get PM2 processes
 */
async function getPM2Processes(ssh) {
  try {
    const result = await execCommand(ssh, "bash -l -c 'pm2 jlist'");
    if (!result.stdout) return [];

    const processes = JSON.parse(result.stdout);
    return processes.map(proc => ({
      name: proc.name,
      id: proc.pm_id,
      status: proc.pm2_env.status,
      cpu: proc.monit.cpu + "%",
      memory: formatBytes(proc.monit.memory),
      uptime: Math.floor((new Date().getTime() - proc.pm2_env.pm_uptime) / 1000) + "s"
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Get top processes by CPU/Memory
 */
async function getTopProcesses(ssh, count = 10) {
  try {
    const result = await execCommand(ssh, `ps -eo pid,user,%cpu,%mem,command --sort=-%cpu | head -n ${count + 1}`);
    const lines = result.stdout.split("\n").slice(1).filter(line => line.trim());

    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parts[0],
        user: parts[1],
        cpu: parts[2] + "%",
        mem: parts[3] + "%",
        command: parts.slice(4).join(" ")
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Security: Detect suspicious processes
 */
async function getSecurityAlerts(ssh) {
  try {
    const suspiciousPaths = ['/tmp', '/var/tmp', '/dev/shm', '/tmp/.', '/var/run'];
    const result = await execCommand(ssh, `ps -eo pid,user,comm,args --no-headers`);
    const lines = result.stdout.split("\n").filter(line => line.trim());

    const alerts = [];
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const fullCommand = parts.slice(3).join(" ");

      // Check if process is running from suspicious path
      suspiciousPaths.forEach(path => {
        if (fullCommand.includes(path) && !fullCommand.includes('node_modules')) {
          alerts.push({
            pid: parts[0],
            user: parts[1],
            command: parts[2],
            args: fullCommand,
            reason: `Process running from ${path}`
          });
        }
      });
    });

    return alerts;
  } catch (err) {
    return [];
  }
}

/**
 * Get service status (NGINX, Docker, PHP-FPM, etc.)
 */
async function getServiceStatus(ssh, services = ['nginx', 'docker']) {
  const statuses = {};

  for (const service of services) {
    try {
      const result = await execCommand(ssh, `systemctl is-active ${service}`);
      statuses[service] = result.stdout.trim() === 'active' ? 'active' : 'inactive';
    } catch (err) {
      statuses[service] = 'not found';
    }
  }

  return statuses;
}

/**
 * Get network statistics (vnstat)
 */
async function getNetworkStats(ssh) {
  try {
    const result = await execCommand(ssh, "vnstat --json");
    if (!result.stdout) return "vnstat not installed or no data";

    const data = JSON.parse(result.stdout);
    const iface = data.interfaces?.[0];

    if (!iface) return "No data found in vnstat";

    return {
      interface: iface.name,
      total_rx: formatBytes(iface.traffic?.total?.rx || 0),
      total_tx: formatBytes(iface.traffic?.total?.tx || 0),
      daily_rx: formatBytes(iface.traffic?.day?.[0]?.rx || 0),
      daily_tx: formatBytes(iface.traffic?.day?.[0]?.tx || 0),
      raw_rx: iface.traffic?.total?.rx || 0,
      raw_tx: iface.traffic?.total?.tx || 0
    };
  } catch (err) {
    return "vnstat not installed or no data";
  }
}

/**
 * Get live bandwidth (iftop) - returns top bandwidth consumers
 */
async function getLiveBandwidth(ssh) {
  try {
    // iftop requires root, run for 5 seconds and parse output
    const result = await execCommand(ssh, "timeout 5 iftop -t -s 5 -n -P 2>&1 | tail -n 20");

    if (result.stdout.includes("requires root") || result.stdout.includes("permission denied")) {
      return "iftop requires root privileges";
    }

    return result.stdout || "No bandwidth data available";
  } catch (err) {
    return "iftop not installed or error: " + err.message;
  }
}

/**
 * Get Network throughput (bytes/sec)
 */
async function getNetworkSpeed(ssh) {
  try {
    const result1 = await execCommand(ssh, "cat /proc/net/dev");
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result2 = await execCommand(ssh, "cat /proc/net/dev");

    const parseDev = (out) => {
      const lines = out.split("\n");
      const stats = {};
      lines.forEach(line => {
        if (line.includes(":")) {
          const parts = line.trim().split(/\s+/);
          const name = parts[0].replace(":", "");
          stats[name] = { rx: parseInt(parts[1]), tx: parseInt(parts[9]) };
        }
      });
      return stats;
    };

    const s1 = parseDev(result1.stdout);
    const s2 = parseDev(result2.stdout);

    const speed = {};
    Object.keys(s2).forEach(iface => {
      if (s1[iface]) {
        speed[iface] = {
          rx: formatBytes(s2[iface].rx - s1[iface].rx) + "/s",
          tx: formatBytes(s2[iface].tx - s1[iface].tx) + "/s"
        };
      }
    });

    return speed;
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get disk I/O statistics
 */
async function getDiskIO(ssh) {
  try {
    const result = await execCommand(ssh, "iostat -d -x 1 1");
    if (!result.stdout) return "sysstat (iostat) not installed";

    const lines = result.stdout.split("\n");
    const startIdx = lines.findIndex(l => l.startsWith("Device"));

    if (startIdx === -1) return "No disk I/O data";

    return lines.slice(startIdx + 1).filter(l => l.trim()).map(l => {
      const parts = l.split(/\s+/);
      return {
        device: parts[0],
        tps: parts[1],
        util: parts[parts.length - 1] + "%"
      };
    });
  } catch (err) {
    return "sysstat (iostat) not installed";
  }
}

/**
 * Get system logs
 */
async function getSystemLogs(ssh, lines = 20) {
  try {
    const result = await execCommand(ssh, `tail -n ${lines} /var/log/syslog 2>/dev/null || journalctl -n ${lines}`);
    return result.stdout;
  } catch (err) {
    return "Error accessing logs: " + err.message;
  }
}

/**
 * Get internal stats for the monitor itself
 */
function getSelfHealth() {
  return {
    uptime: Math.floor(process.uptime()) + "s",
    memory: formatBytes(process.memoryUsage().rss),
    version: require('../package.json').version,
    node: process.version
  };
}

/**
 * Get all metrics - main function
 */
async function getAllMetrics(ssh, config) {
  const metrics = {
    timestamp: new Date().toISOString(),
    mode: config.mode || (ssh ? 'remote' : 'local'),
    ip: config.vps?.host || 'localhost',
    monitor: getSelfHealth()
  };

  // Gather all metrics in parallel
  const [
    cpu,
    memory,
    disks,
    dockerStats,
    allContainers,
    pm2Processes,
    topProcesses,
    services,
    networkStats,
    networkSpeed,
    diskIO,
    logs,
    security
  ] = await Promise.all([
    getCPUUsage(ssh),
    getMemoryUsage(ssh),
    getDiskUsage(ssh),
    getDockerStats(ssh),
    getAllContainers(ssh),
    getPM2Processes(ssh),
    getTopProcesses(ssh, config.monitoring?.topProcessCount || 10),
    getServiceStatus(ssh, config.monitoring?.services || ['nginx', 'docker']),
    getNetworkStats(ssh),
    getNetworkSpeed(ssh),
    getDiskIO(ssh),
    getSystemLogs(ssh, 20),
    getSecurityAlerts(ssh)
  ]);

  // Get client directory size if it exists
  metrics.client_size = await getDirectorySize(ssh, './client');

  metrics.cpu = cpu;
  metrics.memory = memory;
  metrics.disks = disks;
  metrics.docker = dockerStats;
  metrics.all_containers = allContainers;
  metrics.pm2 = pm2Processes;
  metrics.top_processes = topProcesses;
  metrics.services = services;
  metrics.network = networkStats;
  metrics.network_speed = networkSpeed;
  metrics.disk_io = diskIO;
  metrics.logs = logs;
  metrics.security_alerts = security;

  // Enhance Docker metrics with internal processes
  if (allContainers.length > 0) {
    metrics.container_processes = {};
    const runningContainers = allContainers.filter(c => c.status.toLowerCase().includes('up'));

    const procResults = await Promise.all(
      runningContainers.map(c => getContainerProcesses(ssh, c.name))
    );

    runningContainers.forEach((c, i) => {
      metrics.container_processes[c.name] = procResults[i];
    });
  }

  // Optional: Get bandwidth if enabled
  if (config.monitoring?.enableBandwidthMonitoring) {
    metrics.bandwidth = await getLiveBandwidth(ssh);
  }

  // Optional: Get container logs for high CPU containers
  if (config.monitoring?.enableContainerLogs && dockerStats.length > 0) {
    metrics.container_logs = {};
    for (const container of dockerStats) {
      if (container.cpu && parseFloat(container.cpu) > 50) {
        metrics.container_logs[container.name] = await getContainerLogs(
          ssh,
          container.name,
          config.monitoring?.containerLogLines || 50
        );
      }
    }
  }

  return metrics;
}

/**
 * Get directory size
 * @param {Object} ssh - SSH connection
 * @param {string} dirPath - Path to directory
 */
async function getDirectorySize(ssh, dirPath) {
  try {
    const command = `du -sh ${dirPath} | cut -f1`;
    const result = await execCommand(ssh, command);
    return result.stdout.trim() || "0B";
  } catch (err) {
    return "N/A";
  }
}

module.exports = {
  execCommand,
  getCPUUsage,
  getMemoryUsage,
  getDiskUsage,
  getDockerStats,
  getAllContainers,
  getContainerProcesses,
  getContainerLogs,
  getPM2Processes,
  getTopProcesses,
  getSecurityAlerts,
  getServiceStatus,
  getNetworkStats,
  getLiveBandwidth,
  getNetworkSpeed,
  getDiskIO,
  getSystemLogs,
  getDirectorySize, // Added
  getAllMetrics
};
