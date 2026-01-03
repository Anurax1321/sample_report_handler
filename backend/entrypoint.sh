#!/bin/bash
set -e

echo "🚀 Starting Sample Report Handler Backend Setup..."

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p /app/uploads
mkdir -p /app/templates
chmod -R 777 /app/uploads  # Allow write access for uploaded files

echo "✅ Directories created"

# Run database migrations
echo "🔄 Running database migrations..."
alembic upgrade head

echo "✅ Migrations complete"

# Seed database with dummy data
echo "🌱 Seeding database with test data..."
python seed_data.py

# Start the application
echo "🎯 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --timeout-keep-alive 600
