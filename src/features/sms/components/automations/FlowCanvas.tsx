import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Brain, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmsNodeType, type SmsNodeData, type SmsEdgeData } from '../../types';
import { NodeWrapper } from './NodeWrapper';
import { CustomEdge } from './CustomEdge';
import { useFlowContext } from './FlowContext';
import { AiFlowBuilder } from './AiFlowBuilder';

const nodeTypes: NodeTypes = {
  [SmsNodeType.DEFAULT]: NodeWrapper,
  [SmsNodeType.STOP_CONVERSATION]: NodeWrapper,
  [SmsNodeType.FOLLOW_UP]: NodeWrapper,
  [SmsNodeType.TRANSFER]: NodeWrapper,
  [SmsNodeType.LABEL]: NodeWrapper,
  [SmsNodeType.MOVE_STAGE]: NodeWrapper,
  [SmsNodeType.WEBHOOK]: NodeWrapper,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export function FlowCanvas() {
  const { nodes, edges, setNodes, setEdges, setShowAddNodePopup, setShowGlobalPrompt } =
    useFlowContext();
  const [showAiBuilder, setShowAiBuilder] = useState(false);

  const onNodesChange: OnNodesChange<SmsNodeData> = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange<SmsEdgeData> = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'custom',
            data: { label: 'Responded' } as SmsEdgeData,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const defaultEdgeOptions = useMemo(
    () => ({ type: 'custom' as const }),
    []
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="#D1D5DB" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => '#1E9A80'}
          maskColor="rgba(249,250,251,0.7)"
        />

        {/* Top-left panel buttons */}
        <Panel position="top-left">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddNodePopup(true)}
              variant="outline"
              className="rounded-xl gap-1.5 bg-white border-[#E5E7EB] text-[#1A1A1A] hover:border-[#1E9A80] hover:text-[#1E9A80] shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Node
            </Button>
            <Button
              onClick={() => setShowGlobalPrompt(true)}
              variant="outline"
              className="rounded-xl gap-1.5 bg-white border-[#E5E7EB] text-[#1A1A1A] hover:border-[#1E9A80] hover:text-[#1E9A80] shadow-sm"
            >
              <Brain className="w-3.5 h-3.5" />
              Global Prompt
            </Button>
            <Button
              onClick={() => setShowAiBuilder(true)}
              variant="outline"
              className="rounded-xl gap-1.5 bg-white border-[#E5E7EB] text-[#1A1A1A] hover:border-[#1E9A80] hover:text-[#1E9A80] shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Flow Builder
            </Button>
          </div>
        </Panel>
      </ReactFlow>
      <AiFlowBuilder open={showAiBuilder} onOpenChange={setShowAiBuilder} />
    </div>
  );
}
