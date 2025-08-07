#!/bin/bash

# Adminer Database Management Interface Startup Script

echo "🗄️  Starting Adminer Database Management Interface..."

# Check if PostgreSQL is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "⚠️  PostgreSQL is not running. Starting it first..."
    docker-compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Start Adminer
docker-compose up -d adminer

# Wait a moment for Adminer to start
sleep 2

# Check if Adminer is running
if docker-compose ps adminer | grep -q "Up"; then
    echo "✅ Adminer is now running!"
    echo ""
    echo "🌐 Access Adminer at: http://localhost:8081"
    echo ""
    echo "📋 Database Connection Details:"
    echo "   Server: postgres"
    echo "   Username: saas_user"
    echo "   Password: saas_password"
    echo "   Database: saas_boilerplate"
    echo ""
    echo "🔗 Quick access: http://localhost:8081"
    echo ""
    echo "💡 Tip: The connection details should be pre-filled in Adminer."
else
    echo "❌ Failed to start Adminer. Check logs with:"
    echo "   docker-compose logs adminer"
fi 