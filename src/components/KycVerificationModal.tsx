import { useEffect, useRef, useCallback } from 'react';
import { MESSAGES } from '@veriff/incontext-sdk';
import { X } from 'lucide-react';

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
  const scriptsLoadedRef = useRef(false);

  const initVeriff = useCallback(() => {
    if (!window.Veriff || mountedRef.current) return;

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
  }, [walletAddress, saveSession, onClose, onVerificationComplete]);

  useEffect(() => {
    if (!open) {
      mountedRef.current = false;
      return;
    }

    if (scriptsLoadedRef.current) {
      const timer = setTimeout(() => initVeriff(), 100);
      return () => clearTimeout(timer);
    }

    const script1 = document.createElement('script');
    script1.src = 'https://cdn.veriff.me/sdk/js/1.5/veriff.min.js';
    script1.async = true;
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://cdn.veriff.me/incontext/js/v1/veriff.js';
    script2.async = true;
    document.body.appendChild(script2);

    script2.onload = () => {
      scriptsLoadedRef.current = true;
      initVeriff();
    };
  }, [open, initVeriff]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md mx-4 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F3EE] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Identity Verification</h2>
          <p className="text-sm text-[#6B7280] mt-1">
            One-time verification to claim rental income.
          </p>
        </div>

        {/* Veriff widget container */}
        <div className="px-6 pb-6">
          <div id="veriff-root" className="flex flex-col items-center [&_button]:!bg-[#1E9A80] [&_button]:!rounded-[10px] [&_button]:!font-medium [&_form]:!text-center" />
        </div>
      </div>
    </div>
  );
}
