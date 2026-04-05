#!/bin/bash
# scripts/deploy-function.sh
# Usage: ./scripts/deploy-function.sh <function-name>
# Requires: SUPABASE_ACCESS_TOKEN env var (never hardcode)
#
# Source of truth for verify_jwt: supabase/config.toml
# This script always uses --no-verify-jwt as a safety net.
# After deploy, verify the function responds (not 401).

set -euo pipefail

FN="$1"

if [ -z "$FN" ]; then
  echo "Usage: ./scripts/deploy-function.sh <function-name>"
  echo "Example: ./scripts/deploy-function.sh send-otp"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN not set"
  echo "Set it with: export SUPABASE_ACCESS_TOKEN=your_token"
  exit 1
fi

PROJECT_REF="asazddtvjvmckouxcmmo"

echo "Deploying: $FN to project $PROJECT_REF"
npx supabase functions deploy "$FN" --project-ref "$PROJECT_REF" --no-verify-jwt

echo ""
echo "Deployed: $FN"
echo "Verify it works: curl -s https://$PROJECT_REF.supabase.co/functions/v1/$FN"
