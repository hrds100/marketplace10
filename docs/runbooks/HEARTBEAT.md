# Heartbeat — never promise to check back without scheduling it

> **Rule for every agent**: if you tell Hugo "I'll check back in N minutes" or "I'll be watching", you MUST either (a) keep the work synchronous and not say it, or (b) call `ScheduleWakeup` for that exact delay so the next check actually fires. No verbal IOUs.

## Why this exists

2026-04-27 — during the multi-channel email rollout, Claude said multiple times "I'll check back in 2 minutes" without scheduling the wake-up. Hugo was left waiting. Same conversation, same agent, multiple times. Hugo's words: *"every time you say you're gonna check again in one minute or two minutes, you never check. So I think you don't have a heartbeat."*

He's right. The agent has `ScheduleWakeup` available. Forgetting to use it = lying to the user.

## When to use it

| Scenario | Action |
|---|---|
| Polling for an external event (DNS propagation, webhook delivery, edge fn deploy) | `ScheduleWakeup` with the expected ETA + the prompt to re-check on wake |
| Long-running task (build, test suite, migration) | `run_in_background: true` on the Bash call (auto-notifies on completion) |
| Quick check (under a minute) | Stay synchronous — don't promise, just do it |
| User asks for a status report at a future time | `ScheduleWakeup` |

## How to use it (the API)

```
ScheduleWakeup({
  delaySeconds: 120,                // 60–3600 clamp
  reason: "<one-sentence why>",      // shown to user via telemetry
  prompt: "<self-contained re-entry instructions>",
})
```

The prompt fires on wake-up — write it like a fresh briefing to a colleague: what state, what to check, what to do if pass/fail. Include file paths, IDs, log queries.

## delaySeconds — pick wisely

- **60–270s** — cache stays warm, cheapest. Use for active polling against an event you expect very soon.
- **300s** — worst-of-both. Don't pick this.
- **270s twice** — better than `540s` once if you genuinely want a re-check at 4–5 min.
- **1200–1800s (20–30 min)** — idle ticks where there's no specific signal to watch.

Don't burn the cache with 60s polls for events that take 10+ minutes (build, DNS propagation 30+ min). One wake-up for the realistic ETA.

## Documenting the wake-up

When a wake-up is in flight, the in-progress todo MUST capture it:

```
{ content: "[heartbeat] Re-check inbound webhook at 18:14 UTC (ScheduleWakeup wakeup-id-X)",
  status: "in_progress" }
```

If the user pings before the heartbeat fires, the todo tells me what's coming.

## What this is NOT

- This is NOT a real cron daemon. It's the runtime's `ScheduleWakeup` mechanism (one-shot delay) and `run_in_background` for command-driven completion.
- This is NOT for arbitrary "remind me daily" scheduling — for that use `CronCreate` if available.
- This is NOT a substitute for synchronous checks when something IS ready right now.

## Enforcement

CLAUDE.md references this runbook. Every agent should read it when starting a session that involves external waits (deploys, DNS, webhook delivery, builds).

If you ever catch yourself typing "I'll check back in X" — STOP, schedule the wake-up, then send the message.
