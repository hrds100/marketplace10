import { motion, AnimatePresence } from 'framer-motion';
import type { PlayModeState, PlayModeActions, PlaySpeed } from './usePlayMode';
import type { FlowNodeData } from './types';
import type { Node } from '@xyflow/react';

interface Props {
  play: PlayModeState & PlayModeActions;
  nodes: Node[];
}

export default function FlowJourneyPanel({ play, nodes }: Props) {
  const { active, path, index, playing, speed, activeNodeId, stop, stepPrev, stepNext, play: doPlay, pause, setSpeed } = play;

  const currentNode = nodes.find(n => n.id === activeNodeId);
  const data = currentNode?.data as FlowNodeData | undefined;

  const progress = path.length > 1 ? index / (path.length - 1) : 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="journey-panel"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            width: 'min(680px, 95vw)',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Progress bar */}
          <div style={{ height: 3, background: '#F3F3EE', position: 'relative' }}>
            <motion.div
              style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                background: '#1E9A80', borderRadius: 999,
              }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Step info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#1E9A80', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                }}>
                  Step {index + 1} / {path.length}
                </span>
                {data?.actor && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {data.actor}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data?.label ?? activeNodeId}
              </div>
              {data?.description && (
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                  {data.description}
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                onClick={stepPrev}
                disabled={index === 0}
                style={btnStyle(index === 0)}
                title="Previous step"
              >
                ◀
              </button>

              <button
                onClick={playing ? pause : doPlay}
                disabled={index >= path.length - 1 && !playing}
                style={{
                  ...btnStyle(false),
                  background: '#1E9A80', color: '#FFFFFF',
                  border: '1px solid #1E9A80',
                  width: 40, height: 40,
                  fontSize: 16,
                }}
                title={playing ? 'Pause' : 'Play'}
              >
                {playing ? '⏸' : '▶'}
              </button>

              <button
                onClick={stepNext}
                disabled={index >= path.length - 1}
                style={btnStyle(index >= path.length - 1)}
                title="Next step"
              >
                ▶▶
              </button>

              {/* Speed */}
              <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                {(['slow', 'normal', 'fast'] as PlaySpeed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '4px 8px',
                      borderRadius: 6, border: '1px solid',
                      cursor: 'pointer', transition: 'all 0.15s',
                      borderColor: speed === s ? '#1E9A80' : '#E5E7EB',
                      background: speed === s ? '#ECFDF5' : '#FFFFFF',
                      color: speed === s ? '#1E9A80' : '#9CA3AF',
                    }}
                  >
                    {s === 'slow' ? '0.5×' : s === 'normal' ? '1×' : '2×'}
                  </button>
                ))}
              </div>

              {/* Close */}
              <button
                onClick={stop}
                style={{ ...btnStyle(false), marginLeft: 4, fontSize: 14, color: '#9CA3AF' }}
                title="Exit journey mode"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: disabled ? '#F9FAFB' : '#FFFFFF',
    color: disabled ? '#D1D5DB' : '#6B7280',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    flexShrink: 0,
  };
}
