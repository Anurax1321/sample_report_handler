#!/bin/bash
# Force refresh frontend with cache clearing

echo "Stopping frontend server..."
pkill -f "vite"
sleep 2

echo "Clearing Vite cache..."
cd "/mnt/d/ANURAG/USA/Wisconsin/UNIVERSITY OF WISCONSIN-MADISON/Projects/sample_report_handler/frontend"
rm -rf node_modules/.vite
rm -rf dist

echo "Starting frontend server..."
nohup npm run dev > ../frontend.log 2>&1 &
sleep 3

echo ""
echo "Frontend server restarted!"
echo ""
echo "IMPORTANT: In your browser, do a HARD REFRESH:"
echo "  - Chrome/Edge: Ctrl + Shift + R (or Cmd + Shift + R on Mac)"
echo "  - Firefox: Ctrl + F5 (or Cmd + Shift + R on Mac)"
echo ""
echo "Or open DevTools (F12) and right-click the refresh button, select 'Empty Cache and Hard Reload'"
echo ""
echo "Frontend: http://localhost:5173"
