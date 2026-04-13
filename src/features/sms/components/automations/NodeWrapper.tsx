import { memo } from 'react';
import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import {
  MessageSquare,
  CircleStop,
  Clock,
  UserPlus,
  Tag,
  ArrowRightLeft,
  Globe,
  Play,
  Trash2,
  Copy,
  Users,
  CornerDownLeft,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { SmsNodeType, type SmsNodeData } from '../../types';
import { mockLabels } from '../../data/mockLabels';
import { mockStages } from '../../data/mockStages';
import { useFlowContext } from './FlowContext';

const NODE_CONFIG: Record<
  SmsNodeType,
  { icon: React.ElementType; borderColor: string; label: string }
> = {
  [SmsNodeType.DEFAULT]: { icon: MessageSquare, borderColor: '#1E9A80', label: 'AI Response' },
  [SmsNodeType.STOP_CONVERSATION]: { icon: CircleStop, borderColor: '#EF4444', label: 'Stop' },
  [SmsNodeType.FOLLOW_UP]: { icon: Clock, borderColor: '#F59E0B', label: 'Follow Up' },
  [SmsNodeType.TRANSFER]: { icon: UserPlus, borderColor: '#6B7280', label: 'Transfer' },
  [SmsNodeType.LABEL]: { icon: Tag, borderColor: '#1E9A80', label: 'Label' },
  [SmsNodeType.MOVE_STAGE]: { icon: ArrowRightLeft, borderColor: '#1E9A80', label: 'Move Stage' },
  [SmsNodeType.WEBHOOK]: { icon: Globe, borderColor: '#1A1A1A', label: 'Webhook' },
};

function getNodeSummary(type: SmsNodeType, data: SmsNodeData): string {
  switch (type) {
    case SmsNodeType.DEFAULT: {
      const content = data.prompt || data.text || '';
      return content.length > 60 ? `${content.slice(0, 60)}...` : content || 'No content yet';
    }
    case SmsNodeType.STOP_CONVERSATION:
      return 'End conversation';
    case SmsNodeType.FOLLOW_UP:
      return `${(data.steps || []).length} step${(data.steps || []).length !== 1 ? 's' : ''}`;
    case SmsNodeType.TRANSFER:
      return data.assignTo ? `Transfer to ${data.assignTo}` : 'Not assigned';
    case SmsNodeType.LABEL: {
      const label = mockLabels.find((l) => l.id === data.labelId);
      return label ? label.name : 'No label selected';
    }
    case SmsNodeType.MOVE_STAGE: {
      const stage = mockStages.find((s) => s.id === data.stageId);
      return stage ? stage.name : 'No stage selected';
    }
    case SmsNodeType.WEBHOOK: {
      const method = data.webhookMethod || 'POST';
      const url = data.webhookUrl || '';
      if (!url) return 'No URL configured';
      const truncated = url.length > 30 ? `${url.slice(0, 30)}...` : url;
      return `${method} ${truncated}`;
    }
    default:
      return '';
  }
}

function NodeWrapperComponent({ id, data, type, selected }: NodeProps) {
  const nodeType = type as SmsNodeType;
  const nodeData = data as SmsNodeData;
  const config = NODE_CONFIG[nodeType];
  const { setIsEditingNode, duplicateNode, deleteNodes, leadCounts } = useFlowContext();
  const [showLeads, setShowLeads] = useState(false);
  const leadInfo = leadCounts[id];

  if (!config) return null;

  const Icon = config.icon;
  const isStart = nodeData.isStart === true;
  const isTerminal = nodeType === SmsNodeType.STOP_CONVERSATION;
  const isLoopBack = [SmsNodeType.LABEL, SmsNodeType.MOVE_STAGE, SmsNodeType.FOLLOW_UP].includes(nodeType);

  return (
    <>
      {/* Target handle — not on start node */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-[#E5E7EB] !border-2 !border-white"
        />
      )}

      {/* NodeToolbar — shown when selected */}
      <NodeToolbar isVisible={selected} position={Position.Right} offset={8}>
        <div className="flex flex-col gap-1">
          {!isStart && (
            <button
              onClick={() => deleteNodes([id])}
              className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#EF4444]/10 hover:border-[#EF4444]/30 text-[#6B7280] hover:text-[#EF4444] transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => duplicateNode(id)}
            className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#1E9A80]/10 hover:border-[#1E9A80]/30 text-[#6B7280] hover:text-[#1E9A80] transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </NodeToolbar>

      {/* Card */}
      <div
        className={cn(
          'w-[280px] bg-white rounded-lg border border-[#E5E7EB] shadow-sm cursor-pointer transition-all',
          selected && 'ring-2 ring-[#1E9A80]'
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: config.borderColor }}
        onDoubleClick={() => setIsEditingNode(id)}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#E5E7EB]">
          {isStart ? (
            <div className="w-6 h-6 rounded-md bg-[#1E9A80]/10 flex items-center justify-center flex-shrink-0">
              <Play className="w-3.5 h-3.5 text-[#1E9A80]" />
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `${config.borderColor}15` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: config.borderColor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1A1A] truncate">
              {isStart ? 'AI Response' : nodeData.name}
            </p>
          </div>
          {!isStart && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ color: config.borderColor, background: `${config.borderColor}15` }}
            >
              {config.label}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-3 py-2">
          <p className="text-xs text-[#6B7280] leading-relaxed">
            {isStart ? 'Uses Global Prompt' : getNodeSummary(nodeType, nodeData)}
          </p>
          {isLoopBack && (
            <div className="flex items-center gap-1 mt-1.5">
              <CornerDownLeft className="w-3 h-3 text-[#1E9A80]" />
              <span className="text-[10px] text-[#1E9A80] font-medium">
                Returns to Global Prompt
              </span>
            </div>
          )}
        </div>

        {/* Lead count badge */}
        {leadInfo && leadInfo.count > 0 && (
          <div className="px-3 pb-2">
            <Popover open={showLeads} onOpenChange={setShowLeads}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLeads(true);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#1E9A80] bg-[#ECFDF5] rounded-full px-2 py-0.5 hover:bg-[#1E9A80]/15 transition-colors"
                >
                  <Users className="w-3 h-3" />
                  {leadInfo.count} {leadInfo.count === 1 ? 'lead' : 'leads'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <div className="px-3 py-2 border-b border-[#E5E7EB]">
                  <p className="text-xs font-semibold text-[#1A1A1A]">
                    Contacts ({leadInfo.count})
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {leadInfo.contacts.map((contact, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 flex items-center justify-between border-b border-[#E5E7EB] last:border-0"
                    >
                      <span className="text-xs text-[#1A1A1A] truncate">
                        {contact.name}
                      </span>
                      <span className="text-[10px] text-[#6B7280] ml-2 flex-shrink-0">
                        {contact.phone}
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Source handle — not on terminal nodes */}
      {!isTerminal && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-[#1E9A80] !border-2 !border-white"
        />
      )}
    </>
  );
}

export const NodeWrapper = memo(NodeWrapperComponent);
