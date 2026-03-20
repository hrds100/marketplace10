#!/bin/bash

# Set production environment
export NODE_ENV=production

# Clean npm cache
npm cache clean --force

# Set memory limits for Node.js
export NODE_OPTIONS="--max-old-space-size=1500"

echo "Backend pre-deploy setup completed"
