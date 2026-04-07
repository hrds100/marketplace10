import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { Actor } from './types';
import { ACTOR_COLORS, ACTOR_LABELS } from './types';

const ACTORS: Actor[] = ['tenant', 'landlord', 'admin', 'system', 'payment', 'crypto', 'booking', 'integration'];

interface Props {
  activeActors: Set<Actor>;
  onToggleActor: (actor: Actor) => void;
  onSelectAll: () => void;
  debugMode: boolean;
  onToggleDebug: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSearchJump: () => void;
}

export default function FlowToolbar({
  activeActors,
  onToggleActor,
  onSelectAll,
  debugMode,
  onToggleDebug,
  searchQuery,
  onSearch,
  onSearchJump,
}: Props) {
  const { fitView } = useReactFlow();
  const [showLegend, setShowLegend] = useState(false);
  const allActive = activeActors.size === ACTORS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {/* Main bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          pointerEvents: 'all',
          flexWrap: 'wrap',
          maxWidth: '90vw',
          justifyContent: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 4 }}>
          <div style={{ width: 28, height: 28, border: '2px solid #0A0A0A', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 11 }}>
            nf
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, letterSpacing: 1.5, color: '#0A0A0A' }}>stay</span>
          <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4, fontWeight: 500 }}>flow</span>
        </div>

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        {/* Actor filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={onSelectAll}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: 'none',
              cursor: 'pointer', background: allActive ? '#1A1A1A' : '#F3F3EE', color: allActive ? '#FFFFFF' : '#6B7280',
              transition: 'all 0.15s',
            }}
          >
            All
          </button>
          {ACTORS.map((actor) => {
            const active = activeActors.has(actor);
            const color = ACTOR_COLORS[actor];
            return (
              <button
                key={actor}
                onClick={() => onToggleActor(actor)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${active ? color : '#E5E7EB'}`,
                  cursor: 'pointer',
                  background: active ? `${color}15` : '#FFFFFF',
                  color: active ? color : '#9CA3AF',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? color : '#D1D5DB', display: 'inline-block' }} />
                {ACTOR_LABELS[actor]}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        {/* Search */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearchJump(); }}
            placeholder="Search nodes..."
            style={{
              fontSize: 12, padding: '5px 10px', border: '1px solid #E5E5E5', borderRadius: 8,
              outline: 'none', color: '#1A1A1A', width: 140,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          {searchQuery && (
            <button
              onClick={onSearchJump}
              style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#1E9A80', color: '#FFFFFF' }}
            >
              Go
            </button>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        {/* Controls */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onToggleDebug}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
              border: `1px solid ${debugMode ? '#1E9A80' : '#E5E7EB'}`,
              cursor: 'pointer', background: debugMode ? '#ECFDF5' : '#FFFFFF',
              color: debugMode ? '#1E9A80' : '#6B7280', transition: 'all 0.15s',
            }}
          >
            {debugMode ? '🐛 Debug ON' : '🐛 Debug'}
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', background: '#FFFFFF', color: '#6B7280' }}
          >
            Legend
          </button>
          <button
            onClick={() => fitView({ padding: 0.1, duration: 600 })}
            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', background: '#FFFFFF', color: '#6B7280' }}
          >
            Fit
          </button>
        </div>
      </div>

      {/* Legend dropdown */}
      {showLegend && (
        <div
          style={{
            background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12,
            padding: '16px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            pointerEvents: 'all', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', gridColumn: '1/-1', marginBottom: 4 }}>
            Confidence
          </div>
          {[
            { dot: '#1E9A80', label: 'Confirmed — verified in code' },
            { dot: '#3B82F6', label: 'Likely — inferred from patterns' },
            { dot: '#F59E0B', label: 'Unverified — not traced to code' },
            { dot: '#EF4444', label: 'Missing — gap identified' },
          ].map(({ dot, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6B7280' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
              {label}
            </div>
          ))}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', gridColumn: '1/-1', marginTop: 8, marginBottom: 4 }}>
            Borders
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', gridColumn: '1/-1' }}>
            Solid border = confirmed flow &nbsp;·&nbsp; Dashed border = unverified/missing
          </div>
        </div>
      )}
    </motion.div>
  );
}
