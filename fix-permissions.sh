#!/bin/bash
# Auto-fix permissions script for future files
# Run this before deployment

PROJECT_PATH="/home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online"

# Fix directory permissions (755) - non-critical if fails
find "$PROJECT_PATH" -type d -exec chmod 755 {} \; 2>/dev/null || true

# Fix file permissions - non-critical if fails
find "$PROJECT_PATH" -type f ! -name "*.sh" -exec chmod 644 {} \; 2>/dev/null || true
find "$PROJECT_PATH" -type f -name "*.sh" -exec chmod 755 {} \; 2>/dev/null || true

echo "✅ Permissions optimized (non-critical)"
