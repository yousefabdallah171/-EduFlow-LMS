#!/bin/bash
# Auto-fix permissions script for future files
# Run this before deployment

PROJECT_PATH="/home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online"

# Fix any files owned by root or other users
sudo chown -R youesf-abdallah-workflow-course:youesf-abdallah-workflow-course "$PROJECT_PATH"

# Fix directory permissions (755)
sudo find "$PROJECT_PATH" -type d -exec chmod 755 {} \;

# Fix file permissions
sudo find "$PROJECT_PATH" -type f ! -name "*.sh" -exec chmod 644 {} \;
sudo find "$PROJECT_PATH" -type f -name "*.sh" -exec chmod 755 {} \;

echo "✅ Permissions fixed for all files (new and old)"
