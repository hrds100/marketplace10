import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode } from './nodes/TriggerNode';
import { AiResponseNode } from './nodes/AiResponseNode';
import { ConditionNode } from './nodes/ConditionNode';
import { DelayNode } from './nodes/DelayNode';
import { LabelNode } from './nodes/LabelNode';
import { TransferNode } from './nodes/TransferNode';
import { TemplateNode } from './nodes/TemplateNode';
import { WebhookNode } from './nodes/WebhookNode';
import { MoveStageNode } from './nodes/MoveStageNode';
import type { SmsFlowNodeData, SmsFlowNodeType } from '../../types';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  ai_response: AiResponseNode,
  condition: ConditionNode,
  delay: DelayNode,
  label: LabelNode,
  transfer: TransferNode,
  template: TemplateNode,
  webhook: WebhookNode,
  move_stage: MoveStageNode,
};

const DEFAULT_NODE_CONFIG: Record<SmsFlowNodeType, Record<string, unknown>> = {
  trigger: { triggerType: 'new_message', keywords: [], numbers: [] },
  ai_response: { model: 'GPT-4o', systemPrompt: '', temperature: 0.7 },
  condition: { field: 'message', operator: 'contains', value: '' },
  delay: { duration: 30, unit: 'minutes' },
  label: { labelId: '', labelName: '', labelColour: '#1E9A80' },
  transfer: { assigneeId: '', assignee: '' },
  template: { templateId: '', templateName: '' },
  webhook: { method: 'POST', url: '' },
  move_stage: { stageId: '', stageName: '' },
};

// Default mock flow: Trigger -> AI Response -> Condition -> (Yes: Transfer, No: Delay -> Template)
const initialNodes: Node[] = [
  {
    id: 'n-1',
    type: 'trigger',
    position: { x: 250, y: 0 },
    data: {
      type: 'trigger',
      label: 'Trigger',
      config: { triggerType: 'new_message', keywords: [], numbers: ['num-1'] },
    } satisfies SmsFlowNodeData,
  },
  {
    id: 'n-2',
    type: 'ai_response',
    position: { x: 250, y: 140 },
    data: {
      type: 'ai_response',
      label: 'AI Response',
      config: { model: 'GPT-4o', systemPrompt: 'You are a helpful property assistant for NFStay.', temperature: 0.7 },
    } satisfies SmsFlowNodeData,
  },
  {
    id: 'n-3',
    type: 'condition',
    position: { x: 250, y: 280 },
    data: {
      type: 'condition',
      label: 'Condition',
      config: { field: 'message', operator: 'contains', value: 'viewing' },
    } satisfies SmsFlowNodeData,
  },
  {
    id: 'n-4',
    type: 'transfer',
    position: { x: 80, y: 440 },
    data: {
      type: 'transfer',
      label: 'Transfer',
      config: { assigneeId: 'hugo', assignee: 'Hugo' },
    } satisfies SmsFlowNodeData,
  },
  {
    id: 'n-5',
    type: 'delay',
    position: { x: 420, y: 440 },
    data: {
      type: 'delay',
      label: 'Delay',
      config: { duration: 30, unit: 'minutes' },
    } satisfies SmsFlowNodeData,
  },
  {
    id: 'n-6',
    type: 'template',
    position: { x: 420, y: 580 },
    data: {
      type: 'template',
      label: 'Template',
      config: { templateId: 'tpl-4', templateName: 'Follow Up' },
    } satisfies SmsFlowNodeData,
  },
];

const initialEdges: Edge[] = [
  { id: 'e-1-2', source: 'n-1', target: 'n-2', type: 'smoothstep', animated: true },
  { id: 'e-2-3', source: 'n-2', target: 'n-3', type: 'smoothstep', animated: true },
  { id: 'e-3-4', source: 'n-3', sourceHandle: 'yes', target: 'n-4', type: 'smoothstep', animated: true, style: { stroke: '#1E9A80' } },
  { id: 'e-3-5', source: 'n-3', sourceHandle: 'no', target: 'n-5', type: 'smoothstep', animated: true, style: { stroke: '#EF4444' } },
  { id: 'e-5-6', source: 'n-5', target: 'n-6', type: 'smoothstep', animated: true },
];

interface FlowEditorProps {
  onNodeClick: (node: { id: string; data: SmsFlowNodeData } | null) => void;
  onNodesUpdate?: (nodes: Node[]) => void;
}

let nodeIdCounter = 7;

export default function FlowEditor({ onNodeClick, onNodesUpdate }: FlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, type: 'smoothstep', animated: true }, eds)
      );
    },
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick({ id: node.id, data: node.data as SmsFlowNodeData });
    },
    [onNodeClick]
  );

  const handlePaneClick = useCallback(() => {
    onNodeClick(null);
  }, [onNodeClick]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/sms-flow-node') as SmsFlowNodeType;
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `n-${nodeIdCounter++}`,
        type: nodeType,
        position,
        data: {
          type: nodeType,
          label: nodeType.replace('_', ' '),
          config: { ...DEFAULT_NODE_CONFIG[nodeType] },
        } satisfies SmsFlowNodeData,
      };

      setNodes((nds) => {
        const updated = nds.concat(newNode);
        onNodesUpdate?.(updated);
        return updated;
      });
    },
    [screenToFlowPosition, setNodes, onNodesUpdate]
  );

  // Allow updating a node's config from the config panel
  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return {
            ...n,
            data: { ...(n.data as SmsFlowNodeData), config },
          };
        })
      );
    },
    [setNodes]
  );

  // Expose updateNodeConfig via a data attribute on the wrapper
  // (parent reads it via ref pattern)
  const editorRef = useRef({ updateNodeConfig });
  editorRef.current.updateNodeConfig = updateNodeConfig;

  // Attach ref to wrapper so parent can access
  if (reactFlowWrapper.current) {
    (reactFlowWrapper.current as HTMLDivElement & { __editor: typeof editorRef.current }).__editor =
      editorRef.current;
  }

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full" data-flow-editor>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        style={{ width: '100%', height: '100%', background: '#F3F3EE' }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
      >
        <Background color="#D1D5DB" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => '#1E9A80'}
          maskColor="rgba(243,243,238,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
