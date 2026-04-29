import { useEffect } from 'react';
import { CallerToastsProvider } from '@/features/caller/store/toastsProvider';
import { CallerPad } from '@/features/caller/pages/DialerPage';
import LiveCallScreen from '../components/live-call/LiveCallScreen';
import { useActiveCallCtx } from '../components/live-call/ActiveCallContext';

function DialerInner() {
  const { setFullScreen } = useActiveCallCtx();

  useEffect(() => {
    setFullScreen(true);
    return () => setFullScreen(false);
  }, [setFullScreen]);

  return (
    <>
      <LiveCallScreen />
      <CallerPad />
    </>
  );
}

export default function DialerPage() {
  return (
    <CallerToastsProvider>
      <DialerInner />
    </CallerToastsProvider>
  );
}
