import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import type { SmsFlowNodeData } from '../../../types';

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const d = data as SmsFlowNodeData;
  const config = d.config || {};
  const duration = (config.duration as number) || 0;
  const unit = (config.unit as string) || 'minutes';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderLeft: '4px solid #9CA3AF',
        borderTop: '1px solid #E5E7EB',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 2px rgba(156,163,175,0.3), 0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#9CA3AF', width: 8, height: 8, border: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Clock style={{ width: 14, height: 14, color: '#9CA3AF' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>Delay</span>
      </div>
      <div style={{ fontSize: 11, color: duration ? '#6B7280' : '#9CA3AF', lineHeight: 1.4 }}>
        {duration ? `Wait ${duration} ${unit}` : 'Not configured'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#9CA3AF', width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
});

DelayNode.displayName = 'DelayNode';
