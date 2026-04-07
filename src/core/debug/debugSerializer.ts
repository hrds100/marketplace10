import { captureSnapshot } from './useDebugCapture';

const REDACT_PATTERN = /token|bearer|secret|apikey|password|refresh/i;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function redactString(str: string): string {
  let result = str.replace(EMAIL_PATTERN, 'REDACTED');
  result = result.replace(
    /(token|bearer|secret|apikey|password|refresh)\s*[=:]\s*\S+/gi,
    '$1=REDACTED',
  );
  return result;
}

function redactValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (REDACT_PATTERN.test(key)) return 'REDACTED';
  return redactString(value);
}

function redactEvent<T extends Record<string, unknown>>(event: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    cleaned[key] = redactValue(key, value);
  }
  return cleaned as T;
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    for (const key of [...parsed.searchParams.keys()]) {
      if (REDACT_PATTERN.test(key)) {
        parsed.searchParams.set(key, 'REDACTED');
      }
    }
    return parsed.toString();
  } catch {
    return redactString(url);
  }
}

interface SupabaseSession {
  user?: {
    id?: string;
    email?: string;
    user_metadata?: { tier?: string; whatsapp_verified?: boolean };
  };
}

function getSessionInfo(): Record<string, unknown> {
  try {
    const raw = (window as unknown as Record<string, unknown>).__supabase_session;
    if (!raw) {
      return {
        user_id: 'unknown',
        user_email: 'REDACTED',
        note: 'auth tokens never exported',
      };
    }
    const session = raw as SupabaseSession;
    const user = session.user;
    if (!user) {
      return {
        user_id: 'unknown',
        user_email: 'REDACTED',
        note: 'auth tokens never exported',
      };
    }
    return {
      user_id: user.id ? user.id.slice(0, 8) : 'unknown',
      user_email: 'REDACTED',
      tier: user.user_metadata?.tier ?? 'unknown',
      whatsapp_verified: user.user_metadata?.whatsapp_verified ?? false,
      note: 'auth tokens never exported',
    };
  } catch {
    return {
      user_id: 'unknown',
      user_email: 'REDACTED',
      note: 'auth tokens never exported',
    };
  }
}

/**
 * Builds and returns the full JSON debug report string.
 * Synchronous — safe to call from a click handler.
 * All sensitive data is redacted before serialization.
 */
export function serializeDebugReport(): string {
  const snapshot = captureSnapshot();
  const session = getSessionInfo();

  const report = {
    meta: {
      captured_at: new Date().toISOString(),
      app_version: import.meta.env.VITE_APP_VERSION ?? 'unknown',
      environment: import.meta.env.MODE ?? 'unknown',
      url: redactUrl(window.location.href),
      route: window.location.pathname,
      query_params: redactString(window.location.search),
      referrer: document.referrer || 'none',
      capture_tool_version: '1.0.0',
    },
    browser: {
      user_agent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      device_pixel_ratio: window.devicePixelRatio,
    },
    session,
    console_events: snapshot.console_events.map(e => redactEvent(e)),
    unhandled_errors: snapshot.unhandled_errors.map(e => redactEvent(e)),
    network_failures: snapshot.network_failures.map(e => ({
      ...redactEvent(e),
      url: redactUrl(e.url),
    })),
    recent_requests: snapshot.recent_requests.map(e => ({
      ...redactEvent(e),
      url: redactUrl(e.url),
    })),
    route_history: snapshot.route_history,
    user_actions: snapshot.user_actions,
    react_errors: [] as string[],
    supabase_errors: [] as unknown[],
    limitations: {
      note: 'This artifact contains only browser-visible data captured during this session.',
      not_available: [
        'Server/database logs',
        'Edge function runtime logs',
        'Other users\' sessions',
        'Auth tokens or cookies (intentionally excluded)',
        'Request/response bodies (intentionally excluded)',
        'Data from before this page load',
      ],
    },
    redactions_applied: [
      'Email addresses replaced with REDACTED',
      'Strings matching token|bearer|secret|apikey|password|refresh replaced with REDACTED',
      'User ID truncated to first 8 characters',
      'Authorization headers excluded from network log',
      'Request/response bodies excluded',
    ],
  };

  return JSON.stringify(report, null, 2);
}
