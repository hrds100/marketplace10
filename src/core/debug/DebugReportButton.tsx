import { Bug } from 'lucide-react';
import { useDebugActivation } from './useDebugActivation';
import { serializeDebugReport } from './debugSerializer';

export default function DebugReportButton() {
  // Hook must be called unconditionally — kill switch is enforced inside the hook
  const active = useDebugActivation();

  if (import.meta.env.VITE_DEBUG_REPORT_ENABLED !== 'true') return null;
  if (!active) return null;

  const handleClick = () => {
    const json = serializeDebugReport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfstay-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleClick}
      title="Download debug report"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
        width: 44, height: 44, borderRadius: '50%',
        background: '#1A1A1A', color: '#FFFFFF', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <Bug size={18} />
    </button>
  );
}
