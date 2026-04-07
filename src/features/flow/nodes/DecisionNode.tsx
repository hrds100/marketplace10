import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../types';
import { ACTOR_COLORS, CONFIDENCE_CONFIG } from '../types';

export const DecisionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as FlowNodeData;
  const color = ACTOR_COLORS[d.actor];
  const conf = CONFIDENCE_CONFIG[d.confidence];

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `2px solid ${selected ? color : '#E5E7EB'}`,
        borderRadius: 12,
        padding: '12px 20px',
        minWidth: 200,
        maxWidth: 260,
        textAlign: 'center',
        boxShadow: selected
          ? `0 0 0 2px ${color}30, 0 4px 16px rgba(0,0,0,0.08)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        opacity: d.isFiltered ? 0.35 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8, border: 'none' }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color, marginBottom: 4 }}>
        Decision
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4 }}>
        {d.label}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: conf.dot,
          }}
          title={conf.label}
        />
      </div>

      {d.debugMode && d.files?.[0] && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>
          📄 {d.files[0]}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8, border: 'none' }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: color, width: 8, height: 8, border: 'none' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: color, width: 8, height: 8, border: 'none' }} />
    </div>
  );
});

DecisionNode.displayName = 'DecisionNode';
