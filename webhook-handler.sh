#!/usr/bin/env bash

#
# GitHub Webhook Handler for Auto-Deployment
# Listens on port 9000 for GitHub webhook events
# On push to main, automatically runs deploy-local.sh
#

DEPLOY_DIR="/home/youesf-abdallah-workflow-course/htdocs/workflow-course.youesf-abdallah.online"
WEBHOOK_SECRET="your-secret-here"  # Change this to a random string
WEBHOOK_PORT=9000
LOG_FILE="/tmp/webhook-deploy.log"

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"
}

verify_signature() {
  local payload="$1"
  local signature="$2"
  local expected_signature="sha256=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

  if [[ "$signature" == "$expected_signature" ]]; then
    return 0
  else
    log "❌ Signature verification failed"
    return 1
  fi
}

handle_webhook() {
  local payload="$1"
  local ref=$(echo "$payload" | grep -o '"ref":"[^"]*"' | cut -d'"' -f4 | head -1)

  log "📩 Webhook received"
  log "   Ref: $ref"

  # Only deploy if push is to main branch
  if [[ "$ref" == "refs/heads/main" ]]; then
    log "🚀 Push to main detected - starting deployment..."
    cd "$DEPLOY_DIR"

    # Run deployment in background so webhook returns immediately
    (
      log "▶️ Running deploy-local.sh..."
      ./deploy-local.sh >> "$LOG_FILE" 2>&1
      if [[ $? -eq 0 ]]; then
        log "✅ Deployment successful!"
      else
        log "❌ Deployment failed!"
      fi
    ) &

    echo "OK"
  else
    log "⏭️ Ignoring push to $ref (not main)"
    echo "OK"
  fi
}

# Start webhook server
log "Starting webhook listener on port $WEBHOOK_PORT..."
log "Waiting for GitHub webhooks..."

while true; do
  {
    read -r method path protocol

    # Read headers
    declare -A headers
    while read -r header; do
      [[ -z "$header" ]] && break
      key="${header%%:*}"
      value="${header#*: }"
      headers["${key,,}"]="$value"
    done

    # Read body
    content_length="${headers[content-length]}"
    if [[ -n "$content_length" && "$content_length" -gt 0 ]]; then
      read -r -N "$content_length" body
    fi

    # Handle POST to /webhook
    if [[ "$method" == "POST" && "$path" == "/webhook" ]]; then
      signature="${headers[x-hub-signature-256]}"

      if verify_signature "$body" "$signature"; then
        handle_webhook "$body"
        echo -ne "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK"
      else
        echo -ne "HTTP/1.1 401 Unauthorized\r\nContent-Length: 4\r\n\r\nFAIL"
      fi
    else
      echo -ne "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\n\r\nNot found"
    fi
  } | nc -l -p "$WEBHOOK_PORT" -q 1
done
