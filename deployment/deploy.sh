#!/bin/bash

# VPS Monitoring Service Deployment Script
# This script deploys the monitoring service to your VPS

set -e

echo "🚀 VPS Monitoring Service Deployment"
echo "======================================"

# Configuration
VPS_IP="${VPS_IP:-}"
VPS_USER="${VPS_USER:-root}"
INSTALL_DIR="/opt/vps-monitor"
API_PORT="${API_PORT:-3000}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if VPS_IP is set
if [ -z "$VPS_IP" ]; then
    print_error "VPS_IP not set!"
    echo ""
    echo "Usage:"
    echo "  VPS_IP=your.server.ip ./deploy.sh"
    echo ""
    echo "Optional:"
    echo "  VPS_USER=username (default: root)"
    echo "  API_PORT=3000 (default: 3000)"
    exit 1
fi

print_info "Target VPS: $VPS_IP"
print_info "User: $VPS_USER"
print_info "Install directory: $INSTALL_DIR"

# Step 1: Check SSH connection
echo ""
print_info "Step 1: Testing SSH connection..."
if ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    print_success "SSH connection successful"
else
    print_error "Cannot connect to VPS via SSH"
    exit 1
fi

# Step 2: Install Node.js if not present
echo ""
print_info "Step 2: Checking Node.js..."
ssh "$VPS_USER@$VPS_IP" << 'ENDSSH'
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node --version
ENDSSH
print_success "Node.js is installed"

# Step 3: Install required monitoring tools
echo ""
print_info "Step 3: Installing monitoring tools (htop, iftop, vnstat, sysstat)..."
ssh "$VPS_USER@$VPS_IP" << 'ENDSSH'
sudo apt-get update -qq
sudo apt-get install -y htop iftop nload vnstat sysstat > /dev/null 2>&1
ENDSSH
print_success "Monitoring tools installed"

# Step 4: Create install directory
echo ""
print_info "Step 4: Creating install directory..."
ssh "$VPS_USER@$VPS_IP" "sudo mkdir -p $INSTALL_DIR"
print_success "Directory created"

# Step 5: Copy files to VPS
echo ""
print_info "Step 5: Copying files to VPS..."
# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Create temporary archive
cd "$PROJECT_DIR"
tar czf /tmp/vps-monitor.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    package.json \
    index.js \
    server.js \
    config.js \
    lib/

# Copy to VPS
scp /tmp/vps-monitor.tar.gz "$VPS_USER@$VPS_IP:/tmp/"
ssh "$VPS_USER@$VPS_IP" "cd $INSTALL_DIR && sudo tar xzf /tmp/vps-monitor.tar.gz"
rm /tmp/vps-monitor.tar.gz
print_success "Files copied"

# Step 6: Configure environment
echo ""
print_info "Step 6: Configuring environment..."
ssh "$VPS_USER@$VPS_IP" << ENDSSH
cat > $INSTALL_DIR/.env << 'EOF'
MODE=local
API_PORT=$API_PORT
ENABLE_BANDWIDTH=true
SERVICES=nginx,docker
REFRESH_INTERVAL=30000
EOF
ENDSSH
print_success "Environment configured"

# Step 7: Install dependencies
echo ""
print_info "Step 7: Installing dependencies..."
ssh "$VPS_USER@$VPS_IP" "cd $INSTALL_DIR && sudo npm install --production"
print_success "Dependencies installed"

# Step 8: Install systemd service
echo ""
print_info "Step 8: Installing systemd service..."
scp "$SCRIPT_DIR/vps-monitor.service" "$VPS_USER@$VPS_IP:/tmp/"
ssh "$VPS_USER@$VPS_IP" << 'ENDSSH'
sudo mv /tmp/vps-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vps-monitor
sudo systemctl restart vps-monitor
ENDSSH
print_success "Service installed and started"

# Step 9: Check service status
echo ""
print_info "Step 9: Checking service status..."
sleep 2
ssh "$VPS_USER@$VPS_IP" "sudo systemctl status vps-monitor --no-pager | head -n 10"

# Final message
echo ""
echo "======================================"
print_success "Deployment complete!"
echo ""
print_info "Service is running on: http://$VPS_IP:$API_PORT"
print_info "API endpoint: http://$VPS_IP:$API_PORT/api/metrics"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status vps-monitor    # Check status"
echo "  sudo systemctl restart vps-monitor   # Restart service"
echo "  sudo systemctl stop vps-monitor      # Stop service"
echo "  sudo journalctl -u vps-monitor -f    # View logs"
echo ""
