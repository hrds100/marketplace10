import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
// i18n — must be imported before any component that uses useTranslation
import '@/core/i18n/i18n';
import '@/core/runtime/preloadErrorHandler';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// Auth
import MagicLoginPage from "@/features/landlord/MagicLoginPage";
import SignIn from "@/features/auth/SignIn";
import SignUp from "@/features/auth/SignUp";
import VerifyOtp from "@/features/auth/VerifyOtp";
import ForgotPassword from "@/features/auth/ForgotPassword";
import ResetPassword from "@/features/auth/ResetPassword";
// Static pages (stay in src/pages/)
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import FlowPage from "./pages/FlowPage";
import AdsLibraryPage from "@/features/ads/AdsLibraryPage";

import ApplyPage from "./pages/ApplyPage";
// Layouts (stay in src/layouts/ — locked)
import DashboardLayout from "./layouts/DashboardLayout";
// Features
import DealsPage from "@/features/deals/DealsPage";
import DealDetail from "@/features/deals/DealDetail";
import CRMPage from "@/features/crm/CRMPage";
import UniversityPage from "@/features/university/UniversityPage";
import ModuleOverviewPage from "@/features/university/ModuleOverviewPage";
import LessonPage from "@/features/university/LessonPage";
import AffiliatesPage from "@/features/affiliates/AffiliatesPage";
import ListADealPage from "@/features/deal-submit/ListADealPage";
import SettingsPage from "@/features/settings/SettingsPage";
// Frozen — stays in src/pages/
import BookingSitePage from "./pages/BookingSitePage";
// Layouts (stay in src/layouts/ — locked)
import AdminLayout from "./layouts/AdminLayout";
// Admin features
import AdminDashboard from "@/features/admin-dashboard/AdminDashboard";
import AdminQuickList from "@/features/admin-deals/AdminQuickList";
import AdminUsers from "@/features/admin-users/AdminUsers";
import AdminPricing from "@/features/admin-pricing/AdminPricing";
import AdminFAQ from "@/features/admin-faq/AdminFAQ";
import AdminAffiliates from "@/features/admin-affiliates/AdminAffiliates";
import AdminDeals from "@/features/admin-deals/AdminDeals";
import AdminOutreach from "@/features/admin-gate/AdminOutreach";
import AdminSettings from "@/features/admin-settings/AdminSettings";
import AdminNotifications from "@/features/admin-notifications/AdminNotifications";
import AdminGrowth from "@/features/admin-growth/AdminGrowth";
import AdminUniversity from "@/features/admin-university/AdminUniversity";
import AdminInvestDashboard from "./pages/admin/invest/AdminInvestDashboard";
import AdminInvestProperties from "./pages/admin/invest/AdminInvestProperties";
import AdminInvestOrders from "./pages/admin/invest/AdminInvestOrders";
import AdminInvestShareholders from "./pages/admin/invest/AdminInvestShareholders";
import AdminInvestCommissions from "./pages/admin/invest/AdminInvestCommissions";
import AdminInvestCommissionSettings from "./pages/admin/invest/AdminInvestCommissionSettings";
import AdminInvestPayouts from "./pages/admin/invest/AdminInvestPayouts";
import AdminInvestProposals from "./pages/admin/invest/AdminInvestProposals";
import AdminEndpoints from "./pages/admin/invest/AdminEndpoints";
import AdminTestConsole from "./pages/admin/invest/AdminTestConsole";
import AdminWorkspaceSelector from "@/features/admin-dashboard/AdminWorkspaceSelector";
import AdminArchitecture from "@/features/admin-dashboard/AdminArchitecture";
import WhatsAppScraperPage from "@/features/whatsapp-scraper/WhatsAppScraperPage";
import AdminGuard from "./components/AdminGuard";
import NotFound from "./pages/NotFound";
import BrandPage from "./pages/BrandPage";
import InvestMarketplacePage from "./pages/invest/InvestMarketplacePage";
import InvestPortfolioPage from "./pages/invest/InvestPortfolioPage";
import InvestPayoutsPage from "./pages/invest/InvestPayoutsPage";
import InvestProposalsPage from "./pages/invest/InvestProposalsPage";
// nfstay — operator module (isolated, see docs/nfstay/BOUNDARIES.md)
import NfsOperatorLayout from "./components/nfstay/NfsOperatorLayout";
import NfsOperatorDashboard from "./pages/nfstay/NfsOperatorDashboard";
import NfsOnboarding from "./pages/nfstay/NfsOnboarding";
import NfsOperatorSettings from "./pages/nfstay/NfsOperatorSettings";
import NfsProperties from "./pages/nfstay/NfsProperties";
import NfsPropertyNew from "./pages/nfstay/NfsPropertyNew";
import NfsPropertyDetail from "./pages/nfstay/NfsPropertyDetail";
import NfsReservations from "./pages/nfstay/NfsReservations";
import NfsReservationDetail from "./pages/nfstay/NfsReservationDetail";
import NfsCreateReservation from "./pages/nfstay/NfsCreateReservation";
import NfsPropertyView from "./pages/nfstay/NfsPropertyView";
import NfsPaymentSuccess from "./pages/nfstay/NfsPaymentSuccess";
import NfsPaymentCancel from "./pages/nfstay/NfsPaymentCancel";
import NfsAnalytics from "./pages/nfstay/NfsAnalytics";
import NfsCheckoutPage from "./pages/nfstay/NfsCheckoutPage";
import NfsGuestBookingLookup from "./pages/nfstay/NfsGuestBookingLookup";
import AdminNfsReservations from "./pages/admin/nfstay/AdminNfsReservations";
import AdminNfsProperties from "./pages/admin/nfstay/AdminNfsProperties";
import AdminNfsDashboard from "./pages/admin/nfstay/AdminNfsDashboard";
import AdminNfsUsers from "./pages/admin/nfstay/AdminNfsUsers";
import AdminNfsOperators from "./pages/admin/nfstay/AdminNfsOperators";
import AdminNfsOperatorDetail from "./pages/admin/nfstay/AdminNfsOperatorDetail";
import AdminNfsAnalytics from "./pages/admin/nfstay/AdminNfsAnalytics";
import AdminNfsSettings from "./pages/admin/nfstay/AdminNfsSettings";
import NfsTravelerReservations from "./pages/nfstay/NfsTravelerReservations";
import NfsTravelerReservationDetail from "./pages/nfstay/NfsTravelerReservationDetail";
import NfsOAuthCallbackPage from "./pages/NfsOAuthCallbackPage";
import NfsVerifyEmailPage from "./pages/NfsVerifyEmailPage";
import NfsAuthCallbackPage from "./pages/NfsAuthCallbackPage";
import ParticleAuthCallback from "@/features/auth/ParticleAuthCallback";
import AuthBridgePage from "@/features/auth/AuthBridgePage";
import LeadDetailsPage from "@/features/landlord/LeadDetailsPage";
import LeadNDAPage from "@/features/landlord/LeadNDAPage";
import { NfsCurrencyProvider } from "./contexts/NfsCurrencyContext";
import DebugReportButton from '@/core/debug/DebugReportButton';
import { setupDebugCapture } from '@/core/debug/useDebugCapture';
// SMS Inbox — isolated module
import SmsLayout from '@/features/sms/layout/SmsLayout';
import SmsInboxPage from '@/features/sms/pages/SmsInboxPage';
import SmsPipelinePage from '@/features/sms/pages/SmsPipelinePage';
import SmsContactsPage from '@/features/sms/pages/SmsContactsPage';
import SmsAutomationsPage from '@/features/sms/pages/SmsAutomationsPage';
import SmsFlowEditorPage from '@/features/sms/pages/SmsFlowEditorPage';
import SmsCampaignsPage from '@/features/sms/pages/SmsCampaignsPage';
import SmsTemplatesPage from '@/features/sms/pages/SmsTemplatesPage';
import SmsNumbersPage from '@/features/sms/pages/SmsNumbersPage';
import SmsSettingsPage from '@/features/sms/pages/SmsSettingsPage';
import SmsDashboardPage from '@/features/sms/pages/SmsDashboardPage';
import SmsWebhooksPage from '@/features/sms/pages/SmsWebhooksPage';
// SMSv2 Workspace — sandbox build (calling + CRM)
import Smsv2Layout from '@/features/smsv2/layout/Smsv2Layout';
import Smsv2DashboardPage from '@/features/smsv2/pages/DashboardPage';
import Smsv2InboxPage from '@/features/smsv2/pages/InboxPage';
import Smsv2CallsPage from '@/features/smsv2/pages/CallsPage';
import Smsv2PastCallScreen from '@/features/smsv2/pages/PastCallScreen';
import Smsv2DialerPage from '@/features/smsv2/pages/DialerPage';
import DialerProPage from '@/features/dialer-pro/DialerProPage';
import Smsv2ContactsPage from '@/features/smsv2/pages/ContactsPage';
import Smsv2ContactDetailPage from '@/features/smsv2/pages/ContactDetailPage';
import Smsv2PipelinesPage from '@/features/smsv2/pages/PipelinesPage';
import Smsv2ReportsPage from '@/features/smsv2/pages/ReportsPage';
import Smsv2LeaderboardPage from '@/features/smsv2/pages/LeaderboardPage';
import Smsv2SettingsPage from '@/features/smsv2/pages/SettingsPage';

