#!/bin/bash
# ==============================================================================
# Automated Deployment Script for Kerala Wood Billing
# Domain: keralawoods-billing.gemshine.tech | Backend Port: 5031
# Usage: ./deploy.sh
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="keralawood-billing-api"

echo "=================================================="
echo "🚀 Starting Deployment for Kerala Wood Billing..."
echo "📂 Working Directory: $APP_DIR"
echo "⏰ Time: $(date)"
echo "=================================================="

cd "$APP_DIR"

# 1. Ensure logs directory exists
mkdir -p logs

# 2. Pull latest code from GitHub
echo "⬇️  Pulling latest code from origin main..."
git fetch origin main
git reset --hard origin/main

# 3. Install root dependencies
echo "📦 Installing Node dependencies..."
npm install

# 4. Build Vite Frontend for production
echo "🔨 Building Vite Frontend..."
npm run build

# 5. Fix permissions so Nginx (www-data) can read dist assets
echo "🔒 Setting permissions for Nginx..."
chmod 755 "$APP_DIR"
chmod -R 755 "$APP_DIR/dist"
chown -R www-data:www-data "$APP_DIR/dist" 2>/dev/null || true

# 6. Reload or Start PM2 Backend Process
echo "⚙️  Updating PM2 Backend Process ($APP_NAME on port 5031)..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    echo "🔄 Reloading existing PM2 process..."
    pm2 reload ecosystem.config.cjs --env production
else
    echo "▶️  Starting new PM2 process..."
    pm2 start ecosystem.config.cjs --env production
fi

# Save PM2 process list so it restarts on VPS reboot
pm2 save

# 7. Test and Reload Nginx
echo "🌐 Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "=================================================="
echo "✅ Deployment Completed Successfully!"
echo "🌐 Domain: https://keralawoods-billing.gemshine.tech"
echo "🔌 API: http://127.0.0.1:5031/api"
echo "📊 PM2 Status:"
pm2 status "$APP_NAME"
echo "=================================================="
