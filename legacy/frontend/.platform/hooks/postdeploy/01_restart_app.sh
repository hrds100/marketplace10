#!/bin/bash

# Restart the application after deployment
sudo service nginx restart

echo "Frontend deployment completed successfully"
echo "Next.js application should be running on port 3000"
