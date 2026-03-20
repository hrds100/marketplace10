#!/bin/bash

# Set Node.js memory limits to prevent OOM during install
export NODE_OPTIONS="--max-old-space-size=1500"

# Set production environment
export NODE_ENV=production

# Clean npm cache
npm cache clean --force

echo "Pre-deploy setup completed"
