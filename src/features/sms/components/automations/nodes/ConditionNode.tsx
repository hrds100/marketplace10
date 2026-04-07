import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import type { SmsFlowNodeData } from '../../../types';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as SmsFlowNodeData;
  const config = d.config || {};
  const field = (config.field as string) || 'message';
  const operator = (config.operator as string) || 'contains';
  const value = (config.value as string) || '';

  const summary = value
    ? `If ${field} ${operator} "${value}"`
    : 'Not configured';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderLeft: '4px solid #F59E0B',
        borderTop: '1px solid #E5E7EB',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 2px rgba(245,158,11,0.3), 0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#F59E0B', width: 8, height: 8, border: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <GitBranch style={{ width: 14, height: 14, color: '#F59E0B' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>Condition</span>
      </div>
      <div style={{ fontSize: 11, color: value ? '#6B7280' : '#9CA3AF', lineHeight: 1.4 }}>
        {summary}
      </div>
      {/* Yes handle - left side */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ background: '#1E9A80', width: 8, height: 8, border: 'none', left: '30%' }}
      />
      {/* No handle - right side */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ background: '#EF4444', width: 8, height: 8, border: 'none', left: '70%' }}
      />
      {/* Labels for handles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 600, color: '#1E9A80' }}>Yes</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#EF4444' }}>No</span>
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
