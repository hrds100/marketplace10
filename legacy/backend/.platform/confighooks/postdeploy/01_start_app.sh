#!/bin/bash

cd /var/app/current

# Set production environment
export NODE_ENV=production

# Ensure proper permissions
chown -R webapp:webapp /var/app/current

# Log startup
echo "Starting Node.js backend application..."
echo "MongoDB Atlas connection will be established from environment variables"

echo "Backend deployment completed successfully"
