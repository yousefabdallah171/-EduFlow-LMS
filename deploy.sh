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

# Build TypeScript
echo "Building backend..." >> "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1

# Run Prisma migrations
echo "Running database migrations..." >> "$LOG_FILE"
npx prisma migrate deploy >> "$LOG_FILE" 2>&1

# Start/Restart backend with PM2
echo "Starting backend with PM2 on port 3008..." >> "$LOG_FILE"
pm2 restart eduflow-backend >> "$LOG_FILE" 2>&1 || pm2 start "node dist/src/server.js" --name eduflow-backend --cwd "$BACKEND_PATH" >> "$LOG_FILE" 2>&1

# Save PM2 configuration for autostart
pm2 save >> "$LOG_FILE" 2>&1

# Wait for backend to start
sleep 3

echo "=== Deployment completed at $(date) ===" >> "$LOG_FILE"
exit 0
