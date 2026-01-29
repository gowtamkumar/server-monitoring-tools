# VPS Monitoring - Quick Start Guide

## 📋 Both Files Are Correct - Here's the Difference:

### 1️⃣ `index.js` - CLI Tool (Command Line)
**Use this for:** One-time checks or continuous monitoring in terminal

```bash
# Run once and see metrics
npm run cli

# OR directly:
node index.js
```

**Features:**
- ✅ Quick one-time server check
- ✅ Display metrics in terminal
- ✅ Watch mode (continuous monitoring)
- ✅ JSON output option

---

### 2️⃣ `server.js` - API Server (Web Dashboard)
**Use this for:** Running a persistent web service with API

```bash
# Start the API server
npm start

# OR directly:
node server.js
```

**Then visit:** http://localhost:3000

**Features:**
- ✅ Web dashboard interface
- ✅ REST API endpoints
- ✅ Runs continuously as a service
- ✅ Multiple API endpoints for different metrics

---

## 🚀 How to Run (Step by Step)

### Option A: Quick Terminal Check (CLI Mode)

1. **Configure .env file:**
```bash
MODE=remote
VPS_HOST=your.vps.ip
VPS_USERNAME=root
VPS_PASSWORD=your_password
```

2. **Run the CLI tool:**
```bash
# See all metrics once
npm run cli

# OR watch continuously (refreshes every 30 seconds)
npm run cli:watch

# OR get JSON output
npm run cli:json
```

---

### Option B: Web Dashboard (API Server Mode)

1. **Configure .env file** (same as above)

2. **Start the server:**
```bash
npm start
```

3. **Open browser:**
```
http://localhost:3000
```

4. **Access API endpoints:**
```bash
# All metrics
curl http://localhost:3000/api/metrics

# Just CPU
curl http://localhost:3000/api/metrics/cpu

# Just Docker
curl http://localhost:3000/api/metrics/docker

# Service status
curl http://localhost:3000/api/metrics/services
```

---

## 🖥️ Testing on Your Local PC

**Monitor local system instead of VPS:**

```bash
# CLI mode - local monitoring
MODE=local npm run cli

# API server - local monitoring
MODE=local npm start
```

Then visit: http://localhost:3000

---

## 🌐 VPS Deployment

**Deploy to your VPS server:**

```bash
# Automated deployment
VPS_IP=your.vps.ip ./deployment/deploy.sh
```

**After deployment, access:**
```
http://your.vps.ip:3000
```

**Manage the service:**
```bash
# Check status
sudo systemctl status vps-monitor

# Restart
sudo systemctl restart vps-monitor

# View logs
sudo journalctl -u vps-monitor -f
```

---

## 📝 Configuration (.env file)

Create a `.env` file in the project root:

```env
# Mode: 'remote' (SSH to VPS) or 'local' (monitor local system)
MODE=remote

# VPS Credentials (required for remote mode)
VPS_HOST=your.vps.ip
VPS_USERNAME=root
VPS_PASSWORD=your_password

# API Server Settings
API_PORT=3000
API_KEY=

# Monitoring Options
SERVICES=nginx,docker
ENABLE_BANDWIDTH=true
REFRESH_INTERVAL=30000
```

Copy from example:
```bash
cp .env.example .env
# Then edit .env with your values
```

---

## 🎯 Which One Should You Use?

| Use Case | Use This | Command |
|----------|----------|---------|
| Quick server check | `index.js` | `npm run cli` |
| Continuous terminal monitoring | `index.js` | `npm run cli:watch` |
| Web dashboard | `server.js` | `npm start` |
| API for other tools | `server.js` | `npm start` |
| VPS deployment | `server.js` | Deploy script |

---

## 🔧 All Available Commands

```bash
# CLI Tool
npm run cli              # Run once, display metrics
npm run cli:watch        # Continuous monitoring
npm run cli:json         # JSON output
node index.js --help     # Show help

# API Server
npm start                # Start API server
npm run server           # Same as above
npm run dev              # Development mode (auto-restart)

# Deployment
./deployment/deploy.sh   # Deploy to VPS
```

---

## 📊 Available API Endpoints

When running `server.js`:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Web dashboard |
| `GET /health` | Health check |
| `GET /api/metrics` | All metrics |
| `GET /api/metrics/cpu` | CPU usage |
| `GET /api/metrics/memory` | Memory stats |
| `GET /api/metrics/disk` | Disk usage |
| `GET /api/metrics/docker` | Docker containers |
| `GET /api/metrics/network` | Network stats |
| `GET /api/metrics/services` | Service status |
| `GET /api/metrics/pm2` | PM2 processes |
| `GET /api/metrics/logs` | System logs |

---

## ❓ Troubleshooting

**Error: "VPS credentials not configured"**
- Make sure you created `.env` file
- Check VPS_HOST, VPS_USERNAME, VPS_PASSWORD are set

**Error: "Port already in use"**
- Change API_PORT in `.env` to a different port (e.g., 3001)
- OR kill existing process: `sudo lsof -ti:3000 | xargs kill`

**Error: "Cannot connect to VPS"**
- Verify SSH access: `ssh username@your.vps.ip`
- Check VPS firewall settings

---

## 💡 Quick Examples

**Example 1: Check your VPS from your PC**
```bash
# Edit .env
MODE=remote
VPS_HOST=123.45.67.89
VPS_USERNAME=root
VPS_PASSWORD=yourpass

# Run
npm run cli
```

**Example 2: Run dashboard on your PC**
```bash
# Edit .env
MODE=local
API_PORT=3000

# Start server
npm start

# Visit http://localhost:3000
```

**Example 3: Deploy to VPS**
```bash
VPS_IP=123.45.67.89 ./deployment/deploy.sh
# Visit http://123.45.67.89:3000
```

---

## 📚 More Help

- Full documentation: [README.md](file:///home/gowtam/Desktop/gowtam/javascript/devops/server/README.md)
- Example config: [.env.example](file:///home/gowtam/Desktop/gowtam/javascript/devops/server/.env.example)
- Deployment guide: See README.md "VPS Deployment" section

---

## Summary

✅ **For quick checks:** Use `index.js` with `npm run cli`  
✅ **For web dashboard:** Use `server.js` with `npm start`  
✅ **Both are correct** - they do different things!
