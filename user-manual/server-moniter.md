# VPS Server Monitoring – Clear Step‑by‑Step Guide

This document explains **how to monitor your VPS server completely** (CPU, RAM, Disk, Network, Docker, Services) in a **simple and professional way**.

---

## 1. Purpose of Monitoring

Monitoring helps you:

- Detect high CPU/RAM usage
- Find bandwidth abuse
- Identify failing services (NGINX, Docker)
- Reduce VPS cost and downtime

---

## 2. Required Tools (Install Once)

Run the following command:

```bash
sudo apt update
sudo apt install htop iftop nload vnstat sysstat -y
```

### Tool Meaning

| Tool   | Purpose                      |
| ------ | ---------------------------- |
| htop   | CPU, RAM, process monitoring |
| iftop  | Live bandwidth per IP        |
| nload  | Total network usage          |
| vnstat | Daily / monthly bandwidth    |
| iostat | Disk I/O performance         |

---

## 3. Basic Monitoring Commands (Daily Use)

### 3.1 CPU & Memory

```bash
htop
```

Check:

- CPU should stay below 80%
- RAM should not be fully used

---

### 3.2 Disk Usage

```bash
df -h
```

Alert if disk usage > 80%

---

### 3.3 Disk Performance (Slow Server Check)

```bash
iostat -x 1
```

---

## 4. Network & Bandwidth Monitoring

### 4.1 Live Bandwidth (Root Required)

```bash
sudo iftop
```

Use this to see **which IP or container uses bandwidth**

---

### 4.2 Total Network Speed

```bash
nload
```

---

### 4.3 Monthly Bandwidth (IMPORTANT for Contabo)

```bash
vnstat
```

---

## 5. Service Monitoring

### 5.1 NGINX Status

```bash
systemctl status nginx
```

### 5.3 Docker Status

```bash
systemctl status docker
docker ps
```

---

## 6. Docker Resource Monitoring

```bash
docker stats
```

Check:

- Container CPU usage
- Memory leaks
- Network usage

---

## 7. Log Monitoring (When Errors Occur)

### 7.1 System Logs

```bash
journalctl -xe
```

### 7.3 NGINX Error Logs

```bash
tail -f /var/log/nginx/error.log
```

---

## 8. Real‑Time Dashboard Monitoring (Recommended)

### Install Netdata

```bash
bash <(curl -L https://my-netdata.io/kickstart.sh)
```

### Access Dashboard

```
http://YOUR_SERVER_IP:19999
```

Netdata shows:

- CPU, RAM, Disk
- Network traffic
- Docker containers
- NGINX
- Alerts

---

## 9. External Uptime Monitoring

Use one external service:

- UptimeRobot
- BetterUptime

Monitor:

- Website (HTTP/HTTPS)
- API health endpoint
- SSH

---

## 10. Recommended Monitoring Routine

### Daily

```bash
htop
df -h
vnstat
```

### When Server is Slow

```bash
sudo iftop
docker stats
journalctl -xe
```

---

## 11. Minimum Professional Setup (Final Recommendation)

✔ Netdata (real‑time dashboard)
✔ htop (CLI monitoring)
✔ vnstat (bandwidth tracking)
✔ docker stats (container usage)
✔ UptimeRobot (downtime alerts)

---

## 12. Summary

This setup gives you:

- Full VPS visibility
- Bandwidth control
- Early failure detection
- Production‑ready monitoring

---

If needed, this setup can be extended with **Grafana + Prometheus** for enterprise‑level monitoring.

---

## 13. Deep Dive: Internal Container Monitoring (Advanced)

Sometimes `docker stats` is not enough. You need to look **inside** the container.

### 13.1 Check Container Processes
To identify exactly WHICH process inside a container is eating CPU:

```bash
docker top <container_name>
```

**Example Output:**
```
UID   PID   PPID  C  STIME  TIME      CMD
root  123   456   0  14:00  00:00:01  node index.js
root  789   123   55 14:05  13:23:11  /var/Sofia s.x86  <-- SUSPICIOUS!
```

### 13.2 Check Container Logs (Tail)
If a container is using high CPU, it might be stuck in an error loop.

```bash
docker logs --tail 100 <container_name>
```

### 13.3 Inspect Suspicious Files
If you see a weird process (like `/var/Sofia`), check it:

```bash
docker exec -it <container_name> ls -l /var/Sofia
```

> **Real-World Case**: We found `somoypurbapar_client_app` using 55% CPU due to a `next-server` logging loop and a hidden suspicious process `/var/Sofia`. Always investigate high CPU usage immediately!

