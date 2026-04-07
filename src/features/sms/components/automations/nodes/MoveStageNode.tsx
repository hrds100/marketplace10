import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';
import type { SmsFlowNodeData } from '../../../types';

export const MoveStageNode = memo(({ data, selected }: NodeProps) => {
  const d = data as SmsFlowNodeData;
  const config = d.config || {};
  const stageName = (config.stageName as string) || '';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderLeft: '4px solid #1E9A80',
        borderTop: '1px solid #E5E7EB',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 2px rgba(30,154,128,0.3), 0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#1E9A80', width: 8, height: 8, border: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <ArrowRightLeft style={{ width: 14, height: 14, color: '#1E9A80' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>Move Stage</span>
      </div>
      <div style={{ fontSize: 11, color: stageName ? '#6B7280' : '#9CA3AF', lineHeight: 1.4 }}>
        {stageName || 'No stage selected'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#1E9A80', width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
});

MoveStageNode.displayName = 'MoveStageNode';
