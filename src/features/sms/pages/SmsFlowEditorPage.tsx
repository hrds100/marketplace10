import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider, type Node, type Edge } from '@xyflow/react';
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SmsNodeType, type SmsNodeData, type SmsEdgeData } from '../types';
import { useAutomationFlow, type FlowData } from '../hooks/useAutomationFlow';
import { useAutomations } from '../hooks/useAutomations';
import { useFlowLeadCounts } from '../hooks/useFlowLeadCounts';
import { FlowContextProvider, useFlowContext } from '../components/automations/FlowContext';
import { FlowCanvas } from '../components/automations/FlowCanvas';
import { EditEdgeSidebar } from '../components/automations/EditEdgeSidebar';
import { AddNodePanel } from '../components/automations/AddNodePanel';
import { EditNodePopup } from '../components/automations/EditNodePopup';
import { GlobalPromptPopup } from '../components/automations/GlobalPromptPopup';
import type { SaveStatus } from '../hooks/useAutomationFlow';

// Default flow for brand-new automations (used as fallback when flow_json is empty)
const DEFAULT_NODES: Node<SmsNodeData>[] = [
  {
    id: 'n-1',
    type: SmsNodeType.DEFAULT,
    position: { x: 300, y: 0 },
    data: {
      name: 'AI Response',
      isStart: true,
      prompt: 'Greet the user and ask how you can help with their property search.',
      modelOptions: { temperature: 0.7 },
    },
  },
];

const DEFAULT_EDGES: Edge<SmsEdgeData>[] = [];

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Saving...
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#EF4444]">
        <AlertCircle className="w-3.5 h-3.5" />
        Error
      </div>
    );
  }
  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#1E9A80]">
        <Check className="w-3.5 h-3.5" />
        Saved
      </div>
    );
  }
  return null;
}

/** Inner component that reads saveStatus from FlowContext */
function FlowEditorInner({
  flow,
  saveFlow,
}: {
  flow: FlowData;
  saveFlow: (payload: {
    id: string;
    name?: string;
    is_active?: boolean;
    nodes?: Node<SmsNodeData>[];
    edges?: Edge<SmsEdgeData>[];
    globalPrompt?: string;
  }) => Promise<void>;
}) {
  const navigate = useNavigate();
  const { saveStatus } = useFlowContext();

  const [flowName, setFlowName] = useState(flow.name);
  const [isActive, setIsActive] = useState(flow.isActive);

  const handleNameBlur = useCallback(() => {
    if (flowName === flow.name) return;
    saveFlow({ id: flow.id, name: flowName });
  }, [flow, flowName, saveFlow]);

  const handleToggleActive = useCallback(
    (checked: boolean) => {
      setIsActive(checked);
      saveFlow({ id: flow.id, is_active: checked });
    },
    [flow, saveFlow]
  );

  return (
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
          onBlur={handleNameBlur}
          className="max-w-[240px] h-8 rounded-lg border-[#E5E7EB] text-sm font-medium text-[#1A1A1A]"
        />

        <SaveIndicator status={saveStatus} />

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280]">
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch checked={isActive} onCheckedChange={handleToggleActive} />
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
  );
}

export default function SmsFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  // For "new" — create in DB then redirect
  const { createAutomation } = useAutomations();
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    if (!isNew || creatingNew) return;
    setCreatingNew(true);
    createAutomation({
      name: 'Untitled Flow',
      trigger_type: 'new_message',
      trigger_config: {},
      flow_json: {
        nodes: DEFAULT_NODES,
        edges: DEFAULT_EDGES,
        globalPrompt: 'You are a helpful property assistant for NFStay. Be professional and concise.',
      },
    }).then((newId) => {
      navigate(`/sms/automations/${newId}`, { replace: true });
    }).catch(() => {
      navigate('/sms/automations', { replace: true });
    });
  }, [isNew, creatingNew, createAutomation, navigate]);

  const { flow, isLoading, saveFlow } = useAutomationFlow(id);
  const { leadCounts } = useFlowLeadCounts(id === 'new' ? undefined : id);

  const handleFlowSave = useCallback(
    async (data: {
      nodes: Node<SmsNodeData>[];
      edges: Edge<SmsEdgeData>[];
      globalPrompt: string;
      globalModel: string;
      globalTemperature: number;
      maxRepliesPerLead: number;
    }) => {
      if (!flow) return;
      await saveFlow({
        id: flow.id,
        nodes: data.nodes,
        edges: data.edges,
        globalPrompt: data.globalPrompt,
        globalModel: data.globalModel,
        globalTemperature: data.globalTemperature,
        maxRepliesPerLead: data.maxRepliesPerLead,
      });
    },
    [flow, saveFlow]
  );

  // Loading / creating state
  if (isNew || isLoading || !flow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-[#9CA3AF] animate-spin" />
      </div>
    );
  }

  const initialNodes = flow.nodes.length > 0 ? flow.nodes : DEFAULT_NODES;
  const initialEdges = flow.edges.length > 0 ? flow.edges : DEFAULT_EDGES;

  return (
    <ReactFlowProvider>
      <FlowContextProvider
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        initialGlobalPrompt={flow.globalPrompt}
        initialGlobalModel={flow.globalModel}
        initialGlobalTemperature={flow.globalTemperature}
        initialMaxRepliesPerLead={flow.maxRepliesPerLead}
        onSave={handleFlowSave}
        leadCounts={leadCounts}
      >
        <FlowEditorInner flow={flow} saveFlow={saveFlow} />
      </FlowContextProvider>
    </ReactFlowProvider>
  );
}
