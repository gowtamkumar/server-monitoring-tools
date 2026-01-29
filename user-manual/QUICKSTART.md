# 🚀 Quick Start Guide - VPS Monitoring

## 📖 What This Does

Monitor your VPS server (or local PC) for:

- CPU, RAM, Disk usage
- Docker containers
- Services (nginx, docker)
- Network bandwidth
- System logs

---

## ⚡ 3 Simple Steps to Start

### Step 1: Setup `.env` File

Create/edit `.env` in project folder:

```env
MODE=local
API_PORT=4000
ENABLE_BANDWIDTH=false
SERVICES=nginx,docker
```

**That's it for local testing!**

For VPS remote monitoring, add:

```env
MODE=remote
VPS_HOST=your.vps.ip.address
VPS_USERNAME=root
VPS_PASSWORD=your_password
```

---

### Step 2: Choose What to Run

**Option A: Quick Terminal Check (CLI)**

```bash
npm run cli
```

Shows all metrics once in your terminal.

**Option B: Web Dashboard (Server)**

```bash
npm start
```

Then open browser: **http://localhost:4000**

---

### Step 3: That's It!

Your monitoring is running! 🎉

---

## 🎯 Common Uses

### 1. Monitor Local PC

```bash
# Edit .env
MODE=local
API_PORT=4000

# Run
npm start
```

Visit: http://localhost:4000

### 2. Monitor Remote VPS (from your PC)

```bash
# Edit .env
MODE=remote
VPS_HOST=0.0.0.0
VPS_USERNAME=root
VPS_PASSWORD=yourpass

# Run
npm start
```

Visit: http://localhost:4000

### 3. Deploy to VPS Server

```bash
VPS_IP=0.0.0.0 ./deployment/deploy.sh
```

Visit: http://0.0.0.0:3000

---

## 📊 Available Commands

```bash
npm run cli         # Quick check in terminal
npm run cli:watch   # Continuous monitoring
npm start           # Web dashboard
npm run cli:json    # JSON output
```

---

## 🌐 API Endpoints

When running `npm start`, access:

| What        | URL                                        |
| ----------- | ------------------------------------------ |
| Dashboard   | http://localhost:4000                      |
| All metrics | http://localhost:4000/api/metrics          |
| CPU only    | http://localhost:4000/api/metrics/cpu      |
| Memory only | http://localhost:4000/api/metrics/memory   |
| Docker      | http://localhost:4000/api/metrics/docker   |
| Services    | http://localhost:4000/api/metrics/services |
| Network     | http://localhost:4000/api/metrics/network  |

---

## ⚙️ Configuration (.env)

### Basic Config (Local PC)

```env
MODE=local
API_PORT=4000
ENABLE_BANDWIDTH=false
```

### Remote VPS Config

```env
MODE=remote
VPS_HOST=your.vps.ip
VPS_USERNAME=root
VPS_PASSWORD=your_password
API_PORT=4000
ENABLE_BANDWIDTH=false
```

### Full Config

```env
# Mode: 'local' or 'remote'
MODE=local

# VPS Connection (for remote mode)
VPS_HOST=0.0.0.0
VPS_USERNAME=root
VPS_PASSWORD=your_password

# API Server
API_PORT=4000
API_KEY=                    # Optional, leave empty for no auth
ENABLE_CORS=true
REFRESH_INTERVAL=30000      # 30 seconds

# Monitoring
SERVICES=nginx,docker       # Services to check
ENABLE_BANDWIDTH=false      # Set true if you run with sudo
TOP_PROCESS_COUNT=10
```

---

## 🔧 Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::4000`

**Fix:** Change port in `.env`:

```env
API_PORT=5000
```

### Permission Error (Network)

**Error:** `You don't have permission to capture`

**Fix:** Set in `.env`:

```env
ENABLE_BANDWIDTH=false
```

Or run with sudo:

```bash
sudo npm start
```

### MaxListenersExceededWarning

**Solution:** Just ignore it, or use local mode:

```env
MODE=local
```

### Can't Connect to VPS

**Check:**

1. VPS_HOST is correct IP
2. VPS_USERNAME is correct (usually 'root')
3. VPS_PASSWORD is correct
4. Test SSH: `ssh username@vps_ip`

---

## 📝 Examples

### Example 1: Monitor Your Local PC

```bash
# 1. Edit .env
echo "MODE=local
API_PORT=4000
ENABLE_BANDWIDTH=false" > .env

# 2. Start server
npm start

# 3. Open browser
# http://localhost:4000
```

### Example 2: Check Remote VPS

```bash
# 1. Edit .env with your VPS details
MODE=remote
VPS_HOST=0.0.0.0
VPS_USERNAME=root
VPS_PASSWORD=mypassword
API_PORT=4000

# 2. Run CLI
npm run cli

# 3. Or web dashboard
npm start
```

### Example 3: Deploy to VPS

```bash
# One command deployment
VPS_IP=0.0.0.0 ./deployment/deploy.sh

# Access from anywhere
# http://0.0.0.0:3000
```

---

## ✅ What You'll See

### CLI Output

```
================================================================================
🖥️  VPS MONITORING DASHBOARD - LOCAL MODE
📍 Server: localhost
🕒 Timestamp: 2026-01-01T15:00:00.000Z
================================================================================

📊 CPU Usage: 25.5%

💾 Memory:
   Total: 16000MB
   Used:  8000MB
   Free:  8000MB

💿 Disk Usage:
   /: 100G/200G (50%)

⚙️  Services:
   ✅ nginx: active
   ✅ docker: active

🐳 Docker Containers:
   my-app: CPU 5.2%, Mem 500MB
```

### Web Dashboard

Beautiful interface with:

- ✅ System status
- ✅ All metrics
- ✅ API endpoints
- ✅ Real-time data

---

## 🎓 Next Steps

1. **Learn More:**

   - Full docs: `README.md`
   - Network setup: `NETWORK-SETUP.md`
   - Usage guide: `USAGE.md`

2. **Deploy to Production:**

   ```bash
   VPS_IP=your.ip ./deployment/deploy.sh
   ```

3. **Customize Monitoring:**

   - Edit `SERVICES=` in `.env`
   - Add more services: `mysql,postgresql,redis`

4. **Secure Access:**
   - Set `API_KEY=` in `.env`
   - Configure firewall on VPS

---

## 🆘 Need Help?

**Quick fixes:**

- Port error → Change `API_PORT` in `.env`
- Permission error → Set `ENABLE_BANDWIDTH=false`
- Can't connect → Check VPS credentials
- Warning messages → Ignore or use `MODE=local`

**Docs:**

- `README.md` - Complete documentation
- `USAGE.md` - Detailed usage guide
- `NETWORK-SETUP.md` - Network troubleshooting

---

## 🎉 You're Ready!

```bash
# Start monitoring now:
npm start

# Visit:
http://localhost:4000
```

Enjoy your server monitoring! 🚀
