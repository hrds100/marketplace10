import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, MousePointer2 } from 'lucide-react';

interface HeroStoryAnimationProps {
  step: number;
  onStepChange: (step: number) => void;
  onTabChange: (tab: 'marketplace' | 'inbox' | 'pipeline') => void;
  onEnd: () => void;
}

// Step timing: [delay in ms before advancing to next step]
const STEP_DURATIONS = [2000, 2000, 2500, 2000, 2500, 2000, 2000, 3000, 3500];

export default function HeroStoryAnimation({ step, onStepChange, onTabChange, onEnd }: HeroStoryAnimationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance steps
  useEffect(() => {
    const duration = STEP_DURATIONS[step];
    if (!duration) return;

    timerRef.current = setTimeout(() => {
      const next = step + 1;
      if (next >= STEP_DURATIONS.length) {
        onEnd();
      } else {
        // Change tab based on step
        if (next <= 2) onTabChange('marketplace');
        else if (next === 3) onTabChange('pipeline');
        else if (next >= 4) onTabChange('inbox');

        onStepChange(next);
      }
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, onStepChange, onTabChange, onEnd]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {/* STEP 0-1: Marketplace with animated cursor */}
        {step <= 1 && (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 p-4"
          >
            <StoryMarketplace cursorActive={step === 1} />
          </motion.div>
        )}

        {/* STEP 2: Deal Detail with slider */}
        {step === 2 && (
          <motion.div
            key="deal-detail"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 p-4 overflow-auto"
          >
            <StoryDealDetail />
          </motion.div>
        )}

        {/* STEP 3: CRM Pipeline with deal moving */}
        {step === 3 && (
          <motion.div
            key="crm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 p-4"
          >
            <StoryCRM />
          </motion.div>
        )}

        {/* STEP 4-7: Inbox conversation */}
        {(step >= 4 && step <= 7) && (
          <motion.div
            key="inbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <StoryInbox step={step} />
          </motion.div>
        )}

        {/* STEP 8: Final CTA */}
        {step === 8 && (
          <motion.div
            key="finale"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f3f3ee 50%, #ecfdf5 100%)' }}
          >
            <div className="text-center px-8 max-w-md">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="w-12 h-12 rounded-full bg-[#1e9a80]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🏡</span>
                </div>
                <h3 className="text-xl font-bold text-[#0a0a0a] mb-2 leading-tight">
                  This is how easy it is to start and grow your Airbnb portfolio.
                </h3>
                <p className="text-sm text-[#737373] mb-5">
                  From deal to doorstep — powered by NFsTay
                </p>
                <button className="h-10 px-6 rounded-lg bg-[#1e9a80] text-white text-sm font-semibold hover:bg-[#178f72] transition-colors shadow-md">
                  Get Started
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- Sub-components for each story step ---- */

function StoryMarketplace({ cursorActive }: { cursorActive: boolean }) {
  const deals = [
    { name: '2-Bed Flat, Ancoats', city: 'Manchester', rent: 850, profit: 1200, color: '#87CEEB', highlight: true },
    { name: '3-Bed House, Headingley', city: 'Leeds', rent: 950, profit: 1400, color: '#8B7355', highlight: false },
    { name: '1-Bed Studio, Baltic', city: 'Liverpool', rent: 650, profit: 980, color: '#2E8B57', highlight: false },
    { name: '2-Bed Flat, Digbeth', city: 'Birmingham', rent: 780, profit: 1100, color: '#4682B4', highlight: false },
    { name: '3-Bed Terrace, Clifton', city: 'Bristol', rent: 1100, profit: 1650, color: '#556B2F', highlight: false },
    { name: '1-Bed Flat, Shoreditch', city: 'London', rent: 1350, profit: 1900, color: '#696969', highlight: false },
  ];

  return (
    <div className="text-[11px]">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {deals.map((deal, i) => (
          <div
            key={i}
            className={`rounded-xl border overflow-hidden bg-white transition-all duration-500 ${
              deal.highlight && cursorActive ? 'ring-2 ring-[#1e9a80] ring-offset-2 shadow-lg' : ''
            }`}
            style={{ borderColor: '#e8e5df' }}
          >
            <div className="aspect-[4/3] relative" style={{ background: `linear-gradient(135deg, ${deal.color}, ${deal.color}dd)` }}>
              <button className="absolute top-2 right-2 opacity-70"><Heart className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-2.5">
              <span className="font-semibold text-[#0a0a0a] text-[10px] block truncate">{deal.name}</span>
              <span className="text-[9px] text-[#737373]">{deal.city}</span>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]"><strong>£{deal.rent}</strong>/mo</span>
                <span className="text-[9px] font-semibold text-[#1e9a80]">+£{deal.profit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Animated cursor */}
      {cursorActive && (
        <motion.div
          className="absolute z-20 pointer-events-none"
          initial={{ top: '60%', left: '60%', opacity: 0 }}
          animate={{ top: '20%', left: '15%', opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <MousePointer2 className="w-5 h-5 text-[#0a0a0a] drop-shadow-md" fill="#0a0a0a" />
        </motion.div>
      )}
    </div>
  );
}

function StoryDealDetail() {
  return (
    <div className="text-[11px]">
      {/* Deal header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-24 h-16 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #87CEEB, #87CEEBdd)' }} />
        <div>
          <h4 className="font-bold text-[#0a0a0a] text-sm">2-Bed Flat, Ancoats</h4>
          <p className="text-[10px] text-[#737373]">Manchester · M4 6BF</p>
          <div className="flex gap-3 mt-1">
            <span className="text-[10px]">Rent: <strong>£850</strong>/mo</span>
            <span className="text-[10px] text-[#1e9a80] font-semibold">Profit: £1,200/mo</span>
          </div>
        </div>
      </div>

      {/* Earnings estimator */}
      <div className="bg-[#f8f9fa] rounded-xl p-3 mb-3">
        <span className="font-semibold text-[#0a0a0a] text-[11px] block mb-2">💰 How much can you make?</span>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-[#525252]">Occupancy (nights/mo)</span>
              <motion.span
                className="font-bold text-[#1e9a80]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                22
              </motion.span>
            </div>
            <div className="h-1.5 rounded-full bg-[#e5e7eb] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#1e9a80]"
                initial={{ width: '50%' }}
                animate={{ width: '73%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[10px] text-[#525252]">Estimated monthly profit</span>
            <motion.span
              className="text-sm font-bold text-[#1e9a80]"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
            >
              £1,200
            </motion.span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <motion.button
          className="flex-1 h-8 rounded-lg text-[10px] font-semibold text-white bg-[#1e9a80]"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <span className="flex items-center justify-center gap-1">Add to CRM <ArrowRight className="w-3 h-3" /></span>
        </motion.button>
        <button className="flex-1 h-8 rounded-lg text-[10px] font-medium border" style={{ borderColor: '#e5e7eb' }}>
          Inquire
        </button>
      </div>
    </div>
  );
}

function StoryCRM() {
  const stages = [
    { name: 'New Lead', color: '#3b82f6', deals: ['3-Bed, Leeds'] },
    { name: 'Contacted', color: '#f59e0b', deals: [] },
    { name: 'Viewing', color: '#8b5cf6', deals: ['2-Bed, Birmingham'] },
    { name: 'Deal Agreed', color: '#1e9a80', deals: ['1-Bed, London'] },
  ];

  return (
    <div className="text-[11px]">
      <div className="flex gap-3">
        {stages.map((stage, i) => (
          <div key={i} className="flex-1 min-w-[130px] rounded-xl p-2.5" style={{ background: '#f8f9fa' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
              <span className="font-semibold text-[10px] text-[#0a0a0a]">{stage.name}</span>
            </div>

            {/* Existing deals */}
            {stage.deals.map((d, j) => (
              <div key={j} className="bg-white rounded-lg p-2 border mb-1.5 text-[9px]" style={{ borderColor: '#e8e5df' }}>
                {d}
              </div>
            ))}

            {/* Animated new deal appearing in New Lead */}
            {i === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="bg-white rounded-lg p-2 border text-[9px] ring-2 ring-[#1e9a80] ring-offset-1"
                style={{ borderColor: '#e8e5df' }}
              >
                <span className="font-semibold text-[#0a0a0a]">2-Bed, Manchester</span>
                <span className="block text-[#737373]">£850/mo · +£1,200</span>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryInbox({ step }: { step: number }) {
  const messages = [
    step >= 4 && { from: 'me' as const, text: "Hi, I'm interested in the Manchester flat. Is it still available?" },
    step >= 5 && { from: 'them' as const, text: 'Yes, it\'s still available! When would you like to view it? I can do Thursday or Friday.' },
    step >= 6 && { from: 'me' as const, text: 'Thursday works perfectly. Let\'s do it!' },
    step >= 7 && { from: 'them' as const, text: 'Perfect, you\'re booked in! 🎉' },
  ].filter(Boolean) as Array<{ from: 'me' | 'them'; text: string }>;

  return (
    <div className="flex h-full">
      {/* Mini thread list */}
      <div className="w-[160px] border-r p-2 space-y-1" style={{ borderColor: '#e8e5df' }}>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#ecfdf5]">
          <div className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[8px] font-bold">JT</div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-semibold text-[#0a0a0a] block truncate">James Thornton</span>
            <span className="text-[8px] text-[#737373] block truncate">Manchester flat</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#fafafa]">
          <div className="w-6 h-6 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white text-[8px] font-bold">SC</div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-semibold text-[#0a0a0a] block truncate">Sarah Chen</span>
            <span className="text-[8px] text-[#737373] block truncate">Leeds viewing</span>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: '#e8e5df' }}>
          <div className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[8px] font-bold">JT</div>
          <span className="font-semibold text-[11px] text-[#0a0a0a]">James Thornton</span>
          <span className="text-[9px] text-[#1e9a80]">● Online</span>
        </div>
        <div className="flex-1 p-3 space-y-2 overflow-auto" style={{ background: '#fafafa' }}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[10px] leading-relaxed ${
                msg.from === 'me'
                  ? 'bg-[#1e9a80] text-white rounded-br-md'
                  : 'bg-white border rounded-bl-md'
              }`} style={msg.from === 'them' ? { borderColor: '#e8e5df' } : {}}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
