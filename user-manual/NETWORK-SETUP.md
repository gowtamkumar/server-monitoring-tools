# Network Bandwidth Setup & Fixes

## ✅ Your Network Interface: `enp5s0`

## 🔧 Quick Fixes

### Fix 1: Setup vnstat for Bandwidth Tracking

run this command to check your network interface:

```bash
sudo apt update
# sudo apt upgrade -y
```


run this command to install vnstat:

```bash
sudo apt install vnstat -y
```

```bash
# Initialize vnstat for your network interface
sudo vnstat -i enp5s0

# Enable and start vnstat service  
sudo systemctl enable vnstat
sudo systemctl start vnstat

ip link show

# Wait 2-3 minutes, then check
vnstat

# You should see something like:
# rx: 1.5 GiB  tx: 500 MiB  total: 2.0 GiB
```

After this, `npm run cli` will show proper RX/TX values instead of "N/A".

---

### Fix 2: Permission Error for iftop (Choose ONE option)

**Option A: Disable bandwidth monitoring** (Easiest)

Edit your `.env`:
```env
ENABLE_BANDWIDTH=false
```

**Option B: Run with sudo**
```bash
sudo npm start
```

**Option C: Give iftop permanent permission** (Best for production)
```bash
sudo setcap cap_net_raw,cap_net_admin=eip $(which iftop)
```

---

### Fix 3: MaxListenersExceededWarning

The warning appears when running in remote mode. It's not critical but annoying.

**Quick fix:** Add to your `.env`:
```env
# Run in local mode instead
MODE=local
```

OR restart the server (it already has the fix applied).

---

## 📝 Updated .env Configuration

```env
# Mode
MODE=local

# VPS (for remote mode)
VPS_HOST=0.0.0.0
VPS_USERNAME=root
VPS_PASSWORD=your_password

# API
API_PORT=4000

# Monitoring
SERVICES=nginx,docker
ENABLE_BANDWIDTH=false
REFRESH_INTERVAL=30000
```

---

## 🚀 Quick Test

1. **Apply fixes:**
```bash
# Setup vnstat
sudo vnstat -i enp5s0
sudo systemctl start vnstat

# Disable iftop (to avoid permission issues)
# Edit .env and set: ENABLE_BANDWIDTH=false
```

2. **Test CLI:**
```bash
npm run cli
```

3. **Test API Server:**
```bash
npm start
# Visit: http://localhost:4000
```

---

## ✅ What You Should See

**CLI Output (after vnstat setup):**
```
🌐 Network:
   Interface: enp5s0
   Total RX: 123456789     ← Should show actual data
   Total TX: 987654321     ← Should show actual data
```

**No more errors about:**
- ❌ "You don't have permission to capture"
- ❌ "MaxListenersExceededWarning"

---

## 📊 All Working Features

After applying these fixes:

- ✅ CPU monitoring
- ✅ Memory monitoring  
- ✅ Disk usage
- ✅ Docker container stats
- ✅ Service status (nginx, docker)
- ✅ Network bandwidth (via vnstat)
- ✅ Top processes
- ✅ System logs
- ✅ Web dashboard
- ✅ API endpoints

**Not working (requires sudo):**
- ⚠️ Live IP bandwidth (iftop) - Set `ENABLE_BANDWIDTH=false` or run with sudo

---

## 🎯 Recommended Configuration

For **local PC testing:**
```env
MODE=local
API_PORT=4000
ENABLE_BANDWIDTH=false
SERVICES=nginx,docker
```

For **VPS deployment:**
```env
MODE=local
API_PORT=3000
ENABLE_BANDWIDTH=true  # iftop will work with sudo or setcap
SERVICES=nginx,docker,php-fpm
```

For **remote monitoring from PC:**
```env
MODE=remote
VPS_HOST=your.vps.ip
VPS_USERNAME=root
VPS_PASSWORD=your_password
API_PORT=3000
ENABLE_BANDWIDTH=true
```

---

## 📞 Need Help?

If you're still seeing errors:

1. **Permission errors:** Set `ENABLE_BANDWIDTH=false`
2. **vnstat shows N/A:** Run `sudo vnstat -i enp5s0` and wait 2 minutes
3. **MaxListeners warning:** Use `MODE=local` or restart the server
4. **Port in use:** Change `API_PORT` in .env to 4000 or 5000

All working? Great! 🎉 You can now deploy to your VPS with:
```bash
VPS_IP=your.vps.ip ./deployment/deploy.sh
```
