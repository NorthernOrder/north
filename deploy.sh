#!/bin/bash

set -e

export NORTH_BOT_VERSION="v0.5"

# Build Bot Container
docker compose build
# Stop Bot if it is running
docker compose stop bot
# Start Bot
docker compose up -d bot
