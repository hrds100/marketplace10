import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { FlowNodeData, Actor } from './types';
import { ACTOR_COLORS } from './types';
import { flowNodes } from './data/nodes';
import { flowEdges } from './data/edges';
import { BusinessNode } from './nodes/BusinessNode';
import { DecisionNode } from './nodes/DecisionNode';
import { SystemNode } from './nodes/SystemNode';

const nodeTypes: NodeTypes = {
  businessNode: BusinessNode,
  decisionNode: DecisionNode,
  systemNode: SystemNode,
};

interface Props {
  activeActors: Set<Actor>;
  debugMode: boolean;
  searchQuery: string;
  onNodeClick: (node: { id: string; data: FlowNodeData } | null) => void;
  onSearchRef: (fn: () => void) => void;
}

export default function FlowCanvas({ activeActors, debugMode, searchQuery, onNodeClick, onSearchRef }: Props) {
  const { setCenter } = useReactFlow();

  const enrichedNodes = useMemo(() => {
    return flowNodes.map((node) => {
      const d = node.data as FlowNodeData;
      return {
        ...node,
        data: {
          ...d,
          isFiltered: !activeActors.has(d.actor),
          debugMode,
        },
      };
    });
  }, [activeActors, debugMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(enrichedNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(enrichedNodes);
  }, [enrichedNodes, setNodes]);

  const jumpToSearch = useCallback(() => {
    if (!searchQuery) return;
    const match = flowNodes.find((node) => {
      const d = node.data as FlowNodeData;
      return (
        d.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.route ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.edgeFunctions ?? []).some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
    if (match) {
      setCenter(match.position.x + 130, match.position.y + 60, { zoom: 1.2, duration: 600 });
    }
  }, [searchQuery, setCenter]);

  useEffect(() => {
    onSearchRef(jumpToSearch);
  }, [jumpToSearch, onSearchRef]);

  const onConnect = useCallback((_: Connection) => {
    // read-only — no new connections
  }, []);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick({ id: node.id, data: node.data as FlowNodeData });
    },
    [onNodeClick],
  );

  const handlePaneClick = useCallback(() => {
    onNodeClick(null);
  }, [onNodeClick]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.04}
        maxZoom={2}
        style={{ width: '100%', height: '100%', background: '#F3F3EE' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#D1D5DB" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as FlowNodeData;
            return d ? ACTOR_COLORS[d.actor] : '#E5E7EB';
          }}
          maskColor="rgba(243,243,238,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
