#!/usr/bin/env bash
set -e

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-odoo-wrapper-postgres}"
VOLUME_NAME="${POSTGRES_VOLUME_NAME:-odoo-wrapper-postgres-data}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-odoo_wrapper_api}"
PORT="${POSTGRES_PORT:-5432}"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container ${CONTAINER_NAME} already exists. Starting it..."
  docker start "${CONTAINER_NAME}"
else
  echo "Creating and starting PostgreSQL container: ${CONTAINER_NAME} (volume: ${VOLUME_NAME})"
  docker volume create "${VOLUME_NAME}" 2>/dev/null || true
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_USER="${POSTGRES_USER}" \
    -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
    -e POSTGRES_DB="${POSTGRES_DB}" \
    -p "${PORT}:5432" \
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
    postgres:16-alpine
fi

echo "PostgreSQL is running (data persisted in volume: ${VOLUME_NAME})."
echo "  Host: localhost"
echo "  Port: ${PORT}"
echo "  User: ${POSTGRES_USER}"
echo "  Database: ${POSTGRES_DB}"
echo ""
echo "Configure no .env: DATABASE_URL=postgresql://${POSTGRES_USER}:<PASSWORD>@localhost:${PORT}/${POSTGRES_DB}"
