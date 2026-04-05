/**
 * University AI Chat — calls ai-chat edge function for AI responses.
 *
 * Expected behaviour:
 * - POST to Supabase ai-chat edge function with lesson context
 * - 10-second timeout via AbortController
 * - Returns reply string on success
 * - Returns fallback message on ANY failure (network, timeout, empty reply)
 * - Never returns empty string
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

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
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
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
