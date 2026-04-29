// Caller — dialer-session types.
// Copied verbatim from src/features/smsv2/lib/dialerSession.types.ts
// (Hugo's PR 149-151 surface). See docs/caller/DECISIONS.md (D2).

export type PacingMode = 'manual' | 'auto_next';

export interface PacingConfig {
  mode: PacingMode;
  delaySeconds: number;
}

export const DEFAULT_PACING: PacingConfig = {
  mode: 'manual',
  delaySeconds: 0,
};

export interface DialerSessionState {
  sessionId: string | null;
  startedAt: number | null;
  paused: boolean;
  pacing: PacingConfig;
  dialedThisSession: ReadonlySet<string>;
}

export const INITIAL_DIALER_SESSION_STATE: DialerSessionState = {
  sessionId: null,
  startedAt: null,
  paused: false,
  pacing: DEFAULT_PACING,
  dialedThisSession: new Set<string>(),
};
