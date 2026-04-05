/**
 * University AI Chat — calls n8n webhook for real AI responses.
 *
 * Expected behaviour:
 * - POST to /webhook/ai-university-chat with lesson context
 * - 10-second timeout via AbortController
 * - Returns reply string on success
 * - Returns fallback message on ANY failure (network, timeout, empty reply)
 * - Never returns empty string
 */

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

const FALLBACK = 'Our AI consultant is temporarily unavailable. Please try again shortly.';

export interface AIChatPayload {
  message: string;
  lessonTitle: string;
  moduleTitle: string;
  lessonContext: string;
  userId?: string;
}

export async function callAIChat(payload: AIChatPayload): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${N8N_BASE}/webhook/ai-university-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return FALLBACK;

    const data = await res.json();
    const reply = data?.reply || data?.text || data?.message;
    if (!reply || typeof reply !== 'string' || reply.trim() === '') return FALLBACK;
    return reply;
  } catch {
    clearTimeout(timeout);
    return FALLBACK;
  }
}
