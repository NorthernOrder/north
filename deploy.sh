#!/bin/bash

# Make sure that DB is running
docker-compose up -d db
# Build Bot Container
docker-compose build
# Stop Bot if it is running
docker-compose stop bot
# Deploy Schema Changes
docker run -it --rm --network north-bot -v $(pwd):/app node:16-alpine sh -c "npm i -g pnpm && cd /app && pnpm install && pnpm prisma migrate deploy"
# Start Bot
docker-compose up -d bot

