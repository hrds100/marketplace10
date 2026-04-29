// crm-v2 DialerV2Page — entry route at /crm/dialer-v2.
//
// Hugo (frustrated 2026-04-29): "build five unique dialers wired to
// our platform... at least one works." So this page now exposes a
// version dropdown. Each version is a genuinely different
// architecture, all wired to the same backend (wk-calls-create,
// wk-leads-next, wk-outcome-apply, Twilio Voice SDK):
//
//   V1 — Effect-driven reducer (the 14-PR-iteration version)
//        Reducer + advanceIntent flag + useEffect listens for
//        state transitions. Most React-idiomatic.
//
//   V2 — Imperative DialerEngine class
//        Plain TypeScript class with internal state and an
//        EventEmitter. UI subscribes via useSyncExternalStore.
//        next() is one async function — no state machines.
//
//   V3 — Twilio-event-driven autonomous chain
//        Auto-advance is the default. Twilio's `disconnect` event
//        triggers the next dial after a configurable pause. No
//        "Next" button — Pause stops the chain.
//
// The dropdown persists in localStorage. Default = V2 (the simplest).

import { useEffect, useState } from 'react';
import { DialerProvider } from '../state/DialerProvider';
import OverviewPage from '../dialer/OverviewPage';
import InCallRoom from '../live-call/InCallRoom';
import Softphone from '../softphone/Softphone';
import V2ImperativePage from '../versions/v2-imperative/V2Page';
import V3EventDrivenPage from '../versions/v3-event-driven/V3Page';

type Version = 'v1' | 'v2' | 'v3';

const STORAGE_KEY = 'crm-v2.dialerVersion';

function readVersion(): Version {
  if (typeof window === 'undefined') return 'v2';
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'v1' || v === 'v2' || v === 'v3') return v;
  return 'v2';
}

const VERSIONS: { id: Version; label: string; subtitle: string }[] = [
  {
    id: 'v1',
    label: 'V1 · Effect-driven reducer',
    subtitle: 'React reducer + advanceIntent + listening effect',
  },
  {
    id: 'v2',
    label: 'V2 · Imperative engine (recommended)',
    subtitle: 'Plain class · no React state machine · simplest',
  },
  {
    id: 'v3',
    label: 'V3 · Auto-chain on disconnect',
    subtitle: 'Press Start once · Twilio disconnect drives next dial',
  },
];

export default function DialerV2Page() {
  const [version, setVersion] = useState<Version>(() => readVersion());
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, version);
    }
  }, [version]);
  const meta = VERSIONS.find((v) => v.id === version) ?? VERSIONS[1];

  return (
    <div className="min-h-full">
      {/* Version switcher — small bar at the top. */}
      <div className="sticky top-0 z-[180] bg-[#F3F3EE] border-b border-[#E5E7EB] px-4 py-2 flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
          Dialer version
        </span>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value as Version)}
          className="px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px] cursor-pointer min-w-[260px]"
          data-testid="dialer-version-select"
        >
          {VERSIONS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-[#6B7280] hidden sm:inline">
          {meta.subtitle}
        </span>
      </div>

      {version === 'v1' && (
        <DialerProvider>
          <OverviewPage />
          <InCallRoom />
          <Softphone />
        </DialerProvider>
      )}
      {version === 'v2' && <V2ImperativePage />}
      {version === 'v3' && <V3EventDrivenPage />}
    </div>
  );
}
