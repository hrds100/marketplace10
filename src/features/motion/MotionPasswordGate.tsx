import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onUnlock: () => void;
}

export default function MotionPasswordGate({ onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '5891') {
      sessionStorage.setItem('motion_unlocked', '1');
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#F3F3EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E5DF',
            borderRadius: 20,
            padding: '40px 48px',
            width: 380,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 32 }}>
            <div
              style={{
                width: 36, height: 36, border: '2px solid #0A0A0A', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16,
              }}
            >
              nf
            </div>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 400, fontSize: 24, letterSpacing: 2 }}>
              stay
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#ECFDF5', border: '1px solid rgba(30,154,128,0.2)',
                color: '#1E9A80', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '4px 12px', borderRadius: 9999, marginBottom: 16,
              }}
            >
              Internal tool
            </div>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
            nfstay studio
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
            Enter your PIN to access nfstay studio.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
              maxLength={8}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${error ? '#EF4444' : '#E5E5E5'}`,
                borderRadius: 10,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 8,
                textAlign: 'center',
                outline: 'none',
                color: '#1A1A1A',
                background: '#FFFFFF',
                boxSizing: 'border-box',
                marginBottom: 8,
                transition: 'border-color 0.15s',
              }}
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: '#EF4444', fontSize: 13, marginBottom: 12, overflow: 'hidden' }}
                >
                  Incorrect PIN
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#1E9A80',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: error ? 0 : 8,
                boxShadow: '0 4px 16px rgba(30,154,128,0.3)',
              }}
            >
              Unlock
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
