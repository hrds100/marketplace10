import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MESSAGES } from '@veriff/incontext-sdk';

// Extend window for Veriff SDK globals loaded via CDN
declare global {
  interface Window {
    Veriff: (config: {
      host: string;
      apiKey: string;
      parentId: string;
      onSession: (err: unknown, response: { verification: { id: string; url: string } }) => void;
    }) => { setParams: (params: Record<string, unknown>) => void; mount: () => void };
    veriffSDK: {
      createVeriffFrame: (config: {
        url: string;
        onEvent: (msg: string) => void;
      }) => void;
    };
  }
}

interface KycVerificationModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  saveSession: (walletAddress: string, sessionId: string) => Promise<void>;
  onVerificationComplete: () => void;
}

export default function KycVerificationModal({
  open,
  onClose,
  walletAddress,
  saveSession,
  onVerificationComplete,
}: KycVerificationModalProps) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!open || mountedRef.current) return;

    // Load Veriff SDK scripts dynamically
    const script1 = document.createElement('script');
    script1.src = 'https://cdn.veriff.me/sdk/js/1.5/veriff.min.js';
    script1.async = true;
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://cdn.veriff.me/incontext/js/v1/veriff.js';
    script2.async = true;
    document.body.appendChild(script2);

    script2.onload = () => {
      if (!window.Veriff) return;

      mountedRef.current = true;

      const veriff = window.Veriff({
        host: 'https://stationapi.veriff.com',
        apiKey: import.meta.env.VITE_INV_VERIFF_API_KEY,
        parentId: 'veriff-root',
        onSession: async (err, response) => {
          if (err) return;
          try {
            await saveSession(walletAddress, response.verification.id);
            window.veriffSDK.createVeriffFrame({
              url: response.verification.url,
              onEvent: (msg: string) => {
                if (msg === MESSAGES.FINISHED) {
                  onClose();
                  onVerificationComplete();
                }
              },
            });
          } catch (e) {
            console.error('Veriff session save failed:', e);
          }
        },
      });

      veriff.setParams({
        person: { givenName: ' ', lastName: ' ' },
        vendorData: walletAddress,
      });

      veriff.mount();
    };

    return () => {
      mountedRef.current = false;
    };
  }, [open, walletAddress, saveSession, onClose, onVerificationComplete]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Identity Verification Required</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            To claim your rental income, we need to verify your identity. This is a one-time process.
          </DialogDescription>
        </DialogHeader>
        <div id="veriff-root" className="min-h-[300px] flex items-center justify-center" />
      </DialogContent>
    </Dialog>
  );
}
