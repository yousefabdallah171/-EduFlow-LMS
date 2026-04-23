#!/bin/bash

DEPLOY_PATH="/home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online"
BACKEND_PATH="$DEPLOY_PATH/backend"
LOG_FILE="$DEPLOY_PATH/logs/deploy.log"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

echo "=== Deployment started at $(date) ===" >> "$LOG_FILE"

# Install backend dependencies
echo "Installing backend dependencies..." >> "$LOG_FILE"
cd "$BACKEND_PATH"
npm install >> "$LOG_FILE" 2>&1

# Run Prisma migrations
echo "Running database migrations..." >> "$LOG_FILE"
npx prisma migrate deploy >> "$LOG_FILE" 2>&1

# Kill old backend process
echo "Stopping old backend process..." >> "$LOG_FILE"
pkill -f "node.*backend" 2>/dev/null || true
sleep 2

# Start backend
echo "Starting backend on port 3008..." >> "$LOG_FILE"
cd "$BACKEND_PATH"
nohup npm run start > /dev/null 2>&1 &

# Wait for backend to start
sleep 3

# Reload nginx (ignore errors)
echo "Reloading nginx..." >> "$LOG_FILE"
sudo systemctl reload nginx >> "$LOG_FILE" 2>&1 || echo "Nginx reload skipped (may require manual reload)" >> "$LOG_FILE"

echo "=== Deployment completed at $(date) ===" >> "$LOG_FILE"
exit 0
