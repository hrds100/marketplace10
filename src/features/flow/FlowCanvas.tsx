import { useCallback, useMemo, useEffect, useRef } from 'react';
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
import type { ViewMode } from './views';
import { VIEW_MAP } from './views';
import { computeLayoutPositions } from './lib/layout';
import type { PlayModeState } from './usePlayMode';

const nodeTypes: NodeTypes = {
  businessNode: BusinessNode,
  decisionNode: DecisionNode,
  systemNode: SystemNode,
};

interface Props {
  activeActors: Set<Actor>;
  debugMode: boolean;
  searchQuery: string;
  viewMode: ViewMode;
  focusedNodeId: string | null;
  neighborIds: Set<string>;
  playMode: PlayModeState;
  onNodeClick: (node: { id: string; data: FlowNodeData } | null) => void;
  onSearchRef: (fn: () => void) => void;
}

export default function FlowCanvas({
  activeActors,
  debugMode,
  searchQuery,
  viewMode,
  focusedNodeId,
  neighborIds,
  playMode,
  onNodeClick,
  onSearchRef,
}: Props) {
  const { setCenter, fitView } = useReactFlow();
  const prevViewRef = useRef<ViewMode | null>(null);

  // Determine which nodes to show + their layout positions
  const { visibleNodeIds, layoutPositions } = useMemo(() => {
    const view = VIEW_MAP.get(viewMode);
    if (!view || viewMode === 'full' || view.nodeIds.length === 0) {
      return { visibleNodeIds: null, layoutPositions: {} };
    }
    const ids = view.nodeIds;
    const positions = computeLayoutPositions(ids, flowEdges);
    return { visibleNodeIds: new Set(ids), layoutPositions: positions };
  }, [viewMode]);

  // Enrich nodes with visual state
  const enrichedNodes = useMemo(() => {
    const inPlay = playMode.active;
    const inFocus = !inPlay && focusedNodeId !== null;

    return flowNodes
      .filter(node => visibleNodeIds === null || visibleNodeIds.has(node.id))
      .map(node => {
        const d = node.data as FlowNodeData;
        const pos = layoutPositions[node.id] ?? node.position;

        let isDimmed = false;
        let isActive = false;

        if (inPlay) {
          isActive = node.id === playMode.activeNodeId;
          isDimmed = !playMode.visitedIds.has(node.id) && node.id !== playMode.activeNodeId
            && !playMode.path.includes(node.id);
        } else if (inFocus) {
          isDimmed = node.id !== focusedNodeId && !neighborIds.has(node.id);
        }

        return {
          ...node,
          position: pos,
          data: {
            ...d,
            isFiltered: !activeActors.has(d.actor),
            isDimmed,
            isActive,
            debugMode,
          },
        };
      });
  }, [visibleNodeIds, layoutPositions, activeActors, debugMode, focusedNodeId, neighborIds, playMode]);

  // Enrich edges with focus/play highlighting
  const enrichedEdges = useMemo(() => {
    const inPlay = playMode.active;
    const inFocus = !inPlay && focusedNodeId !== null;

    return flowEdges
      .filter(e => {
        if (!visibleNodeIds) return true;
        return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
      })
      .map(e => {
        if (inPlay) {
          const onPath = playMode.path.includes(e.source) && playMode.path.includes(e.target);
          const isActive = playMode.activeEdgeIds.has(e.id);
          return {
            ...e,
            animated: isActive || e.animated,
            style: {
              ...e.style,
              opacity: onPath ? 1 : 0.06,
              stroke: isActive ? '#1E9A80' : onPath ? (e.style as React.CSSProperties)?.stroke : '#D1D5DB',
              strokeWidth: isActive ? 2.5 : onPath ? 1.5 : 1,
            },
          };
        }
        if (inFocus) {
          const relevant = e.source === focusedNodeId || e.target === focusedNodeId;
          return {
            ...e,
            style: {
              ...e.style,
              opacity: relevant ? 1 : 0.06,
              strokeWidth: relevant ? 2 : 1,
            },
          };
        }
        return e;
      });
  }, [visibleNodeIds, focusedNodeId, playMode, flowEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(enrichedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(enrichedEdges);

  useEffect(() => { setNodes(enrichedNodes); }, [enrichedNodes, setNodes]);
  useEffect(() => { setEdges(enrichedEdges); }, [enrichedEdges, setEdges]);

  // Fit view when view mode changes
  useEffect(() => {
    if (prevViewRef.current === viewMode) return;
    prevViewRef.current = viewMode;
    setTimeout(() => fitView({ padding: 0.15, duration: 700 }), 80);
  }, [viewMode, fitView]);

  // Pan camera to active play node
  useEffect(() => {
    if (!playMode.activeNodeId) return;
    const node = enrichedNodes.find(n => n.id === playMode.activeNodeId);
    if (node) {
      setCenter(node.position.x + 130, node.position.y + 60, { zoom: 1.3, duration: 500 });
    }
  }, [playMode.activeNodeId, enrichedNodes, setCenter]);

  // Pan camera to focused node
  useEffect(() => {
    if (!focusedNodeId) return;
    const node = enrichedNodes.find(n => n.id === focusedNodeId);
    if (node) {
      setCenter(node.position.x + 130, node.position.y + 60, { zoom: 1.3, duration: 500 });
    }
  }, [focusedNodeId, enrichedNodes, setCenter]);

  // Search jump
  const jumpToSearch = useCallback(() => {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const match = flowNodes.find(node => {
      const d = node.data as FlowNodeData;
      return (
        d.label.toLowerCase().includes(q) ||
        (d.route ?? '').toLowerCase().includes(q) ||
        (d.edgeFunctions ?? []).some(f => f.toLowerCase().includes(q))
      );
    });
    if (match) {
      setCenter(match.position.x + 130, match.position.y + 60, { zoom: 1.2, duration: 600 });
    }
  }, [searchQuery, setCenter]);

  useEffect(() => { onSearchRef(jumpToSearch); }, [jumpToSearch, onSearchRef]);

  const onConnect = useCallback((_: Connection) => {}, []);

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
      <style>{`
        @keyframes pulse-ring {
          0% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
      `}</style>
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
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.04}
        maxZoom={2}
        style={{ width: '100%', height: '100%', background: '#F3F3EE' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#D1D5DB" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={node => {
            const d = node.data as FlowNodeData;
            if (!d) return '#E5E7EB';
            if (d.isDimmed) return '#E5E7EB';
            if (d.isActive) return '#1E9A80';
            return ACTOR_COLORS[d.actor];
          }}
          maskColor="rgba(243,243,238,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
