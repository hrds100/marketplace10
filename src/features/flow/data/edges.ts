import type { Edge } from '@xyflow/react';

const E = (
  id: string,
  source: string,
  target: string,
  label?: string,
  animated = false,
  style?: React.CSSProperties,
): Edge => ({
  id,
  source,
  target,
  label,
  animated,
  type: 'smoothstep',
  style: style ?? { strokeWidth: 1.5, stroke: '#D1D5DB' },
  labelStyle: { fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif', fill: '#6B7280' },
  labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
});

const animated = (id: string, source: string, target: string, label?: string): Edge =>
  E(id, source, target, label, true, { strokeWidth: 1.5, stroke: '#1E9A80', strokeDasharray: '6 3' });

const system = (id: string, source: string, target: string, label?: string): Edge =>
  E(id, source, target, label, false, { strokeWidth: 1.5, stroke: '#9CA3AF', strokeDasharray: '4 4' });

const payment = (id: string, source: string, target: string, label?: string): Edge =>
  E(id, source, target, label, true, { strokeWidth: 2, stroke: '#F59E0B' });

const crypto = (id: string, source: string, target: string, label?: string): Edge =>
  E(id, source, target, label, true, { strokeWidth: 2, stroke: '#8B5CF6' });

const booking = (id: string, source: string, target: string, label?: string): Edge =>
  E(id, source, target, label, false, { strokeWidth: 1.5, stroke: '#EC4899' });

export const flowEdges: Edge[] = [

  // ═══════════════ AUTH FLOW ═══════════════

  E('v-su', 'visitor', 'signup', 'Register'),
  E('su-otp', 'signup', 'otp-verify', 'Email/Password'),
  E('su-social', 'signup', 'social-login', 'Social'),
  E('social-pc', 'social-login', 'particle-callback'),
  E('pc-otp', 'particle-callback', 'otp-verify'),
  animated('otp-fd', 'otp-verify', 'free-dashboard', 'Verified ✓'),
  E('ml-l-lcrm', 'magic-link-landlord', 'landlord-magic-login-fn'),
  E('ml-lead-lcrm', 'magic-link-lead', 'landlord-magic-login-fn'),

  // ═══════════════ PAYMENT FUNNEL ═══════════════

  E('fd-up', 'free-dashboard', 'upgrade-prompt', 'Click Inquire (free)'),
  payment('up-pm', 'upgrade-prompt', 'payment-modal'),
  payment('pm-cart', 'payment-modal', 'ghl-cart'),
  payment('cart-upsell', 'ghl-cart', 'upsell', 'After purchase'),
  payment('cart-ty', 'ghl-cart', 'thank-you-ghl', 'Declines upsell'),
  payment('upsell-ty', 'upsell', 'thank-you-ghl', 'Accepts'),
  payment('upsell-ds', 'upsell', 'downsell', 'Declines'),
  payment('ds-ty', 'downsell', 'thank-you-ghl'),
  system('ty-wh', 'thank-you-ghl', 'ghl-payment-webhook', 'GHL webhook'),
  animated('wh-tu', 'ghl-payment-webhook', 'tier-update'),
  animated('tu-psd', 'tier-update', 'payment-success-detect', 'Realtime push'),
  animated('psd-pd', 'payment-success-detect', 'paid-dashboard', 'Tier changed'),

  // ═══════════════ MARKETPLACE (TENANT) ═══════════════

  E('pd-bd', 'paid-dashboard', 'browse-deals'),
  E('bd-dd', 'browse-deals', 'deal-detail', 'Click deal'),
  E('bd-ip', 'browse-deals', 'inquiry-panel', 'Inquire Now'),
  E('dd-ip', 'deal-detail', 'inquiry-panel', 'Inquire Now'),
  animated('ip-pi', 'inquiry-panel', 'process-inquiry', 'POST edge fn'),
  system('pi-ir', 'process-inquiry', 'inquiry-row'),
  system('pi-lii', 'process-inquiry', 'landlord-invite-insert'),
  system('pi-in', 'process-inquiry', 'inquiry-notification'),
  system('pi-iet', 'process-inquiry', 'inquiry-email-tenant'),
  system('pi-get', 'process-inquiry', 'ghl-enroll-tenant'),
  E('ip-wa', 'inquiry-panel', 'whatsapp-open', 'Opens wa.me'),
  animated('wa-rtw', 'whatsapp-open', 'receive-tenant-whatsapp', 'n8n polls GHL'),

  // ═══════════════ ADMIN FLOW ═══════════════

  E('fd-adash', 'free-dashboard', 'admin-dashboard', 'Admin only'),
  E('adash-aql', 'admin-dashboard', 'admin-quick-list'),
  E('aql-aipl', 'admin-quick-list', 'ai-parse-listing', 'Parse AI'),
  system('aipl-aql', 'ai-parse-listing', 'admin-quick-list', 'Returns JSON'),
  E('adash-ad', 'admin-dashboard', 'admin-deals'),
  E('ad-da', 'admin-deals', 'deal-approved', 'Approve'),
  E('adash-ao', 'admin-dashboard', 'admin-outreach'),
  E('in-ao', 'inquiry-notification', 'admin-outreach', 'Admin reviews'),
  E('ao-arg', 'admin-outreach', 'admin-release-gate'),
  animated('arg-gea', 'admin-release-gate', 'ghl-enroll-admin', 'NDA | Direct'),
  animated('gea-lgm', 'ghl-enroll-admin', 'landlord-ghl-message', 'GHL sends WA'),
  E('adash-au', 'admin-dashboard', 'admin-users'),
  E('au-hdu', 'admin-users', 'hard-delete-user', 'Delete (PIN)'),
  E('adash-an', 'admin-dashboard', 'admin-notifications'),
  system('de-bd', 'deal-expiry', 'browse-deals', 'status=inactive'),

  // ═══════════════ LANDLORD FLOW ═══════════════

  E('lgm-lmlf', 'landlord-ghl-message', 'landlord-magic-login-fn', 'Click link'),
  animated('lmlf-lcrm', 'landlord-magic-login-fn', 'landlord-crm', 'Auto-logged in'),
  E('lcrm-cab', 'landlord-crm', 'claim-account-banner', 'If @nfstay.internal'),
  animated('cab-claf', 'claim-account-banner', 'claim-landlord-account'),
  E('lcrm-nda', 'landlord-crm', 'nda-page', 'NDA required'),
  E('lcrm-lmt', 'landlord-crm', 'landlord-message-tenant', 'Message'),
  system('aa-ir', 'always-authorised', 'inquiry-row', 'Auto-auth bypass'),

  // ═══════════════ CRM & NOTIFICATIONS ═══════════════

  E('pd-crm', 'paid-dashboard', 'crm-kanban'),
  E('pd-uni', 'paid-dashboard', 'university'),
  system('uni-aic', 'university', 'ai-chat', 'AI tutor'),
  E('pd-aff', 'paid-dashboard', 'affiliates'),
  system('aff-tr', 'affiliates', 'track-referral', 'Referral click/signup'),
  system('pi-se', 'process-inquiry', 'send-email', 'Tenant confirm email'),
  system('wh-se', 'ghl-payment-webhook', 'send-email', 'Tier upgraded email'),
  system('da-se', 'deal-approved', 'send-email', 'Deal approved email'),
  animated('in-nb', 'inquiry-notification', 'notifications-bell'),

  // ═══════════════ BOOKING FLOW ═══════════════

  E('pd-noo', 'paid-dashboard', 'nfs-operator-onboarding', 'Become operator'),
  booking('noo-nsc', 'nfs-operator-onboarding', 'nfs-stripe-connect', 'Connect Stripe'),
  booking('noo-nh', 'nfs-operator-onboarding', 'nfs-hospitable', 'Connect Hospitable'),
  booking('noo-np', 'nfs-operator-onboarding', 'nfs-properties'),
  booking('np-npv', 'nfs-properties', 'nfs-property-view', 'Public page'),
  booking('npv-nc', 'nfs-property-view', 'nfs-checkout', 'Book now'),
  booking('nc-nsch', 'nfs-checkout', 'nfs-stripe-checkout', 'Pay'),
  booking('nsch-nswh', 'nfs-stripe-checkout', 'nfs-stripe-webhook', 'Stripe event'),
  booking('nswh-nr', 'nfs-stripe-webhook', 'nfs-reservation', 'status=paid'),
  booking('nr-nps', 'nfs-reservation', 'nfs-payment-success'),
  booking('nr-nes', 'nfs-reservation', 'nfs-email-send', 'Confirmation email'),
  booking('np-nod', 'nfs-properties', 'nfs-operator-dashboard', 'Manage'),

  // ═══════════════ INVESTMENT FLOW ═══════════════

  E('pd-im', 'paid-dashboard', 'invest-marketplace'),
  E('im-ibd', 'invest-marketplace', 'invest-buy-decision', 'Buy shares'),
  crypto('ibd-ibc', 'invest-buy-decision', 'invest-buy-crypto', 'Crypto wallet'),
  payment('ibd-ibcard', 'invest-buy-decision', 'invest-buy-card', 'Card'),
  crypto('ibc-icconf', 'invest-buy-crypto', 'inv-crypto-confirm', 'tx.wait() + POST'),
  payment('ibcard-swh', 'invest-buy-card', 'samcart-webhook', 'SamCart webhook'),
  system('icconf-acc', 'inv-crypto-confirm', 'aff-commission-create'),
  system('swh-acc', 'samcart-webhook', 'aff-commission-create'),
  E('pd-ipo', 'paid-dashboard', 'invest-portfolio'),
  E('pd-iprop', 'paid-dashboard', 'invest-proposals'),
  E('pd-ipay', 'paid-dashboard', 'invest-payouts'),
  crypto('ibc-cmp', 'invest-buy-crypto', 'contract-marketplace', 'buyPrimaryShares'),
  crypto('swh-cmp', 'samcart-webhook', 'contract-marketplace', 'server-side tx'),
  crypto('ipo-crwa', 'invest-portfolio', 'contract-rwa', 'balanceOf()'),
  crypto('ipay-crent', 'invest-payouts', 'contract-rent', 'withdrawRent()'),
  crypto('iprop-cvoting', 'invest-proposals', 'contract-voting', 'castVote()'),
  crypto('ipo-cboost', 'invest-portfolio', 'contract-booster', 'boost()'),
  system('ipay-spc', 'invest-payouts', 'submit-payout-claim', 'Bank claim'),
  system('ipay-sbd', 'invest-payouts', 'save-bank-details', 'First time'),
  animated('spc-rp', 'submit-payout-claim', 'revolut-pay', 'Admin approves'),
  animated('rp-rwh', 'revolut-pay', 'revolut-webhook', 'Revolut fires'),
  animated('rwh-bpc', 'revolut-webhook', 'bank-payout-complete'),
  system('n8n-rp', 'n8n-tuesday-batch', 'revolut-pay', 'Tuesday 05:00 AM'),
  system('rtr-rp', 'revolut-token-refresh', 'revolut-pay', 'Token refresh'),
  system('im-tg', 'invest-marketplace', 'the-graph', 'Recent purchases'),
  system('iprop-tg', 'invest-proposals', 'the-graph', 'Proposal data'),
  system('ipay-tg', 'invest-payouts', 'the-graph', 'Rent history'),
  E('adash-aio', 'admin-dashboard', 'admin-invest-orders'),
  E('adash-aip', 'admin-dashboard', 'admin-invest-payouts'),
  E('aip-rp', 'admin-invest-payouts', 'revolut-pay', 'Approve'),

  // ═══════════════ CRYPTO / WALLET ═══════════════

  crypto('otp-pw', 'otp-verify', 'particle-wallet', 'After verify'),
  crypto('pw-pgj', 'particle-wallet', 'particle-generate-jwt'),
  system('ibc-pw', 'invest-buy-crypto', 'particle-wallet', 'Signs tx'),

];
