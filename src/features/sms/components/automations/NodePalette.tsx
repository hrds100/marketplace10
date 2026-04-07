import {
  MessageSquare,
  Bot,
  GitBranch,
  Clock,
  Tag,
  UserPlus,
  FileText,
  Globe,
  ArrowRightLeft,
} from 'lucide-react';
import type { SmsFlowNodeType } from '../../types';

interface PaletteItem {
  type: SmsFlowNodeType;
  label: string;
  icon: React.ElementType;
  colour: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'trigger', label: 'Trigger', icon: MessageSquare, colour: '#1E9A80' },
  { type: 'ai_response', label: 'AI Response', icon: Bot, colour: '#1A1A1A' },
  { type: 'condition', label: 'Condition', icon: GitBranch, colour: '#F59E0B' },
  { type: 'delay', label: 'Delay', icon: Clock, colour: '#9CA3AF' },
  { type: 'label', label: 'Label', icon: Tag, colour: '#1E9A80' },
  { type: 'transfer', label: 'Transfer', icon: UserPlus, colour: '#F59E0B' },
  { type: 'template', label: 'Template', icon: FileText, colour: '#6B7280' },
  { type: 'webhook', label: 'Webhook', icon: Globe, colour: '#1A1A1A' },
  { type: 'move_stage', label: 'Move Stage', icon: ArrowRightLeft, colour: '#1E9A80' },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: SmsFlowNodeType) => {
    event.dataTransfer.setData('application/sms-flow-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-[200px] border-r border-[#E5E7EB] bg-white p-4 flex-shrink-0 overflow-y-auto">
      <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
        Nodes
      </h3>
      <div className="space-y-2">
        {PALETTE_ITEMS.map(({ type, label, icon: Icon, colour }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white cursor-grab hover:bg-[#F3F3EE] transition-colors active:cursor-grabbing"
            style={{ borderLeft: `3px solid ${colour}` }}
          >
            <Icon style={{ width: 14, height: 14, color: colour, flexShrink: 0 }} />
            <span className="text-xs font-medium text-[#1A1A1A]">{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
