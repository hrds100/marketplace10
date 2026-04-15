import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { SmsNodeType, type SmsNodeData, type SmsEdgeData } from '../../types';
import type { SaveStatus } from '../../hooks/useAutomationFlow';
import type { FlowLeadCounts } from '../../hooks/useFlowLeadCounts';

interface FlowContextType {
  isEditingEdge: string | null;
  setIsEditingEdge: (id: string | null) => void;
  isEditingNode: string | null;
  setIsEditingNode: (id: string | null) => void;
  showAddNodePopup: boolean;
  setShowAddNodePopup: (show: boolean) => void;
  showGlobalPrompt: boolean;
  setShowGlobalPrompt: (show: boolean) => void;
  nodes: Node<SmsNodeData>[];
  edges: Edge<SmsEdgeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<SmsNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge<SmsEdgeData>[]>>;
  globalPrompt: string;
  setGlobalPrompt: (prompt: string) => void;
  globalModel: string;
  setGlobalModel: (model: string) => void;
  globalTemperature: number;
  setGlobalTemperature: (temp: number) => void;
  maxRepliesPerLead: number;
  setMaxRepliesPerLead: (max: number) => void;
  duplicateNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  updateEdge: (id: string, data: Partial<SmsEdgeData>) => void;
  addNode: (type: SmsNodeType) => void;
  updateNode: (id: string, data: Partial<SmsNodeData>) => void;
  deleteEdge: (id: string) => void;
  saveStatus: SaveStatus;
  leadCounts: FlowLeadCounts;
}

const FlowContext = createContext<FlowContextType | null>(null);

let nodeIdCounter = 100;

function generateNodeId(): string {
  return `n-${nodeIdCounter++}`;
}

const DEFAULT_NAMES: Record<SmsNodeType, string> = {
  [SmsNodeType.DEFAULT]: 'AI Response',
  [SmsNodeType.STOP_CONVERSATION]: 'Stop Conversation',
  [SmsNodeType.FOLLOW_UP]: 'Follow Up',
  [SmsNodeType.TRANSFER]: 'Transfer',
  [SmsNodeType.LABEL]: 'Add Label',
  [SmsNodeType.MOVE_STAGE]: 'Move Stage',
  [SmsNodeType.WEBHOOK]: 'Webhook',
};

// Node types that loop back to the start node after executing
const LOOP_BACK_TYPES = new Set([
  SmsNodeType.LABEL,
  SmsNodeType.MOVE_STAGE,
  SmsNodeType.FOLLOW_UP,
]);

