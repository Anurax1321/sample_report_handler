#!/bin/bash
# Quick script to force frontend refresh when CSS changes aren't appearing

echo "🔄 Restarting frontend container to apply changes..."
docker-compose -f docker-compose.dev.yml restart frontend

echo "⏳ Waiting for Vite to start..."
sleep 6

echo "✅ Frontend restarted!"
echo ""
echo "📌 NOW DO THIS IN YOUR BROWSER:"
echo "   Windows/Linux: Ctrl + Shift + R"
echo "   Mac: Cmd + Shift + R"
echo ""
echo "🌐 Frontend: http://localhost:5173"
