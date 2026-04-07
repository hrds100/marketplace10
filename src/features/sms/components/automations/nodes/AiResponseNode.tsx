import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Bot } from 'lucide-react';
import type { SmsFlowNodeData } from '../../../types';

export const AiResponseNode = memo(({ data, selected }: NodeProps) => {
  const d = data as SmsFlowNodeData;
  const config = d.config || {};
  const model = (config.model as string) || 'GPT-4o';
  const systemPrompt = (config.systemPrompt as string) || '';

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderLeft: '4px solid #1A1A1A',
        borderTop: '1px solid #E5E7EB',
        borderRight: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 2px rgba(26,26,26,0.2), 0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#1A1A1A', width: 8, height: 8, border: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Bot style={{ width: 14, height: 14, color: '#1A1A1A' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>AI Response</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#6B7280',
            background: '#F3F3EE',
            padding: '1px 6px',
            borderRadius: 100,
          }}
        >
          {model}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>
        {systemPrompt ? (
          <div>{systemPrompt.length > 50 ? systemPrompt.slice(0, 50) + '...' : systemPrompt}</div>
        ) : (
          <div style={{ color: '#9CA3AF' }}>No prompt set</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#1A1A1A', width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
});

AiResponseNode.displayName = 'AiResponseNode';
