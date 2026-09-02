#!/usr/bin/env bash
# Run the Worker (8789) and Vite (5184) side by side. Vite proxies /api to the Worker.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm --filter agentic-video-gemini-worker dev &
WORKER_PID=$!
trap 'kill $WORKER_PID 2>/dev/null || true' EXIT
pnpm dev:app
