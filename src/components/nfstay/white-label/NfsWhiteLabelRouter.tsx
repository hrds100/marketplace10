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
// Traveler pages — reused for nfstay.app main site
import NfsMainSiteLayout from '@/components/nfstay/NfsMainSiteLayout';
import NfsSearch from '@/pages/nfstay/NfsSearch';
import NfsPropertyView from '@/pages/nfstay/NfsPropertyView';
import NfsPaymentSuccess from '@/pages/nfstay/NfsPaymentSuccess';
import NfsPaymentCancel from '@/pages/nfstay/NfsPaymentCancel';
import NfsTravelerReservations from '@/pages/nfstay/NfsTravelerReservations';

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

  // nfstay.app → render traveler-facing routes wrapped in main site layout
  if (isMainSite) {
    return (
      <Routes>
        <Route element={<NfsMainSiteLayout />}>
          <Route index element={<NfsSearch />} />
          <Route path="/search" element={<NfsSearch />} />
          <Route path="/property/:id" element={<NfsPropertyView />} />
          <Route path="/reservations" element={<NfsTravelerReservations />} />
          <Route path="/payment/success" element={<NfsPaymentSuccess />} />
          <Route path="/payment/cancel" element={<NfsPaymentCancel />} />
          <Route path="*" element={<NfsSearch />} />
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
