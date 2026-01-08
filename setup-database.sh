#!/bin/bash
# Database Setup Script for Sample Report Handler
# This script sets up the database from scratch for first-time setup or after git pull

set -e  # Exit on error

echo "================================================"
echo "Sample Report Handler - Database Setup"
echo "================================================"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Navigate to backend directory
cd "$BACKEND_DIR"
echo "📂 Working directory: $BACKEND_DIR"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "⚠️  Virtual environment not found!"
    echo "🔧 Creating virtual environment..."
    python3 -m venv .venv
    echo "✅ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate
echo "✅ Virtual environment activated"
echo ""

# Check if dependencies are installed
if ! python -c "import alembic" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    if [ -f ".env.example" ]; then
        echo "📝 Copying .env.example to .env..."
        cp .env.example .env
        echo "✅ .env file created"
    else
        echo "❌ Error: .env.example not found. Please create .env manually."
        exit 1
    fi
    echo ""
else
    echo "✅ .env file exists"
    echo ""
fi

# Check if database exists
if [ -f "dev.db" ]; then
    echo "⚠️  Database file 'dev.db' already exists!"
    read -p "Do you want to delete it and create a fresh database? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Deleting existing database..."
        rm dev.db
        echo "✅ Database deleted"
    else
        echo "⏭️  Skipping database creation (existing database will be used)"
        echo ""
        echo "================================================"
        echo "✅ Setup Complete!"
        echo "================================================"
        exit 0
    fi
    echo ""
fi

# Run migrations to create database
echo "🔨 Creating database and running migrations..."
alembic upgrade head
echo "✅ Database created successfully!"
echo ""

# Check if seed_data.py exists
if [ -f "seed_data.py" ]; then
    read -p "Do you want to populate the database with sample data? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "🌱 Seeding database with sample data..."
        python seed_data.py
        echo "✅ Sample data added"
    else
        echo "⏭️  Skipping sample data"
    fi
    echo ""
fi

echo "================================================"
echo "✅ Database Setup Complete!"
echo "================================================"
echo ""
echo "Database location: $BACKEND_DIR/dev.db"
echo ""
echo "Next steps:"
echo "  1. Start the backend server:"
echo "     cd backend && source .venv/bin/activate"
echo "     uvicorn app.main:app --reload --port 8000"
echo ""
echo "  2. Or use the development script:"
echo "     ./start-dev.sh"
echo ""
