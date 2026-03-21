import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroChat from './HeroChat';
import MarketplaceMockup from './MarketplaceMockup';
import InboxMockup from './InboxMockup';
import CRMMockup from './CRMMockup';
import HeroStoryAnimation from './HeroStoryAnimation';

const TABS = [
  { id: 'marketplace', label: 'Marketplace', icon: '🏠' },
  { id: 'inbox', label: 'Inbox', icon: '💬' },
  { id: 'pipeline', label: 'Pipeline', icon: '📊' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState<TabId>('marketplace');
  const [storyActive, setStoryActive] = useState(false);
  const [storyStep, setStoryStep] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);

  // Auto-cycle tabs every 4s when story is not active
  const handleAutoCycle = useCallback(() => {
    if (!autoCycle || storyActive) return;
    setActiveTab(prev => {
      const idx = TABS.findIndex(t => t.id === prev);
      return TABS[(idx + 1) % TABS.length].id;
    });
  }, [autoCycle, storyActive]);

  // "Click here" triggers the story
  const handleClickHere = useCallback(() => {
    setAutoCycle(false);
    setStoryActive(true);
    setStoryStep(0);
    setActiveTab('marketplace');
  }, []);

  // Story finished → reset
  const handleStoryEnd = useCallback(() => {
    setStoryActive(false);
    setStoryStep(0);
    setActiveTab('marketplace');
    setAutoCycle(true);
  }, []);

  return (
    <section className="relative w-full" style={{ background: '#f3f3ee' }}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-8 pb-2">
        {/* Main demo container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative bg-white rounded-[20px] border overflow-hidden"
          style={{
            borderColor: '#e8e5df',
            boxShadow: '0px 8px 10px -6px rgba(0,0,0,0.1)',
          }}
        >
          <div className="flex flex-col lg:flex-row min-h-[580px] lg:min-h-[620px]">
            {/* ===== LEFT: Chat Panel ===== */}
            <div className="w-full lg:w-[38%] lg:min-w-[360px] flex flex-col border-b lg:border-b-0 lg:border-r" style={{ borderColor: '#e8e5df' }}>
              <HeroChat
                storyActive={storyActive}
                storyStep={storyStep}
                onClickHere={handleClickHere}
                autoCycle={autoCycle}
                onAutoCycle={handleAutoCycle}
              />
            </div>

            {/* ===== RIGHT: Preview Panel ===== */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-0 px-4 pt-3 pb-0" style={{ background: '#f3f3ee', borderBottom: '1px solid #e8e5df' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (!storyActive) {
                        setActiveTab(tab.id);
                        setAutoCycle(false);
                      }
                    }}
                    className={`
                      flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg
                      transition-all duration-200 relative
                      ${activeTab === tab.id
                        ? 'bg-white text-[#1e9a80] border border-b-0'
                        : 'text-[#737373] hover:text-[#525252]'
                      }
                    `}
                    style={activeTab === tab.id ? { borderColor: '#e8e5df', marginBottom: '-1px' } : {}}
                  >
                    <span className="text-xs">{tab.icon}</span>
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="hero-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e9a80]"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Preview content area */}
              <div className="relative flex-1 overflow-hidden bg-white">
                {storyActive ? (
                  <HeroStoryAnimation
                    step={storyStep}
                    onStepChange={setStoryStep}
                    onTabChange={setActiveTab}
                    onEnd={handleStoryEnd}
                  />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 overflow-auto"
                    >
                      {activeTab === 'marketplace' && <MarketplaceMockup />}
                      {activeTab === 'inbox' && <InboxMockup />}
                      {activeTab === 'pipeline' && <CRMMockup />}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator pill */}
        <div className="flex justify-center py-4">
          <div className="w-12 h-1.5 rounded-full bg-[#0a0a0a]/10" />
        </div>
      </div>
    </section>
  );
}
