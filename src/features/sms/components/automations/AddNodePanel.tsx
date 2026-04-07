import { X, MessageSquare, CircleStop, Clock, UserPlus, Tag, ArrowRightLeft, Globe } from 'lucide-react';
import { SmsNodeType } from '../../types';
import { useFlowContext } from './FlowContext';

interface NodeOption {
  type: SmsNodeType;
  name: string;
  description: string;
  icon: React.ElementType;
  borderColor: string;
}

const NODE_OPTIONS: NodeOption[] = [
  {
    type: SmsNodeType.DEFAULT,
    name: 'AI Response',
    description: 'Send an AI-generated or exact text reply',
    icon: MessageSquare,
    borderColor: '#1E9A80',
  },
  {
    type: SmsNodeType.STOP_CONVERSATION,
    name: 'Stop Conversation',
    description: 'End the conversation flow',
    icon: CircleStop,
    borderColor: '#EF4444',
  },
  {
    type: SmsNodeType.FOLLOW_UP,
    name: 'Follow Up',
    description: 'Timed sequence of follow-up messages',
    icon: Clock,
    borderColor: '#F59E0B',
  },
  {
    type: SmsNodeType.TRANSFER,
    name: 'Transfer',
    description: 'Hand off to a human team member',
    icon: UserPlus,
    borderColor: '#6B7280',
  },
  {
    type: SmsNodeType.LABEL,
    name: 'Add Label',
    description: 'Tag the contact with a label',
    icon: Tag,
    borderColor: '#1E9A80',
  },
  {
    type: SmsNodeType.MOVE_STAGE,
    name: 'Move Stage',
    description: 'Move contact to a pipeline stage',
    icon: ArrowRightLeft,
    borderColor: '#1E9A80',
  },
  {
    type: SmsNodeType.WEBHOOK,
    name: 'Webhook',
    description: 'Call an external URL',
    icon: Globe,
    borderColor: '#1A1A1A',
  },
];

export function AddNodePanel() {
  const { showAddNodePopup, setShowAddNodePopup, addNode } = useFlowContext();

  if (!showAddNodePopup) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[350px] bg-white border-l border-[#E5E7EB] z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Add Node</h3>
        <button
          onClick={() => setShowAddNodePopup(false)}
          className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#9CA3AF] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {NODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                onClick={() => addNode(option.type)}
                className="flex flex-col items-start gap-2 p-3 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#1E9A80]/40 hover:shadow-sm transition-all text-left"
                style={{ borderTopWidth: 3, borderTopColor: option.borderColor }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ background: `${option.borderColor}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: option.borderColor }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{option.name}</p>
                  <p className="text-[10px] text-[#6B7280] leading-tight mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
