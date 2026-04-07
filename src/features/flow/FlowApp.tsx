import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ReactFlowProvider } from '@xyflow/react';
import type { Actor, FlowNodeData } from './types';
import { ACTOR_COLORS } from './types';
import FlowToolbar from './FlowToolbar';
import FlowCanvas from './FlowCanvas';
import FlowSidebar from './FlowSidebar';

const ALL_ACTORS: Actor[] = ['tenant', 'landlord', 'admin', 'system', 'payment', 'crypto', 'booking', 'integration'];

export default function FlowApp() {
  const [activeActors, setActiveActors] = useState<Set<Actor>>(new Set(ALL_ACTORS));
  const [debugMode, setDebugMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<{ id: string; data: FlowNodeData } | null>(null);
  const searchJumpRef = useRef<(() => void) | null>(null);

  const handleToggleActor = useCallback((actor: Actor) => {
    setActiveActors((prev) => {
      const next = new Set(prev);
      if (next.has(actor)) {
        next.delete(actor);
      } else {
        next.add(actor);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setActiveActors(new Set(ALL_ACTORS));
  }, []);

  const handleSearchRef = useCallback((fn: () => void) => {
    searchJumpRef.current = fn;
  }, []);

  const handleSearchJump = useCallback(() => {
    searchJumpRef.current?.();
  }, []);

  return (
    <ReactFlowProvider>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'fixed', inset: 0, background: '#F3F3EE' }}
    >
      {/* Actor legend strip */}
      <div
        style={{
          position: 'fixed',
          bottom: 80,
          left: 24,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {ALL_ACTORS.map((actor) => (
          <div key={actor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACTOR_COLORS[actor], flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'capitalize', fontFamily: 'Inter, sans-serif' }}>
              {actor}
            </span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <FlowToolbar
        activeActors={activeActors}
        onToggleActor={handleToggleActor}
        onSelectAll={handleSelectAll}
        debugMode={debugMode}
        onToggleDebug={() => setDebugMode((d) => !d)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSearchJump={handleSearchJump}
      />

      {/* Canvas */}
      <FlowCanvas
        activeActors={activeActors}
        debugMode={debugMode}
        searchQuery={searchQuery}
        onNodeClick={setSelectedNode}
        onSearchRef={handleSearchRef}
      />

      {/* Sidebar */}
      <FlowSidebar node={selectedNode} onClose={() => setSelectedNode(null)} />
    </motion.div>
    </ReactFlowProvider>
  );
}
