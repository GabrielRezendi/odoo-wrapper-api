#!/usr/bin/env bash
set -e

IMAGE_NAME="${DOCKER_IMAGE:-gabrielrezendi/odoo-wrapper-api}"
VERSION="${1:-$(node -p "require('./package.json').version")}"
PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

echo "Building ${IMAGE_NAME}:${VERSION} (platform: ${PLATFORM})..."
docker build --platform "${PLATFORM}" -t "${IMAGE_NAME}:${VERSION}" .

echo "Pushing ${IMAGE_NAME}:${VERSION}..."
docker push "${IMAGE_NAME}:${VERSION}"

echo "Done. Image: ${IMAGE_NAME}:${VERSION}"
