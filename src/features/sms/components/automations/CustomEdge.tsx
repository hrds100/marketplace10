import { useState, useCallback } from 'react';
import {
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmsEdgeData } from '../../types';
import { useFlowContext } from './FlowContext';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data || {}) as SmsEdgeData;
  const { setIsEditingEdge, updateEdge } = useFlowContext();
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineLabel, setInlineLabel] = useState(edgeData.label || '');

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const handleSaveInlineLabel = useCallback(() => {
    updateEdge(id, { label: inlineLabel });
    setIsInlineEditing(false);
  }, [id, inlineLabel, updateEdge]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveInlineLabel();
      }
      if (e.key === 'Escape') {
        setInlineLabel(edgeData.label || '');
        setIsInlineEditing(false);
      }
    },
    [handleSaveInlineLabel, edgeData.label]
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#1E9A80' : '#9CA3AF',
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {isInlineEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={inlineLabel}
                onChange={(e) => setInlineLabel(e.target.value)}
                onBlur={handleSaveInlineLabel}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-xs px-2 py-1 rounded-md border border-[#1E9A80] bg-white text-[#1A1A1A] outline-none w-[120px]"
                maxLength={50}
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border text-xs font-medium',
                selected
                  ? 'border-[#1E9A80] text-[#1E9A80]'
                  : 'border-[#E5E7EB] text-[#6B7280]'
              )}
            >
              <span
                className="cursor-text"
                onDoubleClick={() => {
                  setInlineLabel(edgeData.label || '');
                  setIsInlineEditing(true);
                }}
              >
                {edgeData.label || 'Pathway'}
              </span>
              <button
                onClick={() => setIsEditingEdge(id)}
                className="p-0.5 rounded hover:bg-[#1E9A80]/10 text-[#9CA3AF] hover:text-[#1E9A80] transition-colors"
                title="Edit pathway"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
