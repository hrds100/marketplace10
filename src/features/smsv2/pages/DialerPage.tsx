import { useEffect, useRef } from 'react';
import { CallerToastsProvider } from '../caller-pad/store/toastsProvider';
import { CallerPad } from '../caller-pad/CallerPad';
import LiveCallScreen from '../components/live-call/LiveCallScreen';
import { useActiveCallCtx } from '../components/live-call/ActiveCallContext';

function DialerInner() {
  const { setFullScreen } = useActiveCallCtx();
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      setFullScreen(true);
    }
    return () => setFullScreen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
