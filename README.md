# VPS Monitoring Tool

A comprehensive server monitoring solution for VPS with CLI and API interfaces. Monitor CPU, memory, disk, network, Docker containers, PM2 processes, and system services.

## Features

- ✅ **Dual Mode Support**: Remote (SSH) or Local execution
- 🖥️ **System Metrics**: CPU, RAM, disk usage, disk I/O
- 🐳 **Docker Monitoring**: Container stats, logs, internal processes
- 🔄 **PM2 Integration**: Process monitoring and statistics
- 🌐 **Network Stats**: vnstat, iftop, bandwidth monitoring
- ⚙️ **Service Status**: NGINX, Docker, PHP-FPM, custom services
- 📊 **API Server**: RESTful endpoints for all metrics
- 🎨 **Web Dashboard**: Beautiful web interface
- 📝 **System Logs**: Real-time log monitoring

## Installation

```bash
# Clone or download this project
cd server

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
# Execution mode: 'remote' (SSH to VPS) or 'local' (run on VPS)
MODE=remote

# VPS credentials (required for remote mode)
VPS_HOST=your.vps.ip
VPS_USERNAME=root
VPS_PASSWORD=your_password

# API server settings
API_PORT=3000
API_KEY=optional_secret_key

# Monitoring configuration
SERVICES=nginx,docker,php-fpm
ENABLE_BANDWIDTH=true
ENABLE_CONTAINER_LOGS=true
REFRESH_INTERVAL=30000
TOP_PROCESS_COUNT=10
CONTAINER_LOG_LINES=50
```

## Usage

### CLI Mode

**Basic Usage:**
```bash
# Run once and display metrics
npm run cli

# Output in JSON format
npm run cli:json

# Continuous monitoring (refresh every 30s)
npm run cli:watch

# Show help
node index.js --help
```

**Local Monitoring:**
```bash
# Monitor the local system instead of remote VPS
MODE=local npm run cli
```

### API Server Mode

**Start the API server:**
```bash
npm start
# or
npm run server
```

**Development mode (auto-restart):**
```bash
npm run dev
```

**Access the dashboard:**
```
http://localhost:3000
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Web dashboard |
| `GET /health` | Health check |
| `GET /api/metrics` | All metrics |
| `GET /api/metrics/cpu` | CPU usage & top processes |
| `GET /api/metrics/memory` | Memory statistics |
| `GET /api/metrics/disk` | Disk usage & I/O |
| `GET /api/metrics/docker` | Docker containers & logs |
| `GET /api/metrics/network` | Network statistics |
| `GET /api/metrics/services` | Service status |
| `GET /api/metrics/pm2` | PM2 processes |
| `GET /api/metrics/logs` | System logs |

**Query Parameters:**
- `?refresh=true` - Force refresh cached data
- `?apiKey=your_key` - API key authentication (if enabled)

**Example Usage:**
```bash
# Get all metrics
curl http://localhost:3000/api/metrics

# Get CPU metrics with authentication
curl -H "X-API-Key: your_secret_key" http://localhost:3000/api/metrics/cpu

