import { useState } from 'react';
import Variant01 from './landing-variants/Variant01';
import Variant02 from './landing-variants/Variant02';
import Variant03 from './landing-variants/Variant03';
import Variant04 from './landing-variants/Variant04';
import Variant05 from './landing-variants/Variant05';
import Variant06 from './landing-variants/Variant06';
import Variant07 from './landing-variants/Variant07';
import Variant08 from './landing-variants/Variant08';
import Variant09 from './landing-variants/Variant09';
import Variant10 from './landing-variants/Variant10';

const variants = [
  Variant01, Variant02, Variant03, Variant04, Variant05,
  Variant06, Variant07, Variant08, Variant09, Variant10,
];

const variantLabels = [
  'Deals Explorer',
  'Returns First',
  'Pipeline CRM',
  'Booking Builder',
  'University',
  'Agent / Affiliate',
  'Inbox Messaging',
  'Social Proof',
  'Minimal Type',
  'Journey Path',
];

export default function LandingTestPage() {
  const [activeVariant, setActiveVariant] = useState(0);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const ActiveComponent = variants[activeVariant];

  return (
    <div className="relative min-h-screen">
      {/* Desktop side panel */}
      <div className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-50 flex-col gap-1.5 p-2 rounded-l-xl bg-white/90 backdrop-blur-md shadow-lg border border-r-0 border-border">
        {variants.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveVariant(i)}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
              activeVariant === i
                ? 'bg-primary text-white shadow-md scale-110'
                : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'
            }`}
            title={variantLabels[i]}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Mobile bottom dock */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {selectorOpen && (
          <div className="bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 grid grid-cols-5 gap-2">
            {variants.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActiveVariant(i); setSelectorOpen(false); }}
                className={`h-10 rounded-lg text-xs font-bold transition-all ${
                  activeVariant === i
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setSelectorOpen(!selectorOpen)}
          className="w-full bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 flex items-center justify-between text-sm font-medium"
        >
          <span className="text-muted-foreground">Variant</span>
          <span className="inline-flex items-center gap-2">
            <span className="bg-primary text-white text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center">
              {activeVariant + 1}
            </span>
            <span className="text-foreground font-semibold">{variantLabels[activeVariant]}</span>
            <svg className={`w-4 h-4 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </span>
        </button>
      </div>

      {/* Active variant */}
      <ActiveComponent />

      {/* Bottom spacer for mobile dock */}
      <div className="lg:hidden h-14" />
    </div>
  );
}
