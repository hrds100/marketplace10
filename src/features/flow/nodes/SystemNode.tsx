import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';
import { ACTOR_COLORS, ACTOR_BG, CONFIDENCE_CONFIG } from '../types';

export const SystemNode = memo(({ data, selected }: NodeProps) => {
  const d = data as FlowNodeData;
  const color = ACTOR_COLORS[d.actor];
  const bg = ACTOR_BG[d.actor];
  const conf = CONFIDENCE_CONFIG[d.confidence];
  const isDashed = d.confidence === 'unverified' || d.confidence === 'missing';

  return (
    <div
      style={{
        background: bg,
        border: `${isDashed ? '1.5px dashed' : '1px solid'} ${selected ? color : isDashed ? conf.color : '#D1D5DB'}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 180,
        maxWidth: 240,
        boxShadow: selected ? `0 0 0 2px ${color}30` : 'none',
        opacity: d.isFiltered ? 0.35 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'Inter, sans-serif',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6, border: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>
          {d.actor === 'system' ? '⚡' : d.actor === 'integration' ? '🔗' : d.actor === 'crypto' ? '⛓️' : '⚙️'}
        </span>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.3, flex: 1 }}>
          {d.label}
        </div>
        <div
          style={{ width: 6, height: 6, borderRadius: '50%', background: conf.dot, flexShrink: 0 }}
          title={conf.label}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: color,
            background: '#FFFFFF',
            padding: '1px 5px',
            borderRadius: 3,
          }}
        >
          {d.actor}
        </span>
      </div>

      {d.debugMode && (
        <div style={{ marginTop: 6, fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace', lineHeight: 1.6 }}>
          {d.edgeFunctions?.[0] && <div>⚡ {d.edgeFunctions[0]}</div>}
          {d.debugTrigger && <div>▶ {d.debugTrigger}</div>}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6, border: 'none' }} />
    </div>
  );
});

SystemNode.displayName = 'SystemNode';
