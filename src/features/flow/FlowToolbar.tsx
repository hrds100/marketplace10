import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { Actor } from './types';
import { ACTOR_COLORS, ACTOR_LABELS } from './types';
import type { ViewMode } from './views';
import { FLOW_VIEWS } from './views';

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
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
}

export default function FlowToolbar({
  activeActors, onToggleActor, onSelectAll,
  debugMode, onToggleDebug,
  searchQuery, onSearch, onSearchJump,
  viewMode, onViewChange,
}: Props) {
  const { fitView } = useReactFlow();
  const [showFilters, setShowFilters] = useState(false);

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
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      {/* ── View tabs row ── */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '6px 8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          pointerEvents: 'all',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {FLOW_VIEWS.map(view => {
          const active = viewMode === view.id;
          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              title={view.description}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 8,
                border: `1px solid ${active ? '#1E9A80' : 'transparent'}`,
                cursor: 'pointer',
                background: active ? '#ECFDF5' : 'transparent',
                color: active ? '#1E9A80' : '#6B7280',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{view.icon}</span>
              {view.label}
            </button>
          );
        })}
      </div>

      {/* ── Controls row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '6px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          pointerEvents: 'all',
          flexWrap: 'wrap',
          maxWidth: '90vw',
          justifyContent: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 2 }}>
          <div style={{ width: 26, height: 26, border: '2px solid #0A0A0A', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 10 }}>
            nf
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, letterSpacing: 1.5, color: '#0A0A0A' }}>stay</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 3, fontWeight: 500 }}>flow</span>
        </div>

        <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />

        {/* Search */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSearchJump(); }}
            placeholder="Search nodes..."
            style={{
              fontSize: 12, padding: '5px 10px', border: '1px solid #E5E5E5', borderRadius: 8,
              outline: 'none', color: '#1A1A1A', width: 130, fontFamily: 'Inter, sans-serif',
            }}
          />
          {searchQuery && (
            <button onClick={onSearchJump} style={smallBtn('#1E9A80', '#FFFFFF')}>Go</button>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />

        {/* Actor filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          style={smallBtn(showFilters ? '#1A1A1A' : '#FFFFFF', showFilters ? '#FFFFFF' : '#6B7280', showFilters ? '#1A1A1A' : '#E5E7EB')}
        >
          Actors {showFilters ? '▲' : '▼'}
        </button>

        <button onClick={onToggleDebug} style={smallBtn(debugMode ? '#ECFDF5' : '#FFFFFF', debugMode ? '#1E9A80' : '#6B7280', debugMode ? '#1E9A80' : '#E5E7EB')}>
          🐛 {debugMode ? 'Debug ON' : 'Debug'}
        </button>

        <button onClick={() => fitView({ padding: 0.15, duration: 700 })} style={smallBtn('#FFFFFF', '#6B7280')}>
          Fit
        </button>
      </div>

      {/* ── Actor filters (expandable) ── */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: '8px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            pointerEvents: 'all',
            maxWidth: '90vw',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onSelectAll}
            style={smallBtn(activeActors.size === ACTORS.length ? '#1A1A1A' : '#FFFFFF', activeActors.size === ACTORS.length ? '#FFFFFF' : '#6B7280', activeActors.size === ACTORS.length ? '#1A1A1A' : '#E5E7EB')}
          >
            All
          </button>
          {ACTORS.map(actor => {
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
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? color : '#D1D5DB', display: 'inline-block' }} />
                {ACTOR_LABELS[actor]}
              </button>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

function smallBtn(bg: string, color: string, border = '#E5E7EB'): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
    border: `1px solid ${border}`, cursor: 'pointer',
    background: bg, color,
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
  };
}