# Force refresh
curl http://localhost:3000/api/metrics?refresh=true
```

## VPS Deployment

### Option 1: Automated Deployment

Use the deployment script to automatically deploy to your VPS:

```bash
VPS_IP=your.vps.ip ./deployment/deploy.sh
```

Optional environment variables:
```bash
VPS_IP=your.vps.ip VPS_USER=root API_PORT=3000 ./deployment/deploy.sh
```

This script will:
1. Check SSH connection
2. Install Node.js (if needed)
3. Install monitoring tools (htop, iftop, vnstat, sysstat)
4. Copy project files
5. Install dependencies
6. Configure systemd service
7. Start the monitoring service

### Option 2: Manual Deployment

1. **Install required tools on VPS:**
```bash
ssh root@your.vps.ip
sudo apt update
sudo apt install htop iftop nload vnstat sysstat nodejs npm -y
```

2. **Copy files to VPS:**
```bash
# On your PC
scp -r ./* root@your.vps.ip:/opt/vps-monitor/
```

3. **Install dependencies on VPS:**
```bash
ssh root@your.vps.ip
cd /opt/vps-monitor
npm install --production
```

4. **Configure environment:**
```bash
cat > /opt/vps-monitor/.env << EOF
MODE=local
API_PORT=3000
SERVICES=nginx,docker
EOF
```

5. **Install systemd service:**
```bash
sudo cp deployment/vps-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vps-monitor
sudo systemctl start vps-monitor
```

6. **Check status:**
```bash
sudo systemctl status vps-monitor
```

### Managing the Service

```bash
# Check status
sudo systemctl status vps-monitor

# Start/Stop/Restart
sudo systemctl start vps-monitor
sudo systemctl stop vps-monitor
sudo systemctl restart vps-monitor

# View logs
sudo journalctl -u vps-monitor -f

# Disable auto-start
sudo systemctl disable vps-monitor
```

## Required VPS Tools

The monitoring system requires these tools on the VPS:

| Tool | Purpose | Install Command |
|------|---------|----------------|
| `htop` | CPU/RAM monitoring | `sudo apt install htop` |
| `iftop` | Live bandwidth per IP | `sudo apt install iftop` |
| `nload` | Network usage | `sudo apt install nload` |
| `vnstat` | Daily/monthly bandwidth | `sudo apt install vnstat` |
| `sysstat` (iostat) | Disk I/O | `sudo apt install sysstat` |
| `docker` | Container stats | [Docker docs](https://docs.docker.com/engine/install/) |

**Quick install all:**
```bash
sudo apt update
sudo apt install htop iftop nload vnstat sysstat -y
```

## Architecture

```
server/
├── index.js              # CLI tool
├── server.js             # API server
├── config.js             # Configuration
├── lib/
│   └── monitoring.js     # Modular monitoring functions
├── deployment/
│   ├── deploy.sh         # Automated deployment script
│   └── vps-monitor.service  # Systemd service file
├── package.json
├── .env                  # Environment variables
└── README.md
```

## Security Considerations

1. **API Key Authentication**: Set `API_KEY` in `.env` to protect endpoints
2. **Firewall**: Restrict API port access:
   ```bash
   sudo ufw allow from trusted.ip.address to any port 3000
   ```
3. **SSH Keys**: Use SSH keys instead of passwords for remote monitoring
4. **Root Access**: `iftop` requires root/sudo privileges for bandwidth monitoring

## Troubleshooting

### CLI Issues

**Error: Cannot connect to VPS**
- Check VPS_HOST, VPS_USERNAME, VPS_PASSWORD in `.env`
- Verify SSH access: `ssh username@your.vps.ip`

### API Server Issues

**Port already in use**
- Change API_PORT in `.env`
- Kill existing process: `sudo lsof -ti:3000 | xargs kill`

**vnstat not installed**
- Install: `sudo apt install vnstat`
- Initialize: `sudo vnstat -i eth0` (replace eth0 with your network interface)

**iftop requires root**
- Run server with sudo: `sudo npm start`
- Or configure capabilities: `sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/iftop`

### Service Issues

**Service fails to start**
```bash
# Check logs
sudo journalctl -u vps-monitor -n 50

# Check syntax
node /opt/vps-monitor/server.js

# Fix permissions
sudo chown -R root:root /opt/vps-monitor
```

## Development

**Run in development mode:**
```bash
npm run dev  # Auto-restarts on file changes
```

**Test locally:**
```bash
# Test CLI
MODE=local npm run cli

# Test API server
MODE=local npm start
```

## Performance

- **CPU Impact**: < 1% CPU usage
- **Memory**: ~50-100MB RAM
- **Network**: Minimal (only SSH for remote mode)
- **Caching**: 30-second cache by default (configurable)

## License

MIT

## Contributing

Feel free to submit issues and pull requests.

## Support

For issues related to specific monitoring tools, refer to:
- [vnstat documentation](https://humdi.net/vnstat/)
- [Docker documentation](https://docs.docker.com/)
- [PM2 documentation](https://pm2.keymetrics.io/)
