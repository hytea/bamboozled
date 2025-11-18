#!/bin/bash
#
# Aggregated Log Viewer
# View logs from all services in one place

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

MODE="${1:-local}"  # local, docker, or file
LOG_LEVEL="${2:-all}"  # all, error, warn, info, debug

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Log Viewer (Mode: $MODE, Level: $LOG_LEVEL)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Press Ctrl+C to exit"
echo ""

colorize_log() {
    while IFS= read -r line; do
        # Color by log level
        if echo "$line" | grep -qi "error"; then
            echo -e "${RED}$line${NC}"
        elif echo "$line" | grep -qi "warn"; then
            echo -e "${YELLOW}$line${NC}"
        elif echo "$line" | grep -qi "info"; then
            echo -e "${GREEN}$line${NC}"
        elif echo "$line" | grep -qi "debug"; then
            echo -e "${BLUE}$line${NC}"
        else
            echo "$line"
        fi
    done
}

filter_by_level() {
    if [ "$LOG_LEVEL" = "all" ]; then
        cat
    else
        grep -i "$LOG_LEVEL"
    fi
}

# Create logs directory if it doesn't exist
mkdir -p logs

case "$MODE" in
    docker)
        echo -e "${BLUE}Following Docker container logs...${NC}"
        echo ""
        docker compose logs -f --tail=50 | colorize_log
        ;;

    file)
        echo -e "${BLUE}Following log files...${NC}"
        echo ""

        # Backend logs
        if [ -f "logs/backend.log" ]; then
            echo -e "${MAGENTA}[Backend]${NC}"
            tail -f logs/backend.log | filter_by_level | colorize_log &
        fi

        # Frontend logs
        if [ -f "logs/frontend.log" ]; then
            echo -e "${MAGENTA}[Frontend]${NC}"
            tail -f logs/frontend.log | filter_by_level | colorize_log &
        fi

        wait
        ;;

    local|*)
        echo -e "${BLUE}Following local development logs...${NC}"
        echo ""
        echo -e "${YELLOW}Note: For live logs, start services with:${NC}"
        echo -e "${YELLOW}  make dev          - Development mode${NC}"
        echo -e "${YELLOW}  make dev-docker   - Docker mode${NC}"
        echo ""

        # Check if services are running
        if pgrep -f "tsx watch" > /dev/null; then
            echo -e "${GREEN}Backend is running${NC}"
        else
            echo -e "${RED}Backend is not running${NC}"
        fi

        if pgrep -f "vite" > /dev/null; then
            echo -e "${GREEN}Frontend is running${NC}"
        else
            echo -e "${RED}Frontend is not running${NC}"
        fi

        echo ""
        echo "To view Docker logs, run:"
        echo "  $0 docker"
        echo ""
        echo "To view file-based logs, run:"
        echo "  $0 file"
        ;;
esac
