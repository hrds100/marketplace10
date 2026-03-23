# Uptime Monitoring

## Health Check Endpoint
```
GET https://hub.nfstay.com/api/health
```
Returns: `{ "status": "ok", "timestamp": "..." }`

Backed by Supabase Edge Function `health`. Rewrites configured in `vercel.json`.

## Setup (UptimeRobot or BetterStack)

### UptimeRobot (free tier)
1. Go to https://uptimerobot.com → Add New Monitor
2. Type: HTTP(s)
3. URL: `https://hub.nfstay.com/api/health`
4. Monitoring interval: 1 minute
5. Alert contacts: add your email + Slack/Telegram if desired
6. Keyword: `"ok"` (check that response contains "ok")

### BetterStack (alternative)
1. Go to https://betterstack.com → Monitors → Create
2. URL: `https://hub.nfstay.com/api/health`
3. Check interval: 1 minute
4. Alert threshold: 1 failed check
5. Notification: email + Slack

## Alert Threshold
- **Down after**: 1 minute (1 consecutive failure)
- **Recovery**: automatic when endpoint returns 200 + "ok"

## What To Do When Alert Fires
1. Check https://hub.nfstay.com - is the page loading?
2. Check Vercel dashboard → latest deployment status
3. Check Supabase dashboard → is the project running?
4. If Vercel deploy failed: rollback via Vercel dashboard (see DEPLOY_SAFETY.md)
5. If Supabase is down: check https://status.supabase.com
