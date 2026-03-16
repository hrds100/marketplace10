import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DealsPage from "./pages/DealsPage";
import DealsPageV2 from "./pages/DealsPageV2";
import InboxPage from "./pages/InboxPage";
import FavouritesPage from "./pages/FavouritesPage";
import DealDetail from "./pages/DealDetail";
import CRMPage from "./pages/CRMPage";
import UniversityPage from "./pages/UniversityPage";
import ModuleOverviewPage from "./pages/ModuleOverviewPage";
import LessonPage from "./pages/LessonPage";
import AffiliatesPage from "./pages/AffiliatesPage";
import ListADealPage from "./pages/ListADealPage";
import SettingsPage from "./pages/SettingsPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminListings from "./pages/admin/AdminListings";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminGuard from "./components/AdminGuard";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {/* Magic link short URL — GHL template approved with hub.nfstay.com/inbox */}
          <Route path="/inbox" element={<Navigate to={`/dashboard/inbox${window.location.search}`} replace />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="deals" replace />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="deals-v2" element={<DealsPageV2 />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="favourites" element={<FavouritesPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="university" element={<UniversityPage />} />
            <Route path="affiliates" element={<AffiliatesPage />} />
            <Route path="list-a-deal" element={<ListADealPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/university/:moduleId" element={<DashboardLayout />}>
            <Route index element={<ModuleOverviewPage />} />
            <Route path=":lessonId" element={<LessonPage />} />
          </Route>
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="properties" element={<AdminListings />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="university" element={<AdminLessons />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="faq" element={<AdminFAQ />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
