#!/usr/bin/env bash
# =============================================================
# start.sh — Launch Backend + Frontend in parallel
#
# Usage:
#   ./start.sh
#
# Stops both services on Ctrl+C.
# =============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║       PDF Knowledge Studio — Launcher       ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ─── Prerequisite checks ───────────────────────────────────

if ! command -v python3 &>/dev/null; then
  echo -e "${YELLOW}✖ python3 not found. Install Python 3.11+ first.${RESET}"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo -e "${YELLOW}✖ npm not found. Install Node.js first.${RESET}"
  exit 1
fi

# ─── Backend ────────────────────────────────────────────────

echo -e "${GREEN}▶ Starting backend on http://localhost:8000 …${RESET}"
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  echo -e "${YELLOW}  Backend .venv not found — creating it …${RESET}"
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -e '.[dev]'
else
  source .venv/bin/activate
fi

# Start backend in background
uvicorn app.main:app --reload --port 8000 --log-level info &
BACKEND_PID=$!

# ─── Frontend ───────────────────────────────────────────────

echo -e "${GREEN}▶ Starting frontend on http://localhost:5173 …${RESET}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}  node_modules not found — running npm install …${RESET}"
  npm install
fi

npm run dev &
FRONTEND_PID=$!

# ─── Wait for both processes ───────────────────────────────

echo ""
echo -e "${CYAN}══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Backend:  http://localhost:8000${RESET}"
echo -e "${GREEN}  Frontend: http://localhost:5173${RESET}"
echo -e "${CYAN}══════════════════════════════════════════════${RESET}"
echo -e "${YELLOW}  Press Ctrl+C to stop all services.${RESET}"
echo ""

cleanup() {
  echo ""
  echo -e "${YELLOW}⏹ Shutting down …${RESET}"
  kill "$BACKEND_PID" 2>/dev/null
  kill "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" 2>/dev/null
  wait "$FRONTEND_PID" 2>/dev/null
  echo -e "${GREEN}✓ All services stopped.${RESET}"
  exit 0
}

trap cleanup INT TERM

wait
