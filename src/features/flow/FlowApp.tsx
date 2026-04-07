import { useState, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ReactFlowProvider } from '@xyflow/react';
import type { Actor, FlowNodeData } from './types';
import { ACTOR_COLORS } from './types';
import FlowToolbar from './FlowToolbar';
import FlowCanvas from './FlowCanvas';
import FlowSidebar from './FlowSidebar';
import FlowJourneyPanel from './FlowJourneyPanel';
import type { ViewMode } from './views';
import { usePlayMode } from './usePlayMode';
import { flowEdges } from './data/edges';
import { flowNodes } from './data/nodes';

const ALL_ACTORS: Actor[] = ['tenant', 'landlord', 'admin', 'system', 'payment', 'crypto', 'booking', 'integration'];

export default function FlowApp() {
  const [activeActors, setActiveActors] = useState<Set<Actor>>(new Set(ALL_ACTORS));
  const [debugMode, setDebugMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: FlowNodeData } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const searchJumpRef = useRef<(() => void) | null>(null);

  const playMode = usePlayMode(flowEdges);

  // Compute 1-hop neighbors of focused node
  const neighborIds = useMemo(() => {
    if (!focusedNodeId) return new Set<string>();
    const neighbors = new Set<string>();
    for (const e of flowEdges) {
      if (e.source === focusedNodeId) neighbors.add(e.target);
      if (e.target === focusedNodeId) neighbors.add(e.source);
    }
    return neighbors;
  }, [focusedNodeId]);

  const handleToggleActor = useCallback((actor: Actor) => {
    setActiveActors(prev => {
      const next = new Set(prev);
      if (next.has(actor)) next.delete(actor); else next.add(actor);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => setActiveActors(new Set(ALL_ACTORS)), []);

  const handleSearchRef = useCallback((fn: () => void) => {
    searchJumpRef.current = fn;
  }, []);

  const handleSearchJump = useCallback(() => {
    searchJumpRef.current?.();
  }, []);

  const handleNodeClick = useCallback((node: { id: string; data: FlowNodeData } | null) => {
    if (!node) {
      setSelectedNode(null);
      setFocusedNodeId(null);
      return;
    }
    setSelectedNode(node);
    setFocusedNodeId(node.id);
  }, []);

  const handleViewChange = useCallback((v: ViewMode) => {
    setViewMode(v);
    setFocusedNodeId(null);
    setSelectedNode(null);
    if (!playMode.active) return;
    playMode.stop();
  }, [playMode]);

  const handlePlayFromNode = useCallback((nodeId: string) => {
    const view = VIEW_MAP.get(viewMode);
    const visibleIds = view && viewMode !== 'full' ? new Set(view.nodeIds) : undefined;
    playMode.startFrom(nodeId, visibleIds);
  }, [viewMode, playMode]);

  return (
    <ReactFlowProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ position: 'fixed', inset: 0, background: '#F3F3EE' }}
      >
        {/* Actor colour legend — bottom left */}
        <div style={{
          position: 'fixed', bottom: 80, left: 20, zIndex: 30,
          display: 'flex', flexDirection: 'column', gap: 5,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
          border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {ALL_ACTORS.map(actor => (
            <div key={actor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACTOR_COLORS[actor], flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'capitalize', fontFamily: 'Inter, sans-serif' }}>
                {actor}
              </span>
            </div>
          ))}
        </div>

        <FlowToolbar
          activeActors={activeActors}
          onToggleActor={handleToggleActor}
          onSelectAll={handleSelectAll}
          debugMode={debugMode}
          onToggleDebug={() => setDebugMode(d => !d)}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSearchJump={handleSearchJump}
          viewMode={viewMode}
          onViewChange={handleViewChange}
        />

        <FlowCanvas
          activeActors={activeActors}
          debugMode={debugMode}
          searchQuery={searchQuery}
          viewMode={viewMode}
          focusedNodeId={focusedNodeId}
          neighborIds={neighborIds}
          playMode={playMode}
          onNodeClick={handleNodeClick}
          onSearchRef={handleSearchRef}
        />

        <FlowSidebar
          node={selectedNode}
          onClose={() => { setSelectedNode(null); setFocusedNodeId(null); }}
          onPlayFromHere={handlePlayFromNode}
        />

        <FlowJourneyPanel
          play={playMode}
          nodes={flowNodes}
        />
      </motion.div>
    </ReactFlowProvider>
  );
}
