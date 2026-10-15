
#!/bin/sh
set -eu

echo "Starting Next.js..."

./node_modules/.bin/next start \
  --hostname 127.0.0.1 \
  --port 3000 &

NEXT_PID=$!

shutdown() {
  kill -TERM "$NEXT_PID" 2>/dev/null || true
  wait "$NEXT_PID" 2>/dev/null || true
}

trap shutdown TERM INT

echo "Waiting for Next.js..."

READY=0

for i in $(seq 1 60); do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "Next.js exited unexpectedly."
    exit 1
  fi

  if node -e "fetch('http://127.0.0.1:3000/').then(() => process.exit(0)).catch(() => process.exit(1))"; then
    READY=1
    break
  fi

  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "Next.js failed to start."
  exit 1
fi

nginx -t -c /app/docker/nginx.conf

echo "Starting NGINX..."

nginx -c /app/docker/nginx.conf -g "daemon off;" &
NGINX_PID=$!

wait "$NGINX_PID"
shutdown
