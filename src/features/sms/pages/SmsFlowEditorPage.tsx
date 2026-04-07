import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider, type Node, type Edge } from '@xyflow/react';
import { ArrowLeft, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SmsNodeType, type SmsNodeData, type SmsEdgeData } from '../types';
import { mockAutomations } from '../data/mockAutomations';
import { FlowContextProvider } from '../components/automations/FlowContext';
import { FlowCanvas } from '../components/automations/FlowCanvas';
import { EditEdgeSidebar } from '../components/automations/EditEdgeSidebar';
import { AddNodePanel } from '../components/automations/AddNodePanel';
import { EditNodePopup } from '../components/automations/EditNodePopup';
import { GlobalPromptPopup } from '../components/automations/GlobalPromptPopup';

// Default flow for new automations
const DEFAULT_NODES: Node<SmsNodeData>[] = [
  {
    id: 'n-1',
    type: SmsNodeType.DEFAULT,
    position: { x: 300, y: 0 },
    data: {
      name: 'Start',
      isStart: true,
      prompt: 'Greet the user and ask how you can help with their property search.',
      modelOptions: { temperature: 0.7 },
    },
  },
];

const DEFAULT_EDGES: Edge<SmsEdgeData>[] = [];

// Demo flow for existing automations
const DEMO_NODES: Node<SmsNodeData>[] = [
  {
    id: 'n-1',
    type: SmsNodeType.DEFAULT,
    position: { x: 300, y: 0 },
    data: {
      name: 'Start',
      isStart: true,
      prompt: 'Greet the user and ask how you can help with their property search.',
      modelOptions: { temperature: 0.7 },
    },
  },
  {
    id: 'n-2',
    type: SmsNodeType.DEFAULT,
    position: { x: 300, y: 180 },
    data: {
      name: 'Property Info',
      prompt: 'Provide details about available properties in the area the user asked about. Be helpful and professional.',
      delay: 0,
      modelOptions: { temperature: 0.7 },
    },
  },
  {
    id: 'n-3',
    type: SmsNodeType.FOLLOW_UP,
    position: { x: 50, y: 380 },
    data: {
      name: 'Follow Up Sequence',
      steps: [
        { id: 'step-1', name: 'First check-in', waitMinutes: 1440, prompt: 'Check if the user is still interested in properties.' },
        { id: 'step-2', name: 'Final nudge', waitMinutes: 4320, prompt: 'Send a final follow-up asking if they need help.' },
      ],
    },
  },
  {
    id: 'n-4',
    type: SmsNodeType.STOP_CONVERSATION,
    position: { x: 550, y: 380 },
    data: {
      name: 'End Chat',
      text: 'Thank you for your interest. Feel free to reach out anytime!',
    },
  },
];

const DEMO_EDGES: Edge<SmsEdgeData>[] = [
  {
    id: 'e-1-2',
    source: 'n-1',
    target: 'n-2',
    type: 'custom',
    data: { label: 'User interested' },
  },
  {
    id: 'e-2-3',
    source: 'n-2',
    target: 'n-3',
    type: 'custom',
    data: { label: 'No response' },
  },
  {
    id: 'e-2-4',
    source: 'n-2',
    target: 'n-4',
    type: 'custom',
    data: { label: 'Completed' },
  },
];

export default function SmsFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const automation = mockAutomations.find((a) => a.id === id);
  const isNew = id === 'new';

  const [flowName, setFlowName] = useState(automation?.name || 'Untitled Flow');
  const [isActive, setIsActive] = useState(automation?.isActive ?? false);

  const initialNodes = useMemo(() => (isNew ? DEFAULT_NODES : DEMO_NODES), [isNew]);
  const initialEdges = useMemo(() => (isNew ? DEFAULT_EDGES : DEMO_EDGES), [isNew]);

  return (
    <ReactFlowProvider>
      <FlowContextProvider
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      >
        <div className="flex flex-col h-full">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E5E7EB] bg-white flex-shrink-0 z-10">
            <button
              onClick={() => navigate('/sms/automations')}
              className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#6B7280] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="max-w-[240px] h-8 rounded-lg border-[#E5E7EB] text-sm font-medium text-[#1A1A1A]"
            />

            <div className="flex items-center gap-1.5 text-xs text-[#1E9A80]">
              <Check className="w-3.5 h-3.5" />
              Saved
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-hidden relative">
            <FlowCanvas />
            <EditEdgeSidebar />
            <AddNodePanel />
            <EditNodePopup />
            <GlobalPromptPopup />
          </div>
        </div>
      </FlowContextProvider>
    </ReactFlowProvider>
  );
}
