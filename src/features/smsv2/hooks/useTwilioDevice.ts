// STUB — Phase 0 mock. Replaced with @twilio/voice-sdk integration in Phase 1.
import { useState } from 'react';

export type DeviceStatus = 'idle' | 'registering' | 'ready' | 'error';

export function useTwilioDevice() {
  const [status] = useState<DeviceStatus>('ready');
  const [muted, setMuted] = useState(false);

  return {
    status,
    muted,
    setMuted,
    dial: (phone: string) => {
      console.log('[mock] dialing', phone);
    },
    hangup: () => {
      console.log('[mock] hangup');
    },
    sendDigits: (digits: string) => {
      console.log('[mock] dtmf', digits);
    },
  };
}
