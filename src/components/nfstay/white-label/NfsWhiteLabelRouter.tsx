// nfstay White-Label Router
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
// Main site pages — nfstay.app traveler-facing
import { Navigate } from 'react-router-dom';
import NfsMainLayout from '@/components/nfstay/main-site/NfsMainLayout';
import NfsMainLanding from '@/pages/nfstay/NfsMainLanding';
import NfsSearchPage from '@/pages/nfstay/NfsSearchPage';
import NfsPropertyView from '@/pages/nfstay/NfsPropertyView';
import NfsPaymentSuccess from '@/pages/nfstay/NfsPaymentSuccess';
import NfsPaymentCancel from '@/pages/nfstay/NfsPaymentCancel';
// Operator dashboard — also accessible from nfstay.app/nfstay
import NfsOperatorLayout from '@/components/nfstay/NfsOperatorLayout';
import NfsOperatorDashboard from '@/pages/nfstay/NfsOperatorDashboard';
import NfsOnboarding from '@/pages/nfstay/NfsOnboarding';
import NfsOperatorSettings from '@/pages/nfstay/NfsOperatorSettings';
import NfsProperties from '@/pages/nfstay/NfsProperties';
import NfsPropertyNew from '@/pages/nfstay/NfsPropertyNew';
import NfsPropertyDetail from '@/pages/nfstay/NfsPropertyDetail';
import NfsReservations from '@/pages/nfstay/NfsReservations';
import NfsReservationDetail from '@/pages/nfstay/NfsReservationDetail';
import NfsCreateReservation from '@/pages/nfstay/NfsCreateReservation';
import NfsAnalytics from '@/pages/nfstay/NfsAnalytics';
// Booking flow — checkout + guest lookup
import NfsCheckoutPage from '@/pages/nfstay/NfsCheckoutPage';
import NfsGuestBookingLookup from '@/pages/nfstay/NfsGuestBookingLookup';
// Auth — needed so operators can sign in from nfstay.app
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import VerifyOtp from '@/pages/VerifyOtp';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

interface Props {
  /** Normal app routes (marketplace10 + nfstay operator) */
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

  // nfstay.app → render main site (traveler pages) + operator dashboard + auth
  if (isMainSite) {
    return (
      <Routes>
        {/* ── Traveler-facing pages — wrapped in NfsMainLayout (navbar + footer) ── */}
        <Route element={<NfsMainLayout />}>
          <Route index element={<NfsMainLanding />} />
          <Route path="/search" element={<NfsSearchPage />} />
          <Route path="/property/:id" element={<NfsPropertyView />} />
          <Route path="/payment/success" element={<NfsPaymentSuccess />} />
          <Route path="/payment/cancel" element={<NfsPaymentCancel />} />
        </Route>

        {/* ── Booking flow — standalone pages ── */}
        <Route path="/checkout" element={<NfsCheckoutPage />} />
        <Route path="/booking" element={<NfsGuestBookingLookup />} />

        {/* ── Auth pages — standalone (no main layout) ── */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Operator dashboard — nfstay.app/nfstay/* ── */}
        <Route path="/nfstay" element={<NfsOperatorLayout />}>
          <Route index element={<NfsOperatorDashboard />} />
          <Route path="onboarding" element={<NfsOnboarding />} />
          <Route path="properties" element={<NfsProperties />} />
          <Route path="properties/new" element={<NfsPropertyNew />} />
          <Route path="properties/:id" element={<NfsPropertyDetail />} />
          <Route path="reservations" element={<NfsReservations />} />
          <Route path="reservations/:id" element={<NfsReservationDetail />} />
          <Route path="create-reservation" element={<NfsCreateReservation />} />
          <Route path="settings" element={<NfsOperatorSettings />} />
          <Route path="analytics" element={<NfsAnalytics />} />
        </Route>
        {/* Traveler-facing nfstay search/property (standalone, no operator layout) */}
        <Route path="/nfstay/search" element={<Navigate to="/nfstay" replace />} />
        <Route path="/nfstay/property/:id" element={<NfsPropertyView />} />
        <Route path="/nfstay/payment/success" element={<NfsPaymentSuccess />} />
        <Route path="/nfstay/payment/cancel" element={<NfsPaymentCancel />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
