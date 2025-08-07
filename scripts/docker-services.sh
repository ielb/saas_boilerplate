#!/bin/bash

# Docker Compose Service Management Script
# Usage: ./scripts/docker-services.sh [service_name] [action]

SERVICE_NAME=$1
ACTION=$2

# Available services
SERVICES=("postgres" "redis" "api" "mailhog" "minio" "adminer")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show usage
show_usage() {
    echo -e "${BLUE}Docker Compose Service Management${NC}"
    echo ""
    echo "Usage: $0 [service_name] [action]"
    echo ""
    echo "Available services:"
    for service in "${SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
    echo "Available actions:"
    echo "  start     - Start service in background"
    echo "  stop      - Stop service"
    echo "  restart   - Restart service"
    echo "  logs      - Show service logs"
    echo "  status    - Show service status"
    echo "  up        - Start service in foreground"
    echo "  down      - Stop and remove service"
    echo ""
    echo "Examples:"
    echo "  $0 postgres start"
    echo "  $0 api logs"
    echo "  $0 redis status"
    echo "  $0 adminer up"
}

# Function to check if service exists
service_exists() {
    for service in "${SERVICES[@]}"; do
        if [ "$service" = "$1" ]; then
            return 0
        fi
    done
    return 1
}

# Function to check if action is valid
action_exists() {
    case $1 in
        start|stop|restart|logs|status|up|down)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Main script logic
if [ -z "$SERVICE_NAME" ] || [ -z "$ACTION" ]; then
    show_usage
    exit 1
fi

# Check if service exists
if ! service_exists "$SERVICE_NAME"; then
    echo -e "${RED}Error: Service '$SERVICE_NAME' not found.${NC}"
    echo "Available services: ${SERVICES[*]}"
    exit 1
fi

# Check if action is valid
if ! action_exists "$ACTION"; then
    echo -e "${RED}Error: Action '$ACTION' not valid.${NC}"
    echo "Available actions: start, stop, restart, logs, status, up, down"
    exit 1
fi

# Execute the action
case $ACTION in
    start)
        echo -e "${GREEN}Starting $SERVICE_NAME in background...${NC}"
        docker-compose up -d "$SERVICE_NAME"
        ;;
    stop)
        echo -e "${YELLOW}Stopping $SERVICE_NAME...${NC}"
        docker-compose stop "$SERVICE_NAME"
        ;;
    restart)
        echo -e "${BLUE}Restarting $SERVICE_NAME...${NC}"
        docker-compose restart "$SERVICE_NAME"
        ;;
    logs)
        echo -e "${BLUE}Showing logs for $SERVICE_NAME...${NC}"
        docker-compose logs "$SERVICE_NAME"
        ;;
    status)
        echo -e "${BLUE}Status of $SERVICE_NAME:${NC}"
        docker-compose ps "$SERVICE_NAME"
        ;;
    up)
        echo -e "${GREEN}Starting $SERVICE_NAME in foreground...${NC}"
        docker-compose up "$SERVICE_NAME"
        ;;
    down)
        echo -e "${RED}Stopping and removing $SERVICE_NAME...${NC}"
        docker-compose down "$SERVICE_NAME"
        ;;
esac 