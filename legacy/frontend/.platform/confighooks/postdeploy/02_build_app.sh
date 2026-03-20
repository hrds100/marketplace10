#!/bin/bash

cd /var/app/current

# Set memory limits
export NODE_OPTIONS="--max-old-space-size=1500"
export NODE_ENV=production

# Build the Next.js application if .next doesn't exist
if [ ! -d ".next" ]; then
    echo "Building Next.js application..."
    npm run build
    echo "Build completed"
else
    echo "Using pre-built application"
fi

# Ensure proper permissions
chown -R webapp:webapp /var/app/current
chmod +x /var/app/current/node_modules/.bin/*

# Start the application
echo "Starting Next.js application..."
