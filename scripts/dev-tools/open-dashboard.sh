#!/bin/bash
#
# Open Development Dashboard
# Opens the developer dashboard in the default browser

DASHBOARD_FILE="$(dirname "$0")/dashboard.html"

echo "🚀 Opening Bamboozled Developer Dashboard..."

# Detect OS and open browser
if command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$DASHBOARD_FILE"
elif command -v open &> /dev/null; then
    # macOS
    open "$DASHBOARD_FILE"
elif command -v start &> /dev/null; then
    # Windows
    start "$DASHBOARD_FILE"
else
    echo "Could not detect how to open browser on this system"
    echo "Please open this file manually: $DASHBOARD_FILE"
    exit 1
fi

echo "✅ Dashboard opened in browser"