// PR 45 (Hugo 2026-04-27): the SMSV2 module is rebranded to "CRM"
// for the user-facing surface. /crm/* routes are the new home;
// /smsv2/* are kept as redirects so any bookmark / external link
// keeps working. Internal folder + DB tables stay smsv2 / wk_* —
// see docs/runbooks/CRM_RENAME.md.
import CrmLoginPage from '@/features/smsv2/pages/CrmLoginPage';
import AdminOnlyRoute from '@/features/smsv2/components/AdminOnlyRoute';

// Caller workspace — clean rebuild of the smsv2 frontend at /caller/*.
// /caller/* routes removed — /crm/* is the official surface.
// CallerPad component is still used by Smsv2DialerPage.

// One-time wipe of stale CRM localStorage keys (from before DB-backed CRM)
if (!localStorage.getItem('crm_localStorage_v2_cleared')) {
  Object.keys(localStorage)
    .filter(k => k.startsWith('crm_'))
    .forEach(k => localStorage.removeItem(k));
  localStorage.setItem('crm_localStorage_v2_cleared', 'true');
}

const queryClient = new QueryClient();

// Super Debug Report — only active when VITE_DEBUG_REPORT_ENABLED=true
if (import.meta.env.VITE_DEBUG_REPORT_ENABLED === 'true') {
  setupDebugCapture();
}

