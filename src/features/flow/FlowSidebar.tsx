import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlowNodeData, Actor } from './types';
import { ACTOR_COLORS, ACTOR_LABELS, CONFIDENCE_CONFIG } from './types';

interface Props {
  node: { id: string; data: FlowNodeData } | null;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Tag({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, color, background: bg, padding: '2px 8px', borderRadius: 4, marginRight: 4, marginBottom: 4, fontFamily: 'monospace' }}>
      {text}
    </span>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, color, background: `${color}15`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 9999, marginRight: 4, marginBottom: 4 }}>
      {text}
    </span>
  );
}

export default function FlowSidebar({ node, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const d = node?.data;
  const color = d ? ACTOR_COLORS[d.actor] : '#1E9A80';
  const conf = d ? CONFIDENCE_CONFIG[d.confidence] : CONFIDENCE_CONFIG.confirmed;

  return (
    <AnimatePresence>
      {node && d && (
        <motion.div
          key="sidebar"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            background: '#FFFFFF',
            borderLeft: '1px solid #E5E7EB',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
            overflowY: 'auto',
            zIndex: 50,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid #E5E7EB', padding: '20px 24px', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color, background: `${color}15`, padding: '2px 8px', borderRadius: 4,
                    }}
                  >
                    {ACTOR_LABELS[d.actor as Actor]}
                  </span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      color: conf.color, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: conf.dot, display: 'inline-block' }} />
                    {conf.label}
                  </span>
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: 1.3 }}>
                  {d.label}
                </h2>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: 4, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            {/* Description */}
            <Section title="What it does">
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, margin: 0 }}>
                {d.description}
              </p>
            </Section>

            {/* Route */}
            {d.route && (
              <Section title="Route / URL">
                <code style={{ fontSize: 12, color: '#1E9A80', background: '#ECFDF5', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace' }}>
                  {d.route}
                </code>
              </Section>
            )}

            {/* Files */}
            {d.files && d.files.length > 0 && (
              <Section title="Source files">
                <div>
                  {d.files.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>📄</span>
                      <code style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{f}</code>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Tables */}
            {d.tables && d.tables.length > 0 && (
              <Section title="Database tables">
                <div>
                  {d.tables.map((t) => (
                    <Tag key={t} text={t} color="#1A1A1A" bg="#F3F3EE" />
                  ))}
                </div>
              </Section>
            )}

            {/* Edge Functions */}
            {d.edgeFunctions && d.edgeFunctions.length > 0 && (
              <Section title="Edge functions">
                <div>
                  {d.edgeFunctions.map((fn) => (
                    <Tag key={fn} text={fn} color="#7C3AED" bg="#F5F3FF" />
                  ))}
                </div>
              </Section>
            )}

            {/* Webhooks */}
            {d.webhooks && d.webhooks.length > 0 && (
              <Section title="Webhooks">
                <div>
                  {d.webhooks.map((w) => (
                    <Pill key={w} text={w} color="#F59E0B" />
                  ))}
                </div>
              </Section>
            )}

            {/* Integrations */}
            {d.integrations && d.integrations.length > 0 && (
              <Section title="Integrations">
                <div>
                  {d.integrations.map((i) => (
                    <Pill key={i} text={i} color="#6B7280" />
                  ))}
                </div>
              </Section>
            )}

            {/* Called by */}
            {d.calledBy && d.calledBy.length > 0 && (
              <Section title="Called by">
                <div>
                  {d.calledBy.map((c) => (
                    <Tag key={c} text={c} color="#3B82F6" bg="#EFF6FF" />
                  ))}
                </div>
              </Section>
            )}

            {/* Calls to */}
            {d.callsTo && d.callsTo.length > 0 && (
              <Section title="Calls to">
                <div>
                  {d.callsTo.map((c) => (
                    <Tag key={c} text={c} color="#1E9A80" bg="#ECFDF5" />
                  ))}
                </div>
              </Section>
            )}

            {/* Risks */}
            {d.risks && d.risks.length > 0 && (
              <Section title="Known risks">
                <div>
                  {d.risks.map((r) => (
                    <div key={r} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FCD34D' }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>⚠️</span>
                      <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Gaps */}
            {d.gaps && d.gaps.length > 0 && (
              <Section title="Gaps / unverified">
                <div>
                  {d.gaps.map((g) => (
                    <div key={g} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>🔴</span>
                      <span style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5 }}>{g}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
