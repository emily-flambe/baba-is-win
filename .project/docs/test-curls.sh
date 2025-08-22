#!/bin/bash

# Test curl commands for email notification endpoints

# Configuration
CRON_SECRET="cron_secret_k8mN3pQ7xR9vL2wY5tG6bH4jF1sA0dC"
BASE_URL="https://personal.emily-cogsdill.workers.dev"

echo "=== Email Notification API Tests ==="
echo

# 1. Get pending notifications
echo "1. Getting pending notifications..."
echo "Command:"
echo 'curl -X GET https://personal.emily-cogsdill.workers.dev/api/cron/get-pending-notifications \'
echo '  -H "x-cron-secret: cron_secret_k8mN3pQ7xR9vL2wY5tG6bH4jF1sA0dC" \'
echo '  -H "Content-Type: application/json"'
echo
echo "Response:"
curl -X GET "${BASE_URL}/api/cron/get-pending-notifications" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -s | jq '.' 2>/dev/null || echo "Failed to get pending notifications"
echo
echo "---"
echo

# 2. Process single notification (will process the first pending notification if any exist)
echo "2. Processing single notification..."
echo "Command:"
echo 'curl -X POST https://personal.emily-cogsdill.workers.dev/api/cron/process-single-notification \'
echo '  -H "x-cron-secret: cron_secret_k8mN3pQ7xR9vL2wY5tG6bH4jF1sA0dC" \'
echo '  -H "Content-Type: application/json"'
echo
echo "Response:"
curl -X POST "${BASE_URL}/api/cron/process-single-notification" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -s | jq '.' 2>/dev/null || echo "Failed to process single notification"
echo
echo "---"
echo

# 3. Process all notifications (old bulk endpoint)
echo "3. Processing all notifications (bulk endpoint)..."
echo "Command:"
echo 'curl -X POST https://personal.emily-cogsdill.workers.dev/api/cron/process-notifications \'
echo '  -H "x-cron-secret: cron_secret_k8mN3pQ7xR9vL2wY5tG6bH4jF1sA0dC" \'
echo '  -H "Content-Type: application/json"'
echo
echo "Response:"
curl -X POST "${BASE_URL}/api/cron/process-notifications" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -s | jq '.' 2>/dev/null || echo "Failed to process notifications"
echo

# 4. Test unauthorized access (should return 401)
echo "4. Testing unauthorized access..."
echo "Command:"
echo 'curl -X GET https://personal.emily-cogsdill.workers.dev/api/cron/get-pending-notifications \'
echo '  -H "x-cron-secret: invalid-secret" \'
echo '  -H "Content-Type: application/json"'
echo
echo "Response:"
curl -X GET "${BASE_URL}/api/cron/get-pending-notifications" \
  -H "x-cron-secret: invalid-secret" \
  -H "Content-Type: application/json" \
  -s | jq '.' 2>/dev/null || echo "Failed as expected - unauthorized"
echo

echo "=== Test completed ===">