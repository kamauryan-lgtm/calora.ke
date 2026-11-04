#!/usr/bin/env bash
# ==============================================================================
# CALORA - Automated DigitalOcean Droplet Deployment Script
# Targets: Ubuntu 22.04 / 24.04 LTS
# Sets up Docker, clones CALORA, builds the image, and launches the container.
# ==============================================================================

set -e

echo "=== [1/5] Updating system packages ==="
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git curl ufw

echo "=== [2/5] Installing Docker ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh
    sudo usermod -aG docker "$USER"
fi

echo "=== [3/5] Setting up Firewall ==="
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

echo "=== [4/5] Deploying CALORA Container ==="
APP_DIR="/opt/calora"
if [ ! -d "$APP_DIR" ]; then
    sudo git clone https://github.com/kamauryan-lgtm/calora.ke.git "$APP_DIR"
else
    cd "$APP_DIR"
    sudo git pull origin main
fi

cd "$APP_DIR"

# Stop existing container if running
sudo docker stop calora-app 2>/dev/null || true
sudo docker rm calora-app 2>/dev/null || true

# Build Docker image
sudo docker build -t calora:latest .

# Run container on port 80 (HTTP)
sudo docker run -d \
    --name calora-app \
    --restart unless-stopped \
    -p 80:8000 \
    -e PORT=8000 \
    calora:latest

echo "=== [5/5] Verification ==="
sleep 3
if curl -s http://localhost:80/api/health | grep -q "healthy"; then
    PUBLIC_IP=$(curl -s https://ifconfig.me || hostname -I | awk '{print $1}')
    echo ""
    echo "============================================================"
    echo " [SUCCESS] CALORA is running live on your Droplet!"
    echo " URL: http://${PUBLIC_IP}"
    echo " Health Check: http://${PUBLIC_IP}/api/health"
    echo " Docs: http://${PUBLIC_IP}/docs"
    echo "============================================================"
else
    echo "[WARNING] Health check failed. Check logs with: docker logs calora-app"
fi
