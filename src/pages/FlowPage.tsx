import { Component, type ReactNode, useState } from 'react';
import FlowPasswordGate from '@/features/flow/FlowPasswordGate';
import FlowApp from '@/features/flow/FlowApp';

class FlowErrorBoundary extends Component<
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
              Flow page crashed — copy this error:
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

export default function FlowPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('flow_unlocked') === '1',
  );

  if (!unlocked) {
    return <FlowPasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <FlowErrorBoundary>
      <FlowApp />
    </FlowErrorBoundary>
  );
}
