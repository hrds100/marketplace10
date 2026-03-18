// NFStay White-Label Router
// Renders white-label routes when on a subdomain/custom domain,
// otherwise renders normal app routes (marketplace10 + operator dashboard).

import { type ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import NfsWhiteLabelLayout from './NfsWhiteLabelLayout';
import NfsWlLanding from '@/pages/nfstay/white-label/NfsWlLanding';
import NfsWlSearch from '@/pages/nfstay/white-label/NfsWlSearch';
import NfsWlProperty from '@/pages/nfstay/white-label/NfsWlProperty';
import NfsWlPaymentSuccess from '@/pages/nfstay/white-label/NfsWlPaymentSuccess';
import NfsWlPaymentCancel from '@/pages/nfstay/white-label/NfsWlPaymentCancel';

interface Props {
  /** Normal app routes (marketplace10 + NFStay operator) */
  children: ReactNode;
}

export default function NfsWhiteLabelRouter({ children }: Props) {
  const { isWhiteLabel, loading } = useNfsWhiteLabel();

  // While detecting mode, show nothing (prevents flash)
  if (loading && isWhiteLabel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not white-label → render normal app routes unchanged
  if (!isWhiteLabel) {
    return <>{children}</>;
  }

  // White-label mode → render white-label routes
  return (
    <Routes>
      <Route element={<NfsWhiteLabelLayout />}>
        <Route index element={<NfsWlLanding />} />
        <Route path="/search" element={<NfsWlSearch />} />
        <Route path="/property/:id" element={<NfsWlProperty />} />
        <Route path="/payment/success" element={<NfsWlPaymentSuccess />} />
        <Route path="/payment/cancel" element={<NfsWlPaymentCancel />} />
        <Route path="*" element={<NfsWlLanding />} />
      </Route>
    </Routes>
  );
}