export function FlowContextProvider({
  children,
  initialNodes,
  initialEdges,
  initialGlobalPrompt,
  initialGlobalModel,
  initialGlobalTemperature,
  initialMaxRepliesPerLead,
  onSave,
  leadCounts,
}: {
  children: ReactNode;
  initialNodes: Node<SmsNodeData>[];
  initialEdges: Edge<SmsEdgeData>[];
  initialGlobalPrompt?: string;
  initialGlobalModel?: string;
  initialGlobalTemperature?: number;
  initialMaxRepliesPerLead?: number;
  onSave?: (data: {
    nodes: Node<SmsNodeData>[];
    edges: Edge<SmsEdgeData>[];
    globalPrompt: string;
    globalModel: string;
    globalTemperature: number;
    maxRepliesPerLead: number;
  }) => Promise<void>;
  leadCounts?: FlowLeadCounts;
}) {
  const [nodes, setNodes] = useState<Node<SmsNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge<SmsEdgeData>[]>(initialEdges);
  const [isEditingEdge, setIsEditingEdge] = useState<string | null>(null);
  const [isEditingNode, setIsEditingNode] = useState<string | null>(null);
  const [showAddNodePopup, setShowAddNodePopup] = useState(false);
  const [showGlobalPrompt, setShowGlobalPrompt] = useState(false);
  const [globalPrompt, setGlobalPromptRaw] = useState(
    initialGlobalPrompt || 'You are a helpful property assistant for NFStay. Be professional and concise.'
  );
  const [globalModel, setGlobalModelRaw] = useState(initialGlobalModel || 'gpt-4o-mini');
  const [globalTemperature, setGlobalTemperatureRaw] = useState(initialGlobalTemperature ?? 0.7);
  const [maxRepliesPerLead, setMaxRepliesPerLeadRaw] = useState(initialMaxRepliesPerLead ?? 10);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Track latest values for debounced save
  const latestRef = useRef({ nodes, edges, globalPrompt, globalModel, globalTemperature, maxRepliesPerLead });
  useEffect(() => {
    latestRef.current = { nodes, edges, globalPrompt, globalModel, globalTemperature, maxRepliesPerLead };
  }, [nodes, edges, globalPrompt, globalModel, globalTemperature, maxRepliesPerLead]);

  const triggerAutoSave = useCallback(() => {
    if (!onSaveRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await onSaveRef.current!(latestRef.current);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 500);
  }, []);

  // Wrap setters to trigger auto-save
  const setGlobalPrompt = useCallback((prompt: string) => {
    setGlobalPromptRaw(prompt);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const setGlobalModel = useCallback((model: string) => {
    setGlobalModelRaw(model);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const setGlobalTemperature = useCallback((temp: number) => {
    setGlobalTemperatureRaw(temp);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const setMaxRepliesPerLead = useCallback((max: number) => {
    setMaxRepliesPerLeadRaw(max);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const duplicateNode = useCallback((id: string) => {
    setNodes((prev) => {
      const source = prev.find((n) => n.id === id);
      if (!source) return prev;
      const newNode: Node<SmsNodeData> = {
        ...source,
        id: generateNodeId(),
        position: { x: source.position.x + 40, y: source.position.y + 40 },
        selected: false,
        data: { ...source.data, isStart: false, name: `${source.data.name} (copy)` },
      };
      return [...prev, newNode];
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  const deleteNodes = useCallback((ids: string[]) => {
    setNodes((prev) => prev.filter((n) => !ids.includes(n.id)));
    setEdges((prev) => prev.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)));
    setIsEditingNode(null);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const updateEdge = useCallback((id: string, data: Partial<SmsEdgeData>) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, data: { ...(e.data || {}), ...data } as SmsEdgeData } : e))
    );
    triggerAutoSave();
  }, [triggerAutoSave]);

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setIsEditingEdge(null);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const addNode = useCallback((type: SmsNodeType) => {
    const newNodeId = generateNodeId();
    const newNode: Node<SmsNodeData> = {
      id: newNodeId,
      type,
      position: { x: 300, y: 300 },
      data: {
        name: DEFAULT_NAMES[type],
        prompt: type === SmsNodeType.DEFAULT ? '' : undefined,
        useGlobalSettings: type === SmsNodeType.DEFAULT ? true : undefined,
        steps: type === SmsNodeType.FOLLOW_UP ? [] : undefined,
        webhookMethod: type === SmsNodeType.WEBHOOK ? 'POST' : undefined,
        webhookUrl: type === SmsNodeType.WEBHOOK ? '' : undefined,
        modelOptions: type === SmsNodeType.DEFAULT ? { temperature: 0.7 } : undefined,
      },
    };
    setNodes((prev) => [...prev, newNode]);

    // Auto-create loop-back edge for action nodes that should return to start
    if (LOOP_BACK_TYPES.has(type)) {
      setNodes((prev) => {
        const startNode = prev.find((n) => n.data.isStart === true);
        if (startNode) {
          setEdges((prevEdges) => [
            ...prevEdges,
            {
              id: `loop-${newNodeId}-${startNode.id}`,
              source: newNodeId,
              target: startNode.id,
              type: 'custom',
              animated: true,
              style: { strokeDasharray: '5 5', opacity: 0.5 },
              data: { label: 'Loop back' } as SmsEdgeData,
            },
          ]);
        }
        return prev;
      });
    }

    setShowAddNodePopup(false);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const updateNode = useCallback((id: string, data: Partial<SmsNodeData>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    );
    triggerAutoSave();
  }, [triggerAutoSave]);

  return (
    <FlowContext.Provider
      value={{
        isEditingEdge,
        setIsEditingEdge,
        isEditingNode,
        setIsEditingNode,
        showAddNodePopup,
        setShowAddNodePopup,
        showGlobalPrompt,
        setShowGlobalPrompt,
        nodes,
        edges,
        setNodes,
        setEdges,
        globalPrompt,
        setGlobalPrompt,
        globalModel,
        setGlobalModel,
        globalTemperature,
        setGlobalTemperature,
        maxRepliesPerLead,
        setMaxRepliesPerLead,
        duplicateNode,
        deleteNodes,
        updateEdge,
        addNode,
        updateNode,
        deleteEdge,
        saveStatus,
        leadCounts: leadCounts ?? {},
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function useFlowContext(): FlowContextType {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlowContext must be used within FlowContextProvider');
  return ctx;
}
