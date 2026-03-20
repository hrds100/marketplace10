import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import MagicLoginPage from "./pages/MagicLoginPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DealsPage from "./pages/DealsPage";
import DealsPageV2 from "./pages/DealsPageV2";
import InboxPage from "./pages/InboxPage";
import DealDetail from "./pages/DealDetail";
import CRMPage from "./pages/CRMPage";
import UniversityPage from "./pages/UniversityPage";
import ModuleOverviewPage from "./pages/ModuleOverviewPage";
import LessonPage from "./pages/LessonPage";
import AffiliatesPage from "./pages/AffiliatesPage";
import ListADealPage from "./pages/ListADealPage";
import SettingsPage from "./pages/SettingsPage";
import BookingSitePage from "./pages/BookingSitePage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminListings from "./pages/admin/AdminListings";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminUniversity from "./pages/admin/AdminUniversity";
import AdminInvestDashboard from "./pages/admin/invest/AdminInvestDashboard";
import AdminInvestProperties from "./pages/admin/invest/AdminInvestProperties";
import AdminInvestOrders from "./pages/admin/invest/AdminInvestOrders";
import AdminInvestShareholders from "./pages/admin/invest/AdminInvestShareholders";
import AdminInvestCommissions from "./pages/admin/invest/AdminInvestCommissions";
import AdminInvestCommissionSettings from "./pages/admin/invest/AdminInvestCommissionSettings";
import AdminInvestPayouts from "./pages/admin/invest/AdminInvestPayouts";
import AdminInvestProposals from "./pages/admin/invest/AdminInvestProposals";
import AdminInvestBoost from "./pages/admin/invest/AdminInvestBoost";
import AdminEndpoints from "./pages/admin/invest/AdminEndpoints";
import AdminWorkspaceSelector from "./pages/admin/AdminWorkspaceSelector";
import AdminArchitecture from "./pages/admin/AdminArchitecture";
import AdminGuard from "./components/AdminGuard";
import NotFound from "./pages/NotFound";
import TestingDesign from "./pages/TestingDesign";
import InvestMarketplacePage from "./pages/invest/InvestMarketplacePage";
import InvestPortfolioPage from "./pages/invest/InvestPortfolioPage";
import InvestPayoutsPage from "./pages/invest/InvestPayoutsPage";
import InvestProposalsPage from "./pages/invest/InvestProposalsPage";
import ParticleAuthCallback from "./pages/ParticleAuthCallback";

// One-time wipe of stale CRM localStorage keys (from before DB-backed CRM)
if (!localStorage.getItem('crm_localStorage_v2_cleared')) {
  Object.keys(localStorage)
    .filter(k => k.startsWith('crm_'))
    .forEach(k => localStorage.removeItem(k));
  localStorage.setItem('crm_localStorage_v2_cleared', 'true');
}

const queryClient = new QueryClient();

// Detect GHL payment redirect: ?payment=success
// GHL thank-you page redirects to hub.nfstay.com/dashboard/inbox?payment=success
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    sessionStorage.setItem('nfstay_payment_success', '1');
    window.history.replaceState({}, '', window.location.pathname);
    if (!window.location.pathname.includes('inbox')) {
      window.location.href = '/dashboard/inbox';
    }
  }
}

import { FavouritesProvider } from '@/hooks/useFavourites';
import ParticleProvider from './components/ParticleProvider';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ParticleProvider>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
      <FavouritesProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {/* Magic link entry — GHL WhatsApp button uses hub.nfstay.com/inbox?token=... */}
          <Route path="/inbox" element={<MagicLoginPage />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="deals" replace />} />
            <Route path="deals" element={<DealsPageV2 />} />
            <Route path="deals-v2" element={<DealsPage />} />
            <Route path="inbox" element={<InboxPage />} />
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

            {/* Marketplace workspace */}
            <Route path="marketplace" element={<AdminDashboard />} />
            <Route path="marketplace/listings" element={<AdminListings />} />
            <Route path="marketplace/properties" element={<AdminListings />} />
            <Route path="marketplace/submissions" element={<AdminSubmissions />} />
            <Route path="marketplace/users" element={<AdminUsers />} />
            <Route path="marketplace/university" element={<AdminUniversity />} />
            <Route path="marketplace/pricing" element={<AdminPricing />} />
            <Route path="marketplace/faq" element={<AdminFAQ />} />
            <Route path="marketplace/affiliates" element={<AdminAffiliates />} />
            <Route path="marketplace/settings" element={<AdminSettings />} />
            <Route path="marketplace/notifications" element={<AdminNotifications />} />

            {/* Legacy routes (without /marketplace/) -- keep working */}
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="properties" element={<AdminListings />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="university" element={<AdminUniversity />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="faq" element={<AdminFAQ />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="notifications" element={<AdminNotifications />} />

            {/* JV Partners workspace */}
            <Route path="invest" element={<AdminInvestDashboard />} />
            <Route path="invest/properties" element={<AdminInvestProperties />} />
            <Route path="invest/orders" element={<AdminInvestOrders />} />
            <Route path="invest/shareholders" element={<AdminInvestShareholders />} />
            <Route path="invest/commissions" element={<AdminInvestCommissions />} />
            <Route path="invest/commission-settings" element={<AdminInvestCommissionSettings />} />
            <Route path="invest/payouts" element={<AdminInvestPayouts />} />
            <Route path="invest/proposals" element={<AdminInvestProposals />} />
            <Route path="invest/boost" element={<AdminInvestBoost />} />
            <Route path="invest/endpoints" element={<AdminEndpoints />} />

            {/* Architecture overview */}
            <Route path="architecture" element={<AdminArchitecture />} />
          </Route>
          <Route path="/testing/design" element={<TestingDesign />} />
          <Route path="/auth/particle" element={<ParticleAuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FavouritesProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ParticleProvider>
  </QueryClientProvider>
);

export default App;
