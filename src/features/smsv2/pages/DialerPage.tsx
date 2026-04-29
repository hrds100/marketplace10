import { CallerToastsProvider } from '@/features/caller/store/toastsProvider';
import { CallerPad } from '@/features/caller/pages/DialerPage';

export default function DialerPage() {
  return (
    <CallerToastsProvider>
      <CallerPad />
    </CallerToastsProvider>
  );
}
