import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic } from 'lucide-react';

interface HeroChatProps {
  storyActive: boolean;
  storyStep: number;
  onClickHere: () => void;
  autoCycle: boolean;
  onAutoCycle: () => void;
}

const IDLE_TEXT = 'Hi, I found a 2-bed flat in Manchester, rent £850/mo, Airbnb profit est. £1,200/mo. Want to see the deal?';

const STORY_TEXTS: Record<number, string> = {
  4: "Hi, I'm interested in the Manchester flat. Is it still available?",
  6: 'Thursday works perfectly. Let\'s do it!',
};

export default function HeroChat({ storyActive, storyStep, onClickHere, autoCycle, onAutoCycle }: HeroChatProps) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [typingDone, setTypingDone] = useState(false);
  const [storyMessages, setStoryMessages] = useState<Array<{ from: string; text: string }>>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Typewriter engine
  const typeText = useCallback((text: string, onDone?: () => void) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayText('');
    setShowCursor(true);
    setTypingDone(false);
    let i = 0;

    intervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTypingDone(true);
        onDone?.();
      }
    }, 45);
  }, []);

  // Initial idle typewriter + tooltip
  useEffect(() => {
    if (!storyActive) {
      const timeout = setTimeout(() => {
        typeText(IDLE_TEXT, () => {
          setTimeout(() => setShowTooltip(true), 800);
        });
      }, 600);
      return () => {
        clearTimeout(timeout);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [storyActive, typeText]);

  // Auto-cycle tabs every 4s when idle
  useEffect(() => {
    if (autoCycle && !storyActive) {
      autoCycleRef.current = setInterval(onAutoCycle, 4000);
      return () => {
        if (autoCycleRef.current) clearInterval(autoCycleRef.current);
      };
    }
  }, [autoCycle, storyActive, onAutoCycle]);

  // Story-driven typewriter
  useEffect(() => {
    if (!storyActive) return;
    const text = STORY_TEXTS[storyStep];
    if (text) {
      setShowTooltip(false);
      typeText(text);
    }
  }, [storyActive, storyStep, typeText]);

  // Story messages that appear as bubbles
  useEffect(() => {
    if (!storyActive) {
      setStoryMessages([]);
      return;
    }
    if (storyStep === 5) {
      setStoryMessages(prev => [...prev, {
        from: 'them',
        text: 'Yes, it\'s still available! When would you like to view it? I can do Thursday or Friday.',
      }]);
    }
    if (storyStep === 7) {
      setStoryMessages(prev => [...prev, {
        from: 'them',
        text: 'Perfect, you\'re booked in! 🎉',
      }]);
    }
  }, [storyActive, storyStep]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyMessages, displayText]);

  const handleClick = () => {
    setShowTooltip(false);
    onClickHere();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#1e9a80]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: storyActive ? (storyStep + 1) / 8 : typingDone ? 0.65 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: 'left' }}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Story conversation bubbles */}
        {storyActive && storyMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex mb-2.5 ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                msg.from === 'me'
                  ? 'bg-[#1e9a80] text-white rounded-br-md'
                  : 'bg-[#f3f4f6] text-[#0a0a0a] rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 relative">
        {/* Glow effect on left edge */}
        <div
          className="absolute left-2 top-2 bottom-6 w-1 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #f9a8d4, #fbbf24, #93c5fd)',
            opacity: storyActive ? 0 : 0.7,
            transition: 'opacity 0.5s',
          }}
        />

        <div
          className="relative rounded-[16px] border bg-white p-3 min-h-[56px]"
          style={{
            borderColor: '#e8e5df',
            boxShadow: '0 4px 8px -1px rgba(0,0,0,0.05)',
          }}
        >
          {/* Typewriter text */}
          <div className="pr-20 min-h-[24px]">
            <span className="text-[13px] text-[#0a0a0a] leading-relaxed">{displayText}</span>
            {showCursor && (
              <span className="text-[#0a0a0a] animate-pulse font-light">|</span>
            )}
          </div>

          {/* "Click here" tooltip */}
          <AnimatePresence>
            {showTooltip && !storyActive && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute right-14 -top-10 z-10"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                >
                  <button
                    onClick={handleClick}
                    className="bg-[#1e9a80] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg cursor-pointer hover:bg-[#178f72] transition-colors"
                    style={{ boxShadow: '0 4px 12px rgba(30,154,128,0.3)' }}
                  >
                    Click here
                  </button>
                  {/* Arrow */}
                  <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-[#1e9a80] rotate-45" />

                  {/* Ripple rings */}
                  <div className="absolute inset-0 -m-2 pointer-events-none">
                    {[0, 0.5, 1].map((delay, i) => (
                      <span
                        key={i}
                        className="absolute inset-0 rounded-lg border-2 border-[#1e9a80] hero-ripple"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom actions */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button className="w-6 h-6 flex items-center justify-center" aria-label="Voice">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 opacity-60" />
            </button>
            <button
              onClick={handleClick}
              className="w-8 h-8 rounded-full bg-[#1e9a80] flex items-center justify-center transition-transform hover:scale-105"
              style={{ boxShadow: '0 2px 8px rgba(30,154,128,0.3)' }}
              aria-label="Send"
            >
              <ArrowUp className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Subtle gradient bar below input */}
        <div className="mt-2 mx-auto w-2/3 h-1 rounded-full overflow-hidden opacity-40">
          <div className="w-full h-full" style={{ background: 'linear-gradient(90deg, #f9a8d4, #fbbf24, #93c5fd, #6ee7b7)' }} />
        </div>
      </div>
    </div>
  );
}
