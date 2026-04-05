#!/usr/bin/env bash
# =============================================================
# setup.sh — One-time project setup
#
# Usage:
#   ./setup.sh
#
# Creates virtual environments, installs dependencies,
# and sets up environment files.
# =============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║     PDF Knowledge Studio — Setup Script     ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ─── Prerequisite checks ───────────────────────────────────

if ! command -v python3 &>/dev/null; then
  echo -e "${RED}✖ python3 not found. Install Python 3.11+ first.${RESET}"
  exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)

if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 11 ]); then
  echo -e "${RED}✖ Python 3.11+ required (found $PY_VERSION).${RESET}"
  exit 1
fi

echo -e "${GREEN}✔ Python $PY_VERSION${RESET}"

if ! command -v npm &>/dev/null; then
  echo -e "${RED}✖ npm not found. Install Node.js first.${RESET}"
  exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✔ Node.js $NODE_VERSION${RESET}"
echo ""

# ─── Backend ────────────────────────────────────────────────

echo -e "${CYAN}── Backend ──────────────────────────────────${RESET}"

cd "$BACKEND_DIR"

if [ -d ".venv" ]; then
  echo -e "${YELLOW}  Backend .venv already exists — skipping.${RESET}"
else
  echo -e "${GREEN}  Creating virtual environment…${RESET}"
  python3 -m venv .venv
fi

source .venv/bin/activate

echo -e "${GREEN}  Installing dependencies…${RESET}"
pip install -q -e '.[dev]'
echo -e "${GREEN}  ✔ Backend dependencies installed.${RESET}"

# Set up .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${YELLOW}  Created backend/.env — edit it to add your GROQ_API_KEY.${RESET}"
else
  echo -e "${GREEN}  backend/.env already exists — skipping.${RESET}"
fi

echo ""

# ─── Frontend ───────────────────────────────────────────────

echo -e "${CYAN}── Frontend ─────────────────────────────────${RESET}"

cd "$FRONTEND_DIR"

if [ -d "node_modules" ]; then
  echo -e "${YELLOW}  node_modules already exist — skipping.${RESET}"
else
  echo -e "${GREEN}  Running npm install…${RESET}"
  npm install
  echo -e "${GREEN}  ✔ Frontend dependencies installed.${RESET}"
fi

# Set up .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}  Created frontend/.env.${RESET}"
else
  echo -e "${GREEN}  frontend/.env already exists — skipping.${RESET}"
fi

echo ""

# ─── Done ───────────────────────────────────────────────────

echo -e "${CYAN}══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Setup complete!${RESET}"
echo ""
echo -e "${YELLOW}  Next steps:${RESET}"
echo -e "  1. Edit ${GREEN}backend/.env${RESET} and set your ${CYAN}GROQ_API_KEY${RESET}"
echo -e "  2. Run ${GREEN}./start.sh${RESET} to launch both services"
echo -e "${CYAN}══════════════════════════════════════════════${RESET}"
