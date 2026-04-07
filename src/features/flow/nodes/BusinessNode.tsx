import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';
import { ACTOR_COLORS, ACTOR_BG, CONFIDENCE_CONFIG } from '../types';

export const BusinessNode = memo(({ data, selected }: NodeProps) => {
  const d = data as FlowNodeData;
  const color = ACTOR_COLORS[d.actor];
  const bg = ACTOR_BG[d.actor];
  const conf = CONFIDENCE_CONFIG[d.confidence];
  const isDashed = d.confidence === 'unverified' || d.confidence === 'missing';

  const dimmed = d.isDimmed && !d.isActive;
  const active = d.isActive;

  return (
    <div
      style={{
        background: active ? '#FFFFFF' : dimmed ? '#F9FAFB' : '#FFFFFF',
        border: active
          ? `2px solid ${color}`
          : `${isDashed ? '1.5px dashed' : '1px solid'} ${selected ? color : isDashed ? conf.color : '#E5E7EB'}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 200,
        maxWidth: 260,
        boxShadow: active
          ? `0 0 0 3px ${color}30, 0 6px 24px rgba(0,0,0,0.12)`
          : selected
          ? `0 0 0 2px ${color}30, 0 4px 16px rgba(0,0,0,0.08)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        opacity: dimmed ? 0.18 : 1,
        transition: 'all 0.2s ease',
        borderTop: `3px solid ${active ? color : dimmed ? '#E5E7EB' : color}`,
        fontFamily: 'Inter, sans-serif',
        transform: active ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8, border: 'none' }} />

      {/* Pulsing ring for active node */}
      {active && (
        <div style={{
          position: 'absolute', inset: -6, borderRadius: 16,
          border: `2px solid ${color}`,
          animation: 'pulse-ring 1.5s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.3, flex: 1 }}>
          {d.label}
        </div>
        <div
          style={{ width: 7, height: 7, borderRadius: '50%', background: conf.dot, flexShrink: 0, marginTop: 3 }}
          title={conf.label}
        />
      </div>

      {/* Actor + route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color, background: bg, padding: '2px 6px', borderRadius: 4,
        }}>
          {d.actor}
        </span>
        {d.route && (
          <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
            {d.route}
          </span>
        )}
      </div>

      {/* Debug overlay */}
      {d.debugMode && (
        <div style={{
          marginTop: 8, padding: '6px 8px', background: '#F3F3EE',
          borderRadius: 6, fontSize: 10, color: '#6B7280', fontFamily: 'monospace', lineHeight: 1.6,
        }}>
          {d.files?.[0] && <div>📄 {d.files[0]}</div>}
          {d.edgeFunctions?.[0] && <div>⚡ {d.edgeFunctions[0]}</div>}
          {d.debugTrigger && <div>▶ {d.debugTrigger}</div>}
          {d.integrations?.[0] && <div>🔗 {d.integrations[0]}</div>}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8, border: 'none' }} />
    </div>
  );
});

BusinessNode.displayName = 'BusinessNode';
