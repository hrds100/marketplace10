# University AI Chat — n8n Workflow

## Webhook
- Path: `/webhook/ai-university-chat`
- Method: POST

## Request Body

```json
{
  "message": "string — the user's question",
  "lessonTitle": "string — current lesson title",
  "moduleTitle": "string — current module title",
  "lessonContext": "string — first 400 chars of lesson content",
  "userId": "string | undefined — Supabase auth user ID"
}
```

## Response Shape

```json
{ "response": "string" }
```

The client (`useAIChat.ts`) also accepts `reply`, `text`, or `message` keys in the response — any of these will be used as the reply string.

## Fallback

If n8n is unreachable or returns an error, `useAIChat.ts` returns a hardcoded fallback string:
`"Our AI consultant is temporarily unavailable. Please try again shortly."`

No error is surfaced to the user.

## Setup

1. Workflow must be active on the n8n instance at `VITE_N8N_WEBHOOK_URL` (defaults to `https://n8n.srv886554.hstgr.cloud`).
2. Import `n8n-workflows/university-ai-chat.json` if not already present.
3. Configure AI API credentials (OpenAI API key) in n8n under the HTTP Request node.
4. Activate the workflow.
