// NFStay White-Label Router
// Renders white-label routes when on a subdomain/custom domain,
// traveler routes when on nfstay.app,
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
// Main site pages — nfstay.app
import NfsMainLayout from '@/components/nfstay/main-site/NfsMainLayout';
import NfsMainLanding from '@/pages/nfstay/NfsMainLanding';
import NfsSearch from '@/pages/nfstay/NfsSearch';
import NfsPropertyView from '@/pages/nfstay/NfsPropertyView';
import NfsPaymentSuccess from '@/pages/nfstay/NfsPaymentSuccess';
import NfsPaymentCancel from '@/pages/nfstay/NfsPaymentCancel';

interface Props {
  /** Normal app routes (marketplace10 + NFStay operator) */
  children: ReactNode;
}

export default function NfsWhiteLabelRouter({ children }: Props) {
  const { isWhiteLabel, isMainSite, loading } = useNfsWhiteLabel();

  // While detecting mode, show nothing (prevents flash)
  if (loading && (isWhiteLabel || isMainSite)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // nfstay.app → render main site with layout (navbar + footer)
  if (isMainSite) {
    return (
      <Routes>
        <Route element={<NfsMainLayout />}>
          <Route index element={<NfsMainLanding />} />
          <Route path="/search" element={<NfsSearch />} />
          <Route path="/property/:id" element={<NfsPropertyView />} />
          <Route path="/payment/success" element={<NfsPaymentSuccess />} />
          <Route path="/payment/cancel" element={<NfsPaymentCancel />} />
          <Route path="*" element={<NfsMainLanding />} />
        </Route>
      </Routes>
    );
  }

  // Not white-label and not main site → render normal app routes unchanged
  // This is the hub.nfstay.com + localhost path
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
