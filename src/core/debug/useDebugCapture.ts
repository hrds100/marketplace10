export interface ConsoleEvent {
  level: 'error' | 'warn';
  message: string;
  timestamp: string;
}

export interface UnhandledError {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
}

export interface NetworkEvent {
  url: string;
  method: string;
  status: number;
  duration_ms: number;
  error_text?: string;
  timestamp: string;
}

export interface RouteChange {
  from: string;
  to: string;
  timestamp: string;
}

export interface UserAction {
  type: string;
  target_label: string;
  timestamp: string;
}

export interface DebugSnapshot {
  console_events: ConsoleEvent[];
  unhandled_errors: UnhandledError[];
  network_failures: NetworkEvent[];
  recent_requests: NetworkEvent[];
  route_history: RouteChange[];
  user_actions: UserAction[];
}

const MAX_CONSOLE = 50;
const MAX_UNHANDLED = 20;
const MAX_NETWORK_FAILURES = 20;
const MAX_RECENT_REQUESTS = 20;
const MAX_ROUTES = 10;
const MAX_ACTIONS = 30;

function pushCapped<T>(arr: T[], item: T, max: number): void {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

// Singleton buffer — shared across the app lifetime
const _buffer: DebugSnapshot = {
  console_events: [],
  unhandled_errors: [],
  network_failures: [],
  recent_requests: [],
  route_history: [],
  user_actions: [],
};

let _initialized = false;

/**
 * Sets up all in-memory rolling event capture.
 * Call once at module level in App.tsx (guarded by kill switch check).
 * Safe to call multiple times — idempotent.
 */
export function setupDebugCapture(): void {
  if (import.meta.env.VITE_DEBUG_REPORT_ENABLED !== 'true') return;
  if (_initialized) return;
  _initialized = true;

  const now = () => new Date().toISOString();

  // --- Console interception (error + warn only) ---
  const origError = console.error;
  const origWarn = console.warn;

  console.error = (...args: unknown[]) => {
    pushCapped(_buffer.console_events, {
      level: 'error',
      message: args.map(String).join(' '),
      timestamp: now(),
    }, MAX_CONSOLE);
    origError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    pushCapped(_buffer.console_events, {
      level: 'warn',
      message: args.map(String).join(' '),
      timestamp: now(),
    }, MAX_CONSOLE);
    origWarn.apply(console, args);
  };

  // --- Unhandled errors ---
  window.addEventListener('error', (e: ErrorEvent) => {
    pushCapped(_buffer.unhandled_errors, {
      message: e.message || 'Unknown error',
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: (e.error as Error | undefined)?.stack,
      timestamp: now(),
    }, MAX_UNHANDLED);
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason = e.reason as { message?: string; stack?: string } | string | undefined;
    const message =
      reason && typeof reason === 'object' && 'message' in reason
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    const stack =
      reason && typeof reason === 'object' && 'stack' in reason ? reason.stack : undefined;
    pushCapped(_buffer.unhandled_errors, {
      message: message ?? 'Unhandled promise rejection',
      stack,
      timestamp: now(),
    }, MAX_UNHANDLED);
  });

  // --- Fetch interception ---
  // NEVER capture Authorization/Cookie/apikey headers or response bodies.
  const origFetch = globalThis.fetch;
  globalThis.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const start = performance.now();

    try {
      const response = await origFetch.apply(globalThis, [input, init]);
      const duration_ms = Math.round(performance.now() - start);

      const entry: NetworkEvent = {
        url,
        method,
        status: response.status,
        duration_ms,
        timestamp: now(),
      };

      if (response.ok) {
        pushCapped(_buffer.recent_requests, entry, MAX_RECENT_REQUESTS);
      } else {
        entry.error_text = response.statusText || `HTTP ${response.status}`;
        pushCapped(_buffer.network_failures, entry, MAX_NETWORK_FAILURES);
      }

      return response;
    } catch (err) {
      const duration_ms = Math.round(performance.now() - start);
      pushCapped(_buffer.network_failures, {
        url,
        method,
        status: 0,
        duration_ms,
        error_text: err instanceof Error ? err.message : String(err),
        timestamp: now(),
      }, MAX_NETWORK_FAILURES);
      throw err;
    }
  };

  // --- Route tracking via pushState / popstate ---
  let lastPath = window.location.pathname;

  const trackRoute = () => {
    const newPath = window.location.pathname;
    if (newPath !== lastPath) {
      pushCapped(_buffer.route_history, {
        from: lastPath,
        to: newPath,
        timestamp: now(),
      }, MAX_ROUTES);
      lastPath = newPath;
    }
  };

  window.addEventListener('popstate', trackRoute);

  const origPushState = history.pushState.bind(history);
  history.pushState = function (...args: Parameters<History['pushState']>) {
    origPushState(...args);
    trackRoute();
  };

  // --- User action tracking (click on button/a, form submit) ---
  // NEVER capture input values.
  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('button, a, [role="button"]');
      if (!interactive) return;
      const label =
        (interactive as HTMLElement).textContent?.trim().slice(0, 50) ||
        (interactive as HTMLElement).getAttribute('aria-label') ||
        interactive.tagName.toLowerCase();
      pushCapped(_buffer.user_actions, {
        type: 'click',
        target_label: label ?? interactive.tagName.toLowerCase(),
        timestamp: now(),
      }, MAX_ACTIONS);
    },
    true,
  );

  document.addEventListener(
    'submit',
    (e: Event) => {
      const form = e.target as HTMLFormElement;
      const label = form.getAttribute('aria-label') || form.id || 'form';
      pushCapped(_buffer.user_actions, {
        type: 'submit',
        target_label: label,
        timestamp: now(),
      }, MAX_ACTIONS);
    },
    true,
  );
}

/**
 * Returns the current snapshot of all captured debug data.
 * Used by the serializer to build the final report.
 */
export function captureSnapshot(): DebugSnapshot {
  return {
    console_events: [..._buffer.console_events],
    unhandled_errors: [..._buffer.unhandled_errors],
    network_failures: [..._buffer.network_failures],
    recent_requests: [..._buffer.recent_requests],
    route_history: [..._buffer.route_history],
    user_actions: [..._buffer.user_actions],
  };
}
