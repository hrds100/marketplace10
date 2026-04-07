import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import type { SmsFlowNodeData } from '../../../types';

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const d = data as SmsFlowNodeData;
  const config = d.config || {};
  const triggerType = (config.triggerType as string) || 'new_message';
  const keywords = (config.keywords as string[]) || [];
  const numbers = (config.numbers as string[]) || [];

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <MessageSquare style={{ width: 14, height: 14, color: '#1E9A80' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>Trigger</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#1E9A80',
            background: '#ECFDF5',
            padding: '1px 6px',
            borderRadius: 100,
          }}
        >
          {triggerType.replace('_', ' ')}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>
        {numbers.length > 0 && (
          <div>{numbers.length} number{numbers.length > 1 ? 's' : ''}</div>
        )}
        {keywords.length > 0 && (
          <div>Keywords: {keywords.join(', ')}</div>
        )}
        {!numbers.length && !keywords.length && (
          <div style={{ color: '#9CA3AF' }}>Not configured</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#1E9A80', width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
