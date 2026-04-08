import { Component, type ReactNode, useState } from 'react';
import MotionPasswordGate from '@/features/motion/MotionPasswordGate';

class MotionErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#F3F3EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, monospace',
            padding: 40,
          }}
        >
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 12,
              padding: '24px 28px',
              maxWidth: 600,
              width: '100%',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
              Motion Studio crashed — copy this error:
            </div>
            <pre
              style={{
                fontSize: 12,
                color: '#7F1D1D',
                background: '#FFF1F1',
                borderRadius: 8,
                padding: 16,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                marginTop: 16,
                padding: '8px 20px',
                background: '#1E9A80',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MotionStudio() {
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F3F3EE' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid #E5E7EB',
              borderTopColor: '#1E9A80',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: 14, color: '#6B7280' }}>Loading Motion Studio...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <iframe
        src="https://motion.nfstay.com"
        onLoad={() => setLoading(false)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
        allow="clipboard-write; clipboard-read"
        title="Motion Studio"
      />
    </div>
  );
}

export default function MotionPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('motion_unlocked') === '1',
  );

  if (!unlocked) {
    return <MotionPasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <MotionErrorBoundary>
      <MotionStudio />
    </MotionErrorBoundary>
  );
}
