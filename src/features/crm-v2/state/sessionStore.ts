// crm-v2 sessionStore — session-scoped state.
//
// Hugo's three-times-burned lesson from PRs 138–155: the dialer keeps
// shipping bugs because session concepts (paused, pacing, "have I
// dialed this contact this session?") are spread across useRef +
// reducer state + Zustand mirror. Here, every session-scoped concept
// lives in ONE place. The reducer mirrors `paused` for gating, but
// the source of truth is here.
//
// Implemented as a tiny pub-sub so it's framework-agnostic — React
// hooks subscribe via useSyncExternalStore. Tests don't need React.

export type PacingMode = 'manual' | 'auto_next';

export interface PacingConfig {
  mode: PacingMode;
  /** Seconds between calls when mode='auto_next'. 0–60 enforced. */
  delaySeconds: number;
}

export const DEFAULT_PACING: PacingConfig = {
  mode: 'manual',
  delaySeconds: 0,
};

export interface SessionSnapshot {
  /** Stamped on the first dial; null until then. */
  sessionId: string | null;
  /** ms epoch of first dial; null until then. */
  startedAt: number | null;
  /** Auto-next gate; true also when paused mid-call. */
  paused: boolean;
  /** Active pacing config — never persisted; resets to manual on reload. */
  pacing: PacingConfig;
  /** Contacts already dialed in this session. Anti-loop guard. */
  dialedThisSession: ReadonlySet<string>;
  /** OverviewPage stamps the active campaign here so requestNextCall
   *  can resolve via wk-leads-next when a manual dial's call has none. */
  activeCampaignId: string | null;
}

const INITIAL: SessionSnapshot = {
  sessionId: null,
  startedAt: null,
  paused: false,
  pacing: DEFAULT_PACING,
  dialedThisSession: new Set<string>(),
  activeCampaignId: null,
};

type Listener = () => void;

export interface SessionStore {
  getSnapshot: () => SessionSnapshot;
  subscribe: (listener: Listener) => () => void;
  recordDialed: (contactId: string) => void;
  pause: () => void;
  resume: () => void;
  setPacing: (next: PacingConfig) => void;
  setActiveCampaignId: (id: string | null) => void;
  endSession: () => void;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSessionStore(initial?: Partial<SessionSnapshot>): SessionStore {
  let snapshot: SessionSnapshot = { ...INITIAL, ...initial };
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l());

  return {
    getSnapshot: () => snapshot,

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    recordDialed(contactId: string) {
      // Stamp session on first call.
      let next = snapshot;
      if (next.sessionId === null) {
        next = {
          ...next,
          sessionId: newSessionId(),
          startedAt: Date.now(),
        };
      }
      if (next.dialedThisSession.has(contactId)) {
        if (next === snapshot) return;
        snapshot = next;
        notify();
        return;
      }
      const dialed = new Set(next.dialedThisSession);
      dialed.add(contactId);
      snapshot = { ...next, dialedThisSession: dialed };
      notify();
    },

    pause() {
      if (snapshot.paused) return;
      snapshot = { ...snapshot, paused: true };
      notify();
    },

    resume() {
      if (!snapshot.paused) return;
      snapshot = { ...snapshot, paused: false };
      notify();
    },

    setPacing(next: PacingConfig) {
      if (next.mode !== 'manual' && next.mode !== 'auto_next') return;
      const delay = Math.max(0, Math.min(60, Math.floor(next.delaySeconds)));
      const value: PacingConfig = { mode: next.mode, delaySeconds: delay };
      if (
        snapshot.pacing.mode === value.mode &&
        snapshot.pacing.delaySeconds === value.delaySeconds
      ) {
        return;
      }
      snapshot = { ...snapshot, pacing: value };
      notify();
    },

    setActiveCampaignId(id: string | null) {
      if (snapshot.activeCampaignId === id) return;
      snapshot = { ...snapshot, activeCampaignId: id };
      notify();
    },

    endSession() {
      snapshot = { ...INITIAL, dialedThisSession: new Set<string>() };
      notify();
    },
  };
}
