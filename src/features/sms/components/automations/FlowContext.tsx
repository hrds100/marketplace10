import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { SmsNodeType, type SmsNodeData, type SmsEdgeData } from '../../types';

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
  duplicateNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  updateEdge: (id: string, data: Partial<SmsEdgeData>) => void;
  addNode: (type: SmsNodeType) => void;
  updateNode: (id: string, data: Partial<SmsNodeData>) => void;
  deleteEdge: (id: string) => void;
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

export function FlowContextProvider({
  children,
  initialNodes,
  initialEdges,
  initialGlobalPrompt,
}: {
  children: ReactNode;
  initialNodes: Node<SmsNodeData>[];
  initialEdges: Edge<SmsEdgeData>[];
  initialGlobalPrompt?: string;
}) {
  const [nodes, setNodes] = useState<Node<SmsNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge<SmsEdgeData>[]>(initialEdges);
  const [isEditingEdge, setIsEditingEdge] = useState<string | null>(null);
  const [isEditingNode, setIsEditingNode] = useState<string | null>(null);
  const [showAddNodePopup, setShowAddNodePopup] = useState(false);
  const [showGlobalPrompt, setShowGlobalPrompt] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState(
    initialGlobalPrompt || 'You are a helpful property assistant for NFStay. Be professional and concise.'
  );

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
  }, []);

  const deleteNodes = useCallback((ids: string[]) => {
    setNodes((prev) => prev.filter((n) => !ids.includes(n.id)));
    setEdges((prev) => prev.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)));
    setIsEditingNode(null);
  }, []);

  const updateEdge = useCallback((id: string, data: Partial<SmsEdgeData>) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, data: { ...(e.data || {}), ...data } as SmsEdgeData } : e))
    );
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setIsEditingEdge(null);
  }, []);

  const addNode = useCallback((type: SmsNodeType) => {
    const newNode: Node<SmsNodeData> = {
      id: generateNodeId(),
      type,
      position: { x: 300, y: 300 },
      data: {
        name: DEFAULT_NAMES[type],
        prompt: type === SmsNodeType.DEFAULT ? '' : undefined,
        steps: type === SmsNodeType.FOLLOW_UP ? [] : undefined,
        webhookMethod: type === SmsNodeType.WEBHOOK ? 'POST' : undefined,
        webhookUrl: type === SmsNodeType.WEBHOOK ? '' : undefined,
        modelOptions: type === SmsNodeType.DEFAULT ? { temperature: 0.7 } : undefined,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setShowAddNodePopup(false);
  }, []);

  const updateNode = useCallback((id: string, data: Partial<SmsNodeData>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }, []);

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
        duplicateNode,
        deleteNodes,
        updateEdge,
        addNode,
        updateNode,
        deleteEdge,
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