// Detect GHL payment redirect: ?payment=success
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    // Just clean the URL — do NOT redirect. The iframe funnel (upsell/downsell)
    // must finish before any redirect happens. Detection is via postMessage only.
    sessionStorage.setItem('nfstay_payment_success', '1');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

import { FavouritesProvider } from '@/hooks/useFavourites';
import ParticleProvider from './components/ParticleProvider';
import FeatureInspector from './components/dev/FeatureInspector';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ParticleProvider>
    <TooltipProvider>
      <Sonner />
      <FeatureInspector />
      <BrowserRouter>
      <FavouritesProvider>
      <NfsCurrencyProvider>
        <Routes>
          {/* "/" is served by the static landing page (public/landing/index.html) */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/flow" element={<FlowPage />} />
          <Route path="/ads" element={<AdsLibraryPage />} />

          <Route path="/apply" element={<ApplyPage />} />
          {/* Magic link entry — GHL WhatsApp button uses hub.nfstay.com/inbox?token=... */}
          <Route path="/inbox" element={<MagicLoginPage />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          {/* Lead details — token-based access, no login required */}
          <Route path="/lead/:token" element={<LeadDetailsPage />} />
          <Route path="/lead/:token/nda" element={<LeadNDAPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="deals" replace />} />
            <Route path="deals" element={<DealsPage />} />
            {/* Favourites page removed — now a dropdown in top bar */}
            <Route path="crm" element={<CRMPage />} />
            <Route path="university" element={<UniversityPage />} />
            <Route path="affiliates" element={<AffiliatesPage />} />
            <Route path="list-a-deal" element={<ListADealPage />} />
            <Route path="booking-site" element={<BookingSitePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="invest/marketplace" element={<InvestMarketplacePage />} />
            <Route path="invest/portfolio" element={<InvestPortfolioPage />} />
            <Route path="invest/payouts" element={<InvestPayoutsPage />} />
            <Route path="invest/proposals" element={<InvestProposalsPage />} />
          </Route>
          <Route path="/university/:moduleId" element={<DashboardLayout />}>
            <Route index element={<ModuleOverviewPage />} />
            <Route path=":lessonId" element={<LessonPage />} />
          </Route>
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            {/* Workspace selector */}
            <Route index element={<AdminWorkspaceSelector />} />
            <Route path="workspace-selector" element={<AdminWorkspaceSelector />} />

            {/* Marketplace workspace */}
            <Route path="marketplace" element={<AdminDashboard />} />
            <Route path="marketplace/quick-list" element={<AdminQuickList />} />
            <Route path="marketplace/deals" element={<AdminDeals />} />
            <Route path="marketplace/listings" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="marketplace/properties" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="marketplace/submissions" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="marketplace/outreach" element={<AdminOutreach />} />
            <Route path="marketplace/users" element={<AdminUsers />} />
            <Route path="marketplace/university" element={<AdminUniversity />} />
            <Route path="marketplace/pricing" element={<AdminPricing />} />
            <Route path="marketplace/faq" element={<AdminFAQ />} />
            <Route path="marketplace/affiliates" element={<AdminAffiliates />} />
            <Route path="marketplace/deal-sourcers" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="marketplace/settings" element={<AdminSettings />} />
            <Route path="marketplace/notifications" element={<AdminNotifications />} />
            <Route path="marketplace/growth" element={<AdminGrowth />} />

            {/* Legacy routes (without /marketplace/) -- keep working */}
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="quick-list" element={<AdminQuickList />} />
            <Route path="listings" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="properties" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="submissions" element={<Navigate to="/admin/marketplace/deals" replace />} />
            <Route path="outreach" element={<AdminOutreach />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="university" element={<AdminUniversity />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="faq" element={<AdminFAQ />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="growth" element={<AdminGrowth />} />

            {/* JV Partners workspace */}
            <Route path="invest" element={<AdminInvestDashboard />} />
            <Route path="invest/properties" element={<AdminInvestProperties />} />
            <Route path="invest/orders" element={<AdminInvestOrders />} />
            <Route path="invest/shareholders" element={<AdminInvestShareholders />} />
            <Route path="invest/commissions" element={<AdminInvestCommissions />} />
            <Route path="invest/commission-settings" element={<AdminInvestCommissionSettings />} />
            <Route path="invest/payouts" element={<AdminInvestPayouts />} />
            <Route path="invest/proposals" element={<AdminInvestProposals />} />
            <Route path="invest/endpoints" element={<AdminEndpoints />} />
            <Route path="invest/test-console" element={<AdminTestConsole />} />

            {/* Booking Site (nfstay) workspace */}
            <Route path="nfstay" element={<AdminNfsReservations />} />
            <Route path="nfstay/reservations" element={<AdminNfsReservations />} />
            <Route path="nfstay/properties" element={<AdminNfsProperties />} />
            <Route path="nfstay/dashboard" element={<AdminNfsDashboard />} />
            <Route path="nfstay/users" element={<AdminNfsUsers />} />
            <Route path="nfstay/operators" element={<AdminNfsOperators />} />
            <Route path="nfstay/operators/:operatorId" element={<AdminNfsOperatorDetail />} />
            <Route path="nfstay/analytics" element={<AdminNfsAnalytics />} />
            <Route path="nfstay/settings" element={<AdminNfsSettings />} />

            {/* Observatory removed — chat system no longer active */}

            {/* WhatsApp Deal Scanner */}
            <Route path="marketplace/whatsapp-scraper" element={<WhatsAppScraperPage />} />

            {/* Architecture overview */}
            <Route path="architecture" element={<AdminArchitecture />} />
          </Route>
          <Route path="/brand" element={<BrandPage />} />
          {/* nfstay operator routes — isolated module */}
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
          {/* SMS Inbox — isolated module */}
          <Route path="/sms" element={<SmsLayout />}>
            <Route index element={<Navigate to="inbox" replace />} />
            <Route path="inbox" element={<SmsInboxPage />} />
            <Route path="pipeline" element={<SmsPipelinePage />} />
            <Route path="contacts" element={<SmsContactsPage />} />
            <Route path="automations" element={<SmsAutomationsPage />} />
            <Route path="automations/:id" element={<SmsFlowEditorPage />} />
            <Route path="campaigns" element={<SmsCampaignsPage />} />
            <Route path="templates" element={<SmsTemplatesPage />} />
            <Route path="numbers" element={<SmsNumbersPage />} />
            <Route path="settings" element={<SmsSettingsPage />} />
            <Route path="dashboard" element={<SmsDashboardPage />} />
            <Route path="webhooks" element={<SmsWebhooksPage />} />
          </Route>
          {/* CRM workspace (PR 45 — renamed from SMSV2). Internal
              folder + DB tables stay smsv2 / wk_* (see runbook). The
              CrmGuard inside Smsv2Layout enforces workspace_role
              membership; agents land here via /crm/login. */}
          <Route path="/crm/login" element={<CrmLoginPage />} />
          <Route path="/crm" element={<Smsv2Layout />}>
            <Route index element={<Navigate to="inbox" replace />} />
            {/* PR 62: Dashboard + Settings are admin-only; agents
                redirected to /crm/inbox by AdminOnlyRoute. */}
            <Route path="dashboard" element={<AdminOnlyRoute><Smsv2DashboardPage /></AdminOnlyRoute>} />
            <Route path="inbox" element={<Smsv2InboxPage />} />
            <Route path="calls" element={<Smsv2CallsPage />} />
            <Route path="calls/:callId" element={<Smsv2PastCallScreen />} />
            <Route path="dialer" element={<Smsv2DialerPage />} />
            <Route path="dialer-pro" element={<DialerProPage />} />

            <Route path="contacts" element={<Smsv2ContactsPage />} />
            <Route path="contacts/:id" element={<Smsv2ContactDetailPage />} />
            <Route path="pipelines" element={<Smsv2PipelinesPage />} />
            <Route path="reports" element={<Smsv2ReportsPage />} />
            <Route path="leaderboard" element={<Smsv2LeaderboardPage />} />
            <Route path="settings" element={<AdminOnlyRoute><Smsv2SettingsPage /></AdminOnlyRoute>} />

          </Route>
          {/* Legacy /smsv2/* redirects → /crm/* so bookmarks survive. */}
          <Route path="/smsv2" element={<Navigate to="/crm" replace />} />
          <Route path="/smsv2/*" element={<Navigate to="/crm" replace />} />
          {/* /caller/* removed — /crm/* is the official surface. */}
          {/* nfstay traveler-facing routes — standalone (no operator layout) */}
          <Route path="/nfstay/property/:id" element={<NfsPropertyView />} />
          <Route path="/nfstay/payment/success" element={<NfsPaymentSuccess />} />
          <Route path="/nfstay/payment/cancel" element={<NfsPaymentCancel />} />
          {/* nfstay booking flow — available on hub too */}
          <Route path="/checkout" element={<NfsCheckoutPage />} />
          <Route path="/booking" element={<NfsGuestBookingLookup />} />
          {/* nfstay traveler reservation portal */}
          <Route path="/nfstay/traveler/reservations" element={<NfsTravelerReservations />} />
          <Route path="/nfstay/traveler/reservation/:id" element={<NfsTravelerReservationDetail />} />
          {/* nfstay auth callbacks */}
          <Route path="/nfstay/oauth-callback" element={<NfsOAuthCallbackPage />} />
          <Route path="/nfstay/verify-email" element={<NfsVerifyEmailPage />} />
          <Route path="/auth/callback" element={<NfsAuthCallbackPage />} />
          <Route path="/auth/bridge" element={<AuthBridgePage />} />
          <Route path="/auth/particle" element={<ParticleAuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NfsCurrencyProvider>
      </FavouritesProvider>
      <DebugReportButton />
      </BrowserRouter>
    </TooltipProvider>
    </ParticleProvider>
  </QueryClientProvider>
);

export default App;
