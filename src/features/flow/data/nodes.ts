import type { Node } from '@xyflow/react';
import type { FlowNodeData } from '../types';

// X offsets per group
const GX = {
  auth: 0,
  payment: 950,
  marketplace: 1900,
  admin: 2850,
  landlord: 3800,
  crm: 4750,
  booking: 5700,
  invest: 6650,
  crypto: 7600,
};

function n(
  id: string,
  label: string,
  data: Omit<FlowNodeData, 'label'>,
  x: number,
  y: number,
  kind: 'business' | 'decision' | 'system' | 'end' = 'business',
): Node<FlowNodeData> {
  return {
    id,
    type: kind === 'system' ? 'systemNode' : kind === 'decision' ? 'decisionNode' : 'businessNode',
    position: { x, y },
    data: { label, kind, ...data },
  };
}

export const flowNodes: Node<FlowNodeData>[] = [

  // ═══════════════════════════════════════
  // GROUP 1: AUTH
  // ═══════════════════════════════════════

  n('visitor', 'Visitor', {
    description: 'User lands on hub.nfstay.com homepage (served from public/landing/index.html). Sees property listings, pricing, CTA to sign up.',
    actor: 'tenant',
    route: '/',
    confidence: 'confirmed',
    integrations: ['Vercel CDN'],
  }, GX.auth, 0),

  n('signup', 'Sign Up / Register', {
    description: 'User registers with email+password or social login. Password has strength meter. Terms & Conditions required. Supabase auth account created.',
    actor: 'tenant',
    route: '/signup',
    files: ['src/features/auth/SignUp.tsx'],
    tables: ['auth.users', 'profiles'],
    edgeFunctions: ['send-otp'],
    confidence: 'confirmed',
    debugTrigger: 'User form submit',
  }, GX.auth, 120),

  n('social-login', 'Social Login', {
    description: 'Google, Apple, X, or Facebook login via Particle Network. Intent stored in localStorage. Redirects to /auth/particle callback.',
    actor: 'tenant',
    files: ['src/features/auth/SignUp.tsx', 'src/features/auth/SignIn.tsx'],
    integrations: ['Particle Network', 'Google', 'Apple', 'X', 'Facebook'],
    confidence: 'confirmed',
    debugTrigger: 'Click social button → Particle SDK',
    calledBy: ['signup'],
  }, GX.auth - 160, 240),

  n('particle-callback', 'Particle OAuth Callback', {
    description: 'Particle returns user info (email, name, wallet, uuid). Frontend derives Supabase password from UUID: uuid.slice(0,10) + "_NFsTay2!" + uuid.slice(-6). Creates Supabase user.',
    actor: 'system',
    route: '/auth/particle',
    files: ['src/features/auth/ParticleAuthCallback.tsx'],
    tables: ['auth.users', 'profiles'],
    edgeFunctions: ['particle-generate-jwt'],
    integrations: ['Particle Network'],
    confidence: 'confirmed',
    debugTrigger: 'OAuth callback from Particle',
  }, GX.auth - 160, 380),

  n('otp-verify', 'WhatsApp OTP Verification', {
    description: 'User enters phone number (+44 default). send-otp enrolls GHL contact in OTP workflow. 4-digit code sent via WhatsApp. verify-otp marks profiles.whatsapp_verified=true.',
    actor: 'tenant',
    route: '/verify-otp',
    files: ['src/features/auth/VerifyOtp.tsx'],
    tables: ['profiles'],
    edgeFunctions: ['send-otp', 'verify-otp'],
    integrations: ['GHL', 'WhatsApp'],
    confidence: 'confirmed',
    debugTrigger: 'User submits phone → GHL workflow',
    risks: ['verify-otp accepts ANY 4-digit code — intentionally loose gate'],
  }, GX.auth, 360),

  n('free-dashboard', 'Free Dashboard', {
    description: 'Authenticated user lands on /dashboard/deals with tier=free. Can browse all listings but cannot send inquiries. Sees upgrade prompts.',
    actor: 'tenant',
    route: '/dashboard/deals',
    files: ['src/features/deals/DealsPage.tsx'],
    tables: ['properties', 'profiles'],
    confidence: 'confirmed',
  }, GX.auth, 520),

  n('magic-link-landlord', 'Magic Link (Landlord)', {
    description: 'Landlord receives WhatsApp link from GHL. Clicks → /inbox?token={uuid}. No password needed. Token in landlord_invites table never expires.',
    actor: 'landlord',
    route: '/inbox',
    files: ['src/features/landlord/MagicLoginPage.tsx'],
    tables: ['landlord_invites', 'profiles'],
    edgeFunctions: ['landlord-magic-login'],
    confidence: 'confirmed',
    debugTrigger: 'Token param in URL',
  }, GX.auth + 200, 360),

  n('magic-link-lead', 'Magic Link (Lead)', {
    description: 'Investor or partner receives email magic link. Clicks → /lead/:token. Auto-logged in with restricted view.',
    actor: 'landlord',
    route: '/lead/:token',
    files: ['src/features/landlord/LeadDetailsPage.tsx'],
    tables: ['inquiries', 'profiles'],
    edgeFunctions: ['lead-magic-login'],
    confidence: 'confirmed',
    debugTrigger: 'Token param in URL',
  }, GX.auth + 200, 480),

  n('auth-bridge', 'Auth Bridge', {
    description: 'Internal OAuth bridge page used during cross-domain auth flows.',
    actor: 'system',
    route: '/auth/bridge',
    files: ['src/pages/AuthBridgePage.tsx'],
    confidence: 'likely',
  }, GX.auth - 200, 480),

  // ═══════════════════════════════════════
  // GROUP 2: PAYMENT FUNNEL
  // ═══════════════════════════════════════

  n('upgrade-prompt', 'Upgrade Prompt', {
    description: 'Free user clicks "Inquire Now" on a deal card. PropertyCard detects isPaidTier()=false and triggers payment modal instead of inquiry.',
    actor: 'payment',
    files: ['src/components/PropertyCard.tsx', 'src/features/payment/PaymentSheet.tsx'],
    confidence: 'confirmed',
    debugTrigger: 'isPaidTier() === false',
    calledBy: ['free-dashboard'],
  }, GX.payment, 0),

  n('payment-modal', 'Payment Modal (GHL iframe)', {
    description: 'PaymentSheet opens modal with GHL cart as iframe. getFunnelUrl() builds URL with email+name+phone+ref params. 8s load timeout. Listens for postMessage order_success.',
    actor: 'payment',
    files: ['src/features/payment/PaymentSheet.tsx'],
    integrations: ['GHL', 'pay.nfstay.com'],
    confidence: 'confirmed',
    risks: ['Relies on postMessage from GHL iframe — could break if GHL changes their page'],
  }, GX.payment, 120),

  n('ghl-cart', 'GHL Cart (£67/mo)', {
    description: 'pay.nfstay.com/order — Standard monthly plan. £67/month for 100 contacts. GHL product ID: 69b5c27da3434d4750457c80.',
    actor: 'payment',
    route: 'pay.nfstay.com/order',
    integrations: ['GHL', 'Stripe (inside GHL)'],
    confidence: 'confirmed',
  }, GX.payment - 160, 260),

  n('upsell', 'Upsell: Lifetime (£997)', {
    description: 'pay.nfstay.com/upsell — One-time £997 lifetime access. Unlimited contacts. "One-time offer — only shown once." GHL product ID: 69b5c2d26831635e6c3edb65.',
    actor: 'payment',
    route: 'pay.nfstay.com/upsell',
    files: ['public/upsell.html', 'public/upsell-above.html'],
    integrations: ['GHL'],
    confidence: 'confirmed',
  }, GX.payment - 260, 400),

  n('downsell', 'Downsell: Annual (£397/yr)', {
    description: 'pay.nfstay.com/Down — £397/year. 51% cheaper than monthly. Unlimited contacts for 12 months. GHL product ID: 69b5cd925759e2ddcf750aa9.',
    actor: 'payment',
    route: 'pay.nfstay.com/Down',
    files: ['public/downsell.html', 'public/downsell-above.html'],
    integrations: ['GHL'],
    confidence: 'confirmed',
  }, GX.payment + 80, 400),

  n('thank-you-ghl', 'Thank You Page', {
    description: 'pay.nfstay.com/thank-You — Post-purchase page. CTA links to hub.nfstay.com/dashboard. Sends postMessage("thank-you") which the app detects.',
    actor: 'payment',
    route: 'pay.nfstay.com/thank-You',
    files: ['public/thank-you.html'],
    integrations: ['GHL'],
    confidence: 'confirmed',
  }, GX.payment, 540),

  n('ghl-payment-webhook', 'ghl-payment-webhook', {
    description: 'GHL fires webhook on payment. Edge function maps product_id → tier. Upgrade-only logic (never downgrades). Also handles subscription cancellation (tier→free). Auto-creates aff_profiles for new users.',
    actor: 'system',
    edgeFunctions: ['ghl-payment-webhook'],
    tables: ['profiles', 'aff_profiles', 'aff_commissions', 'aff_events'],
    webhooks: ['GHL Custom Webhook'],
    confidence: 'confirmed',
    debugTrigger: 'GHL webhook POST on order submit + cancel',
  }, GX.payment, 680),

  n('tier-update', 'Tier Updated in DB', {
    description: 'profiles.tier set to monthly|yearly|lifetime. Supabase Realtime pushes change to frontend. Frontend poll (every 1s, max 45 attempts) detects change.',
    actor: 'system',
    tables: ['profiles'],
    integrations: ['Supabase Realtime'],
    confidence: 'confirmed',
    risks: ['Poll timeout 45s — if webhook delayed >45s, user must refresh'],
  }, GX.payment, 820),

  n('payment-success-detect', 'Payment Success Detection', {
    description: 'Two fallback paths: (1) postMessage from iframe (2) ?payment=success in URL → sessionStorage flag → PaymentSuccessRefresher calls refreshTier().',
    actor: 'system',
    files: ['src/features/payment/PaymentSheet.tsx', 'src/App.tsx'],
    confidence: 'confirmed',
    risks: ['GHL might not always send postMessage — fallback URL param is backup'],
  }, GX.payment, 940),

  n('paid-dashboard', 'Paid Dashboard (Unlocked)', {
    description: 'User now has tier=monthly|yearly|lifetime. Full deal browsing + inquiry sending unlocked. CRM, university, affiliates all accessible.',
    actor: 'tenant',
    route: '/dashboard/deals',
    tables: ['properties', 'profiles'],
    confidence: 'confirmed',
  }, GX.payment, 1060),

  // ═══════════════════════════════════════
  // GROUP 3: MARKETPLACE (TENANT)
  // ═══════════════════════════════════════

  n('browse-deals', 'Browse Deals', {
    description: 'DealsPage shows properties with status IN (live, approved). Filters: city, type, bedrooms, lister type, sort. Pagination 10/page. Pexels images fetched async.',
    actor: 'tenant',
    route: '/dashboard/deals',
    files: ['src/features/deals/DealsPage.tsx', 'src/components/PropertyCard.tsx'],
    tables: ['properties', 'profiles'],
    integrations: ['Pexels API'],
    confidence: 'confirmed',
  }, GX.marketplace, 0),

  n('deal-detail', 'Deal Detail (Public)', {
    description: 'Public property detail page. Shows full description, contact info, financials. Actions gated by tier.',
    actor: 'tenant',
    route: '/deals/:id',
    tables: ['properties'],
    confidence: 'confirmed',
  }, GX.marketplace, 120),

  n('inquiry-panel', 'Inquiry Panel Opens', {
    description: 'Paid user clicks "Inquire Now". InquiryPanel side drawer opens. Pre-fills message with property reference, tenant details.',
    actor: 'tenant',
    files: ['src/features/inquiry/InquiryPanel.tsx'],
    confidence: 'confirmed',
    calledBy: ['paid-dashboard', 'deal-detail'],
  }, GX.marketplace, 260),

  n('process-inquiry', 'process-inquiry edge fn', {
    description: 'Core inquiry pipeline. Validates JWT. Idempotency: dedup 5-min window. Inserts inquiries row. Inserts landlord_invites (magic token). Sends admin notification. Sends tenant confirmation email. Enrolls tenant in GHL WhatsApp reply workflow.',
    actor: 'system',
    edgeFunctions: ['process-inquiry'],
    tables: ['inquiries', 'landlord_invites', 'notifications'],
    integrations: ['GHL', 'Resend'],
    confidence: 'confirmed',
    debugTrigger: 'POST from InquiryPanel or InquiryChatModal',
    risks: ['5-min dedup window — retry after 5min could create duplicate'],
  }, GX.marketplace, 400),

  n('inquiry-row', 'inquiries row INSERT', {
    description: 'New inquiry stored: tenant_id, property_id, lister_phone, channel=whatsapp, status=new, authorized=false (or true if always_authorised=true).',
    actor: 'system',
    tables: ['inquiries'],
    confidence: 'confirmed',
  }, GX.marketplace - 160, 540),

  n('landlord-invite-insert', 'landlord_invites INSERT', {
    description: 'Magic link token created for landlord. Token stored in landlord_invites. Never expires. Used by /inbox?token= route for passwordless landlord login.',
    actor: 'system',
    tables: ['landlord_invites'],
    confidence: 'confirmed',
  }, GX.marketplace, 540),

  n('inquiry-notification', 'Admin Notification Bell', {
    description: 'notifications row inserted with type=new_inquiry. Admin sees bell badge in dashboard. Admin polls every 30s.',
    actor: 'system',
    tables: ['notifications'],
    confidence: 'confirmed',
  }, GX.marketplace + 160, 540),

  n('inquiry-email-tenant', 'Email: Tenant Confirmation', {
    description: 'send-email called with type=inquiry-tenant-confirmation. Confirms inquiry was sent. Via Resend. Template overridable in email_templates table.',
    actor: 'system',
    edgeFunctions: ['send-email'],
    integrations: ['Resend'],
    confidence: 'confirmed',
    debugTrigger: 'Called by process-inquiry',
  }, GX.marketplace - 160, 680),

  n('ghl-enroll-tenant', 'GHL Enroll (Tenant WhatsApp)', {
    description: 'GHL contact searched by phone. Created if missing. Property name custom field set. Enrolled in WhatsApp reply template workflow (cf089a15...).',
    actor: 'system',
    integrations: ['GHL'],
    edgeFunctions: ['ghl-enroll'],
    confidence: 'confirmed',
    debugTrigger: 'Called by process-inquiry after DB writes',
  }, GX.marketplace + 160, 680),

  n('whatsapp-open', 'WhatsApp Opens (Tenant)', {
    description: 'Frontend opens wa.me/447476368123 with pre-filled message. Tenant\'s message lands in GHL inbox. n8n polls GHL and calls receive-tenant-whatsapp edge fn.',
    actor: 'tenant',
    integrations: ['WhatsApp', 'GHL', 'n8n'],
    confidence: 'confirmed',
    risks: ['If n8n receive-tenant-whatsapp workflow inactive, inbound messages not parsed'],
  }, GX.marketplace, 820),

  n('receive-tenant-whatsapp', 'receive-tenant-whatsapp', {
    description: 'n8n polls GHL conversations → calls this edge fn. Parses tenant phone, name, message, property ref. Finds property. Creates/updates inquiry. Creates admin notification. Enrolls in GHL reply workflow.',
    actor: 'system',
    edgeFunctions: ['receive-tenant-whatsapp'],
    tables: ['inquiries', 'notifications'],
    integrations: ['GHL', 'n8n'],
    confidence: 'confirmed',
    debugTrigger: 'n8n webhook IvXzbcqzv5bKtu01',
  }, GX.marketplace, 960),

  // ═══════════════════════════════════════
  // GROUP 4: ADMIN
  // ═══════════════════════════════════════

  n('admin-dashboard', 'Admin Dashboard', {
    description: 'Stats: active listings, total users, pending submissions, MRR estimate. Recent audit log (last 10). Reset test data (PIN protected).',
    actor: 'admin',
    route: '/admin/marketplace',
    files: ['src/features/admin-dashboard/AdminDashboard.tsx'],
    tables: ['properties', 'profiles', 'admin_audit_log'],
    confidence: 'confirmed',
  }, GX.admin, 0),

  n('admin-quick-list', 'Quick List (AI Parser)', {
    description: 'Admin pastes WhatsApp property text. AI parses it (GPT-4o-mini). Form auto-fills with: name, city, bedrooms, rent, contact, etc. Admin edits + submits.',
    actor: 'admin',
    route: '/admin/marketplace/quick-list',
    files: ['src/features/admin-deals/AdminQuickList.tsx'],
    edgeFunctions: ['ai-parse-listing'],
    integrations: ['OpenAI GPT-4o-mini'],
    confidence: 'confirmed',
    debugTrigger: 'Admin clicks "Parse with AI"',
  }, GX.admin - 160, 200),

  n('ai-parse-listing', 'ai-parse-listing', {
    description: 'Sends raw WhatsApp text to GPT-4o-mini in JSON mode. Returns structured listing: name, city, postcode, bedrooms, bathrooms, rent, contact_phone, contact_name, deposit, etc.',
    actor: 'system',
    edgeFunctions: ['ai-parse-listing'],
    integrations: ['OpenAI GPT-4o-mini'],
    confidence: 'confirmed',
    debugTrigger: 'POST from AdminQuickList or ListADealPage',
  }, GX.admin - 160, 360),

  n('admin-deals', 'Manage Deals', {
    description: 'Lists properties by status: pending → approve/reject, live → unpublish, inactive → re-publish. All actions logged to admin_audit_log.',
    actor: 'admin',
    route: '/admin/marketplace/deals',
    files: ['src/features/admin-deals/AdminDeals.tsx'],
    tables: ['properties', 'admin_audit_log'],
    confidence: 'confirmed',
  }, GX.admin + 160, 200),

  n('deal-approved', 'Deal Approved/Live', {
    description: 'property.status set to live. Visible on /dashboard/deals to all users. Email sent to submitter (deal-approved-member).',
    actor: 'system',
    tables: ['properties'],
    edgeFunctions: ['send-email'],
    confidence: 'confirmed',
  }, GX.admin + 160, 360),

  n('admin-outreach', 'Admin Outreach', {
    description: 'Two tabs: (1) Landlord Activation — send cold WhatsApp to landlords who have listings but no inquiry yet. (2) Tenant Requests — review inquiries, choose release path.',
    actor: 'admin',
    route: '/admin/marketplace/outreach',
    files: ['src/features/admin-gate/AdminOutreach.tsx'],
    tables: ['inquiries', 'properties', 'landlord_invites'],
    edgeFunctions: ['ghl-enroll'],
    confidence: 'confirmed',
  }, GX.admin, 400),

  n('admin-release-gate', 'Release Gate Decision', {
    description: 'Admin chooses how to release inquiry to landlord: (1) NDA — landlord must sign NDA first. (2) NDA + Claim — sign NDA and claim account. (3) Direct — immediate authorization.',
    actor: 'admin',
    kind: 'decision',
    files: ['src/features/admin-gate/AdminOutreach.tsx'],
    tables: ['inquiries'],
    confidence: 'confirmed',
  }, GX.admin, 560),

  n('ghl-enroll-admin', 'ghl-enroll (Landlord)', {
    description: 'Searches GHL contact by phone. Creates if missing. Sets property_name custom field. Removes from previous workflow. Enrolls in selected workflow: Cold (NDA) or Warm (direct).',
    actor: 'system',
    edgeFunctions: ['ghl-enroll'],
    integrations: ['GHL'],
    confidence: 'confirmed',
    debugTrigger: 'POST from AdminOutreach on release click',
    risks: ['GHL contact search by phone — wrong contact if duplicate numbers in GHL'],
  }, GX.admin, 720),

  n('admin-users', 'Manage Users', {
    description: 'List all users. Filter by tier. Actions: suspend/unsuspend, edit, grant wallet access (time-limited), bulk delete (PIN). Soft-only — no hard auth delete from UI (use hard-delete-user edge fn).',
    actor: 'admin',
    route: '/admin/marketplace/users',
    files: ['src/features/admin-users/AdminUsers.tsx'],
    tables: ['profiles', 'nfs_operators'],
    edgeFunctions: ['hard-delete-user'],
    confidence: 'confirmed',
  }, GX.admin + 280, 400),

  n('hard-delete-user', 'hard-delete-user', {
    description: 'PIN-protected (5891). Cascades through 18 tables: nullifies FKs in inv_orders, aff_commissions, etc. Deletes profiles + auth.users. Cannot be undone.',
    actor: 'system',
    edgeFunctions: ['hard-delete-user'],
    tables: ['profiles', 'auth.users', 'crm_deals', 'inquiries', 'notifications', '...18 tables'],
    confidence: 'confirmed',
    risks: ['Irreversible. No soft-delete path for auth.users except this edge fn.'],
  }, GX.admin + 280, 560),

  n('admin-notifications', 'Admin Notifications', {
    description: 'Toggle email/WhatsApp per event type. Edit email templates. Preferences stored in notification_settings and email_templates tables.',
    actor: 'admin',
    route: '/admin/marketplace/notifications',
    tables: ['notification_settings', 'email_templates'],
    confidence: 'confirmed',
  }, GX.admin - 280, 400),

  n('deal-expiry', 'deal-expiry (Cron)', {
    description: 'Scheduled edge fn. Live >14 days → status=inactive + email. Live 7-14 days → status=on-offer + email + notification.',
    actor: 'system',
    edgeFunctions: ['deal-expiry'],
    tables: ['properties', 'notifications'],
    integrations: ['Resend (via send-email)'],
    confidence: 'confirmed',
    gaps: ['No cron job found in codebase — relies on external trigger (UptimeRobot or n8n). If scheduler stops, deals never expire.'],
  }, GX.admin - 280, 560),

  // ═══════════════════════════════════════
  // GROUP 5: LANDLORD
  // ═══════════════════════════════════════

  n('landlord-ghl-message', 'Landlord Gets WhatsApp', {
    description: 'GHL sends WhatsApp to landlord phone. Message contains property name, tenant interest, and magic link URL. Workflow: GHL_WORKFLOW_COLD or GHL_WORKFLOW_WARM.',
    actor: 'landlord',
    integrations: ['GHL WhatsApp'],
    confidence: 'confirmed',
    calledBy: ['ghl-enroll-admin'],
  }, GX.landlord, 0),

  n('landlord-magic-login-fn', 'landlord-magic-login', {
    description: 'Validates token in landlord_invites. Resolves phone → profile or creates placeholder (landlord_{phone}@nfstay.internal). Auto-generates session tokens. Marks invite used.',
    actor: 'system',
    edgeFunctions: ['landlord-magic-login'],
    tables: ['landlord_invites', 'profiles', 'chat_threads'],
    confidence: 'confirmed',
    debugTrigger: 'POST from MagicLoginPage with token',
  }, GX.landlord, 160),

  n('landlord-crm', 'Landlord CRM View', {
    description: 'Landlord sees Leads tab at /dashboard/crm. Inquiries filtered by their phone number. Status: new → authorized → nda_signed. Can message tenants in-platform.',
    actor: 'landlord',
    route: '/dashboard/crm',
    files: ['src/features/crm/CRMPage.tsx'],
    tables: ['inquiries', 'chat_threads', 'inquiry_messages'],
    confidence: 'confirmed',
  }, GX.landlord, 320),

  n('claim-account-banner', 'Claim Account Banner', {
    description: 'If landlord email ends with @nfstay.internal → ClaimAccountBanner appears. Landlord enters real name + email to claim their account and link all properties.',
    actor: 'landlord',
    files: ['src/features/landlord/ClaimAccountBanner.tsx'],
    confidence: 'confirmed',
  }, GX.landlord - 160, 480),

  n('claim-landlord-account', 'claim-landlord-account', {
    description: 'Updates auth.users email + profiles name. Links all properties, inquiries, chat_threads where contact_phone matches landlord phone. Landlord now owns their data.',
    actor: 'system',
    edgeFunctions: ['claim-landlord-account'],
    tables: ['profiles', 'auth.users', 'properties', 'inquiries', 'chat_threads'],
    confidence: 'confirmed',
    debugTrigger: 'POST from ClaimAccountBanner on submit',
  }, GX.landlord - 160, 640),

  n('nda-page', 'NDA Page', {
    description: 'Landlord must digitally sign NDA before seeing tenant details. Token-based access. Sets inquiries.nda_signed=true on completion.',
    actor: 'landlord',
    route: '/lead/:token/nda',
    tables: ['inquiries'],
    confidence: 'confirmed',
  }, GX.landlord + 160, 480),

  n('landlord-message-tenant', 'Landlord Messages Tenant', {
    description: 'InquiryChatModal sends messages. Thread stored in chat_threads + inquiry_messages. Real-time via Supabase Realtime. Templates from message_templates table.',
    actor: 'landlord',
    tables: ['chat_threads', 'inquiry_messages', 'message_templates'],
    confidence: 'confirmed',
  }, GX.landlord, 640),

  n('always-authorised', 'Always Authorised Logic', {
    description: 'If landlord.always_authorised=true in a previous inquiry, new inquiries from same landlord are auto-authorized (skip admin gate). Tracked per lister_phone.',
    actor: 'system',
    tables: ['inquiries'],
    confidence: 'confirmed',
  }, GX.landlord + 160, 640),

  // ═══════════════════════════════════════
  // GROUP 6: CRM & SUPPORT
  // ═══════════════════════════════════════

  n('crm-kanban', 'Tenant CRM Pipeline', {
    description: 'Drag-and-drop kanban. Stages: New Lead → Contacted → Negotiating → Deal Agreed → Archived. Custom deals, notes, last contact date. User-specific data.',
    actor: 'tenant',
    route: '/dashboard/crm',
    files: ['src/features/crm/CRMPage.tsx'],
    tables: ['crm_deals', 'message_templates'],
    confidence: 'confirmed',
  }, GX.crm, 0),

  n('university', 'Academy / University', {
    description: 'Course modules and lessons. AI tutor available per lesson. Admin manages content (modules, lessons, media). User progress tracked.',
    actor: 'tenant',
    route: '/dashboard/university',
    tables: ['university_modules', 'university_lessons'],
    confidence: 'confirmed',
  }, GX.crm - 160, 200),

  n('ai-chat', 'ai-chat (University)', {
    description: 'GPT-4o-mini answers questions in context of current lesson. System prompt includes lesson title, module, and content. Max 800 tokens response.',
    actor: 'system',
    edgeFunctions: ['ai-chat'],
    integrations: ['OpenAI GPT-4o-mini'],
    confidence: 'confirmed',
    debugTrigger: 'POST from useAIChat hook in lesson page',
  }, GX.crm - 160, 360),

  n('affiliates', 'Affiliates / Referrals', {
    description: 'User generates referral code. Share link: hub.nfstay.com/signup?ref={code}. Earns 30% on monthly/annual, 20-25% on lifetime, negotiable on JV deals. Payout via bank or crypto.',
    actor: 'tenant',
    route: '/dashboard/affiliates',
    files: ['src/features/affiliates/AffiliatesPage.tsx'],
    tables: ['aff_profiles', 'aff_events', 'aff_commissions'],
    confidence: 'confirmed',
  }, GX.crm + 160, 200),

  n('track-referral', 'track-referral', {
    description: 'GET endpoint. event=click → increments link_clicks. event=signup → sets profiles.referred_by, sends new-referral-agent email, increments aff_profiles.signups.',
    actor: 'system',
    edgeFunctions: ['track-referral'],
    tables: ['aff_profiles', 'aff_events', 'profiles'],
    integrations: ['Resend (via send-email)'],
    confidence: 'confirmed',
    debugTrigger: 'Called from ProtectedRoute, VerifyOtp, SignUp, ParticleAuthCallback',
  }, GX.crm + 160, 360),

  n('notifications-bell', 'Notification Bell', {
    description: 'Admin sees unread count in sidebar. notifications table. Real-time via Supabase Realtime + 30s poll fallback. Inserts from: process-inquiry, deal-expiry, admin actions.',
    actor: 'system',
    tables: ['notifications'],
    integrations: ['Supabase Realtime'],
    confidence: 'confirmed',
  }, GX.crm, 360),

  n('crm-leaderboard', 'CRM Leaderboard', {
    description: 'Agent performance dashboard at /crm/leaderboard. Shows top agents by metrics. Filter via wk_voice_agent_limits.show_on_leaderboard toggle in Settings → Agents. Trophy popover in top nav (top 5).',
    actor: 'tenant',
    route: '/crm/leaderboard',
    files: ['src/features/smsv2/pages/LeaderboardPage.tsx'],
    tables: ['wk_voice_agent_limits'],
    integrations: ['Supabase Realtime'],
    confidence: 'confirmed',
  }, GX.crm - 160, 520),

  n('crm-inbound-bell', 'CRM Inbound Notifications (Bell)', {
    description: 'Smsv2StatusBar bell icon. useInboxNotifications subscribes to wk_sms_messages INSERT inbound. Unread badge + drawer showing recent SMS/WhatsApp/Email. 30s poll fallback.',
    actor: 'system',
    tables: ['wk_sms_messages'],
    integrations: ['Supabase Realtime'],
    edgeFunctions: ['wk-sms-incoming', 'unipile-webhook', 'wk-email-webhook'],
    confidence: 'confirmed',
  }, GX.crm + 160, 520),

  n('followup-prompt-modal', 'Follow-up Auto-Prompt', {
    description: 'After every SMS/WhatsApp/Email send (InboxPage, ContactSmsModal, MidCallSmsSender), FollowupPromptModal opens. Agent optionally sets due_at + note. Saved to wk_contact_followups. EditContactModal edits next pending follow-up. Working-hours warning (10 AM–7 PM browser local time).',
    actor: 'tenant',
    files: ['src/features/smsv2/FollowupPromptModal.tsx', 'src/features/smsv2/EditContactModal.tsx'],
    tables: ['wk_contact_followups'],
    confidence: 'confirmed',
    debugTrigger: 'Sent message via InboxPage, ContactSmsModal, or MidCallSmsSender',
  }, GX.crm, 680),

  n('channel-management', 'Channel Selection + Reset', {
    description: 'Agent picks channel (SMS, WhatsApp, Email) before send. Post-send, channel resets to null. Forces re-pick before next send to prevent wrong-channel mistakes. Mid-call only: stage gate via pickedStageId with pulse hint if missing.',
    actor: 'tenant',
    files: ['src/features/smsv2/InboxPage.tsx', 'src/features/smsv2/ContactSmsModal.tsx', 'src/features/smsv2/MidCallSmsSender.tsx'],
    tables: ['wk_numbers'],
    confidence: 'confirmed',
  }, GX.crm - 160, 680),

  n('email-inbound-mail-nfstay', 'Email Inbound (mail.nfstay.com)', {
    description: 'CRM inbound email via Resend EU (eu-west-1). MX → AWS SES inbound-smtp. Webhook validates Svix HMAC. Body fetched via GET /emails/inbound/{id}. Reply quotes stripped (Gmail, Outlook markers + > lines). Stored in wk_sms_messages channel=email.',
    actor: 'system',
    edgeFunctions: ['wk-email-webhook'],
    integrations: ['Resend', 'AWS SES'],
    tables: ['wk_sms_messages'],
    webhooks: ['Resend webhook'],
    confidence: 'confirmed',
    debugTrigger: 'Email received at mail.nfstay.com',
  }, GX.crm + 160, 840),

  n('send-email', 'send-email (27 types)', {
    description: '27 email types via Resend. Templates: hardcoded defaults + email_templates table overrides. User pref checks (notif_email_daily). Admin toggles per event (notification_settings).',
    actor: 'system',
    edgeFunctions: ['send-email'],
    integrations: ['Resend API'],
    tables: ['profiles', 'notification_settings', 'email_templates'],
    confidence: 'confirmed',
    debugTrigger: 'Called by: process-inquiry, ghl-payment-webhook, track-referral, deal-expiry, admin pages',
  }, GX.crm, 520),

  // ═══════════════════════════════════════
  // GROUP 7: BOOKING (nfstay.app)
  // ═══════════════════════════════════════

  n('nfs-operator-onboarding', 'Operator Onboarding (8 Steps)', {
    description: '8-step wizard: (1) Account setup/name [required], (2) Persona, (3) Usage intent, (4) Business info, (5) Landing page hero, (6) Website customisation, (7) Contact info, (8) Payment methods. Stores in nfs_operators.',
    actor: 'booking',
    route: '/nfstay/onboarding',
    files: ['src/pages/nfstay/NfsOnboarding.tsx', 'src/components/nfstay/onboarding/'],
    tables: ['nfs_operators'],
    confidence: 'confirmed',
  }, GX.booking, 0),

  n('nfs-stripe-connect', 'Stripe Connect OAuth', {
    description: 'Operator connects their Stripe account. OAuth2 flow: authorize → callback → token exchange. Platform fee % stored (default 3%). Destination charge model.',
    actor: 'booking',
    edgeFunctions: ['nfs-stripe-connect-oauth'],
    tables: ['nfs_stripe_accounts'],
    integrations: ['Stripe Connect'],
    confidence: 'confirmed',
    debugTrigger: 'GET /nfstay/oauth-callback?code=',
  }, GX.booking - 160, 200),

  n('nfs-hospitable', 'Hospitable Calendar Sync', {
    description: 'OAuth2 integration with Hospitable for Airbnb calendar sync. Stores connection in nfs_hospitable_connections. Enables availability import.',
    actor: 'booking',
    edgeFunctions: ['nfs-hospitable-oauth'],
    tables: ['nfs_hospitable_connections'],
    integrations: ['Hospitable', 'Airbnb'],
    confidence: 'confirmed',
  }, GX.booking + 160, 200),

  n('nfs-properties', 'Operator Properties', {
    description: 'Operator creates and manages listings. Manual entry or Hospitable sync. Dynamic pricing rules. iCal feed generated for each property.',
    actor: 'booking',
    route: '/nfstay/properties',
    tables: ['nfs_properties', 'nfs_pricing_rules'],
    edgeFunctions: ['nfs-ical-feed', 'nfs-domain-verify'],
    confidence: 'confirmed',
  }, GX.booking, 200),

  n('nfs-property-view', 'Guest Views Property', {
    description: 'Public property page at /nfstay/property/:id. No auth required. Shows pricing, availability, images. Guest selects dates → redirected to /checkout.',
    actor: 'booking',
    route: '/nfstay/property/:id',
    tables: ['nfs_properties'],
    confidence: 'confirmed',
  }, GX.booking, 400),

  n('nfs-checkout', 'Guest Checkout', {
    description: '/checkout page. Reads sessionStorage booking intent (15-min expiry). Collects guest name, email, phone, special requests, promo code. Shows pricing breakdown.',
    actor: 'booking',
    route: '/checkout',
    files: ['src/pages/nfstay/NfsCheckoutPage.tsx'],
    tables: ['nfs_reservations', 'nfs_properties'],
    confidence: 'confirmed',
  }, GX.booking, 540),

  n('nfs-stripe-checkout', 'nfs-stripe-checkout', {
    description: 'Creates Stripe Checkout session. Destination charge to operator account. Platform fee deducted. Currencies: GBP, USD, EUR, AED, SGD. Returns Stripe checkout URL.',
    actor: 'system',
    edgeFunctions: ['nfs-stripe-checkout'],
    tables: ['nfs_reservations', 'nfs_stripe_accounts'],
    integrations: ['Stripe'],
    confidence: 'confirmed',
    debugTrigger: 'POST from NfsCheckoutPage on "Pay Now"',
  }, GX.booking, 680),

  n('nfs-stripe-webhook', 'nfs-stripe-webhook', {
    description: 'Handles: checkout.session.completed → reservation status=paid, payment_intent.succeeded, charge.refunded, account.updated (Stripe Connect), transfer.created. HMAC-SHA256 verified.',
    actor: 'system',
    edgeFunctions: ['nfs-stripe-webhook'],
    tables: ['nfs_reservations', 'nfs_webhook_events', 'nfs_stripe_accounts'],
    webhooks: ['Stripe webhook'],
    confidence: 'confirmed',
    debugTrigger: 'POST from Stripe on payment events',
  }, GX.booking, 820),

  n('nfs-reservation', 'Reservation Created', {
    description: 'nfs_reservations row: guest info, dates, total, status=paid, booking_source (main_platform | white_label | operator_direct). Operator sees in /nfstay/reservations.',
    actor: 'booking',
    tables: ['nfs_reservations'],
    confidence: 'confirmed',
  }, GX.booking, 960),

  n('nfs-payment-success', 'Guest Payment Success', {
    description: 'Redirect to /nfstay/payment/success?session_id=. Shows booking confirmation, reservation ID, "View Booking Details" (token-based, no auth required).',
    actor: 'booking',
    route: '/nfstay/payment/success',
    tables: ['nfs_reservations'],
    confidence: 'confirmed',
  }, GX.booking, 1100),

  n('nfs-email-send', 'Booking Emails', {
    description: 'Sends: booking_confirmation (guest), booking_cancelled (guest + operator), operator_new_booking (operator). Via Resend with NFS_RESEND_API_KEY.',
    actor: 'system',
    edgeFunctions: ['nfs-email-send'],
    integrations: ['Resend'],
    confidence: 'confirmed',
  }, GX.booking + 200, 960),

  n('nfs-operator-dashboard', 'Operator Dashboard', {
    description: 'Overview: reservations, revenue, occupancy. /nfstay/analytics for detailed stats. /nfstay/settings for Stripe, branding, custom domain, bank details.',
    actor: 'booking',
    route: '/nfstay',
    tables: ['nfs_operators', 'nfs_reservations', 'nfs_properties'],
    confidence: 'confirmed',
  }, GX.booking - 200, 960),

  // ═══════════════════════════════════════
  // GROUP 8: INVESTMENT
  // ═══════════════════════════════════════

  n('invest-marketplace', 'Investment Marketplace', {
    description: 'Browse JV property listings. Each has: price/share, total shares, shares sold, monthly rent, target, funded %, min contribution, returns. Recent purchases from The Graph.',
    actor: 'crypto',
    route: '/dashboard/invest/marketplace',
    files: ['src/pages/invest/InvestMarketplacePage.tsx'],
    tables: ['inv_properties'],
    integrations: ['The Graph (Marketplace subgraph)'],
    confidence: 'confirmed',
  }, GX.invest, 0),

  n('invest-buy-decision', 'Payment Method?', {
    description: 'User chooses how to purchase shares: (1) Crypto wallet (USDC on BNB Chain) or (2) Card via SamCart.',
    actor: 'crypto',
    kind: 'decision',
    confidence: 'confirmed',
  }, GX.invest, 180),

  n('invest-buy-crypto', 'Buy Shares (Crypto)', {
    description: 'useBlockchain.buyShares() called. (1) Read USDC balance. (2) ERC20.approve() USDC to Marketplace contract. (3) buyPrimaryShares(recipient, USDC, propertyId, amount, 0, agent). (4) tx.wait(). (5) call inv-crypto-confirm.',
    actor: 'crypto',
    files: ['src/hooks/useBlockchain.ts'],
    tables: ['inv_orders'],
    integrations: ['BNB Chain', 'Particle wallet', 'USDC ERC20'],
    confidence: 'confirmed',
    debugTrigger: 'User clicks "Secure Your Shares" → wallet tx',
  }, GX.invest - 200, 360),

  n('invest-buy-card', 'Buy Shares (Card via SamCart)', {
    description: 'Frontend builds SamCart prefill params (propertyId, agentWallet in custom fields). User redirected to SamCart checkout page. SamCart sends webhook on completion.',
    actor: 'payment',
    integrations: ['SamCart'],
    confidence: 'confirmed',
  }, GX.invest + 200, 360),

  n('samcart-webhook', 'inv-samcart-webhook', {
    description: 'SamCart webhook → fetch order+customer from SamCart API → parse propertyId/agentWallet → call sendPrimaryShares on-chain (BACKEND_PRIVATE_KEY) → create inv_orders + aff_commissions → send emails.',
    actor: 'system',
    edgeFunctions: ['inv-samcart-webhook'],
    tables: ['inv_orders', 'aff_commissions', 'inv_properties'],
    webhooks: ['SamCart webhook'],
    integrations: ['SamCart API', 'BNB Chain (server-side tx)'],
    confidence: 'confirmed',
    gaps: ['BACKEND_PRIVATE_KEY must be set in Supabase secrets — if missing, shares never sent silently'],
    risks: ['Server-side blockchain tx requires BACKEND_PRIVATE_KEY. No fallback if env var missing.'],
  }, GX.invest + 200, 540),

  n('inv-crypto-confirm', 'inv-crypto-confirm', {
    description: 'POST after on-chain tx confirmed. Deduplicates by tx_hash. Verifies wallet in profiles. Creates inv_orders (status=completed). Creates aff_commissions (5%). Sends 3 emails + notifications.',
    actor: 'system',
    edgeFunctions: ['inv-crypto-confirm'],
    tables: ['inv_orders', 'aff_commissions', 'notifications'],
    confidence: 'confirmed',
    debugTrigger: 'POST from useBlockchain after tx.wait()',
    risks: ['Uses raw fetch() not supabase.functions.invoke() because Particle signing drops Supabase auth session'],
  }, GX.invest - 200, 540),

  n('aff-commission-create', 'Commission Created (5-40%)', {
    description: 'aff_commissions row created. Rate: 40% of investment (inv-process-order) or 5% (inv-crypto-confirm/samcart). claimable_at = now + 14 days. Status: pending → claimable.',
    actor: 'system',
    tables: ['aff_commissions', 'aff_profiles'],
    confidence: 'confirmed',
    gaps: ['Commission rate inconsistency: inv-process-order uses 40%, inv-crypto-confirm/samcart use 5% — need to verify which is correct'],
  }, GX.invest, 680),

  n('invest-portfolio', 'Investment Portfolio', {
    description: 'Holdings view. Share balance read from RWA_TOKEN.balanceOf(). Boost status from inv_boost_status. Can boost shares via Booster contract. APR calculation.',
    actor: 'crypto',
    route: '/dashboard/invest/portfolio',
    files: ['src/pages/invest/InvestPortfolioPage.tsx'],
    tables: ['inv_shareholdings', 'inv_boost_status'],
    integrations: ['BNB Chain (RWA_TOKEN balanceOf)', 'Booster contract'],
    confidence: 'confirmed',
  }, GX.invest - 200, 820),

  n('invest-proposals', 'Shareholder Proposals', {
    description: 'Vote on proposals using Voting contract. Proposals from DB + The Graph Voting subgraph. castVote() on Voting contract. votes_yes/votes_no synced. inv_votes row inserted.',
    actor: 'crypto',
    route: '/dashboard/invest/proposals',
    tables: ['inv_proposals', 'inv_votes'],
    integrations: ['BNB Chain (Voting contract)', 'The Graph (Voting subgraph)'],
    confidence: 'confirmed',
  }, GX.invest, 820),

  n('invest-payouts', 'Investment Payouts', {
    description: 'Claim rent: (1) Crypto → withdrawRent() on Rent contract (instant USDC). (2) Bank → submit-payout-claim → weekly Revolut batch on Tuesday. History from The Graph Rent subgraph.',
    actor: 'crypto',
    route: '/dashboard/invest/payouts',
    files: ['src/pages/invest/InvestPayoutsPage.tsx'],
    tables: ['inv_payouts', 'user_bank_accounts', 'payout_claims'],
    edgeFunctions: ['submit-payout-claim', 'save-bank-details'],
    integrations: ['BNB Chain (Rent contract)', 'Revolut', 'The Graph'],
    confidence: 'confirmed',
    gaps: ['inv_payouts population: no edge fn found that syncs rent from contract to table — assumed n8n workflow'],
  }, GX.invest + 200, 820),

  n('admin-invest-orders', 'Admin: Investment Orders', {
    description: 'View all share purchase orders. Status: pending → completed. inv-approve-order edge fn to manually approve pending orders.',
    actor: 'admin',
    route: '/admin/invest/orders',
    tables: ['inv_orders'],
    edgeFunctions: ['inv-approve-order'],
    confidence: 'confirmed',
  }, GX.invest - 200, 1000),

  n('admin-invest-payouts', 'Admin: Approve Payouts', {
    description: 'View payout_claims. Click "Approve" → revolut-pay creates Revolut payment DRAFT. Hugo approves in Revolut app (Face ID). Revolut webhook confirms payment.',
    actor: 'admin',
    route: '/admin/invest/payouts',
    tables: ['payout_claims', 'payout_audit_log'],
    edgeFunctions: ['revolut-pay', 'revolut-check-status'],
    confidence: 'confirmed',
  }, GX.invest + 200, 1000),

  // ═══════════════════════════════════════
  // GROUP 9: CRYPTO / BLOCKCHAIN
  // ═══════════════════════════════════════

  n('particle-wallet', 'Particle MPC Wallet', {
    description: 'MPC wallet created after OTP verify. particle-generate-jwt signs RS256 JWT (user_id in sub). Particle verifies against particle-jwks endpoint. Wallet address saved to profiles.wallet_address.',
    actor: 'crypto',
    edgeFunctions: ['particle-generate-jwt', 'particle-jwks'],
    tables: ['profiles'],
    integrations: ['Particle Network MPC'],
    confidence: 'confirmed',
    risks: ['If Particle Network goes down, funds safe on-chain but wallet inaccessible'],
    gaps: ['MPC recovery procedure if Particle is unavailable — not documented in codebase'],
  }, GX.crypto, 0),

  n('particle-generate-jwt', 'particle-generate-jwt', {
    description: 'Generates RS256 JWT. Claims: sub=user_id, iss=hub.nfstay.com, exp=+1hr. Signed with PARTICLE_JWT_PRIVATE_KEY (PEM). Returned to frontend for Particle SDK.',
    actor: 'system',
    edgeFunctions: ['particle-generate-jwt'],
    confidence: 'confirmed',
    gaps: ['PARTICLE_JWT_PRIVATE_KEY must be set in Supabase secrets — if missing, wallet creation fails silently'],
  }, GX.crypto - 160, 180),

  n('contract-marketplace', 'BNB: Marketplace Contract', {
    description: 'buyPrimaryShares(recipient, agentWallet, propertyId, sharesRequested). Gets fee from getMarketplaceFee(). Distributes USDC on-chain. Address: 0xDD22...ac128.',
    actor: 'crypto',
    integrations: ['BNB Chain', 'BuyLP 0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128'],
    confidence: 'confirmed',
  }, GX.crypto - 200, 360),

  n('contract-rwa', 'BNB: RWA Token (ERC1155)', {
    description: 'ERC1155 representing property shares. balanceOf(address, propertyId) → user\'s shares. Used by Portfolio page. Address: 0xA588...157b.',
    actor: 'crypto',
    integrations: ['BNB Chain', 'RWA 0xA588E7dC42a956cc6c412925dE99240cc329157b'],
    confidence: 'confirmed',
  }, GX.crypto - 50, 360),

  n('contract-rent', 'BNB: Rent Contract', {
    description: 'withdrawRent(propertyId) → USDC to user wallet. getRentDetails() → rent pool, per-share amount. getRentHistory(). isEligibleForRent(). Address: 0x5880...0C89.',
    actor: 'crypto',
    integrations: ['BNB Chain', 'Rent 0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89'],
    confidence: 'confirmed',
  }, GX.crypto + 100, 360),

  n('contract-voting', 'BNB: Voting Contract', {
    description: 'vote(proposalId, inFavor). getProposal(proposalId). decodeString(). Used by Proposals page. Address: 0x5edd...047.',
    actor: 'crypto',
    integrations: ['BNB Chain', 'Voting 0x5edd93fE27eD8A0e7242490193c996BaE01EB047'],
    confidence: 'confirmed',
  }, GX.crypto + 250, 360),

  n('contract-booster', 'BNB: Booster Contract', {
    description: 'boost(propertyId). getBoostDetails(). getEstimatedRewards(). claimRewards(). Increases APR on staked shares. Address: 0x9d5D...20b.',
    actor: 'crypto',
    integrations: ['BNB Chain', 'Booster 0x9d5D6EeF995d24DEC8289613D6C8F946214B320b'],
    confidence: 'confirmed',
  }, GX.crypto + 400, 360),

  n('contract-buylp', 'BNB: BuyLP Contract', {
    description: 'getLpEstimation(amountUsdc) → LP token estimate. Used for LP payout option. Address: 0x3e6E...786f.',
    actor: 'crypto',
    integrations: ['BNB Chain', 'BuyLP 0x3e6E0791683F003E963Df5357cfaA0Aaa733786f'],
    confidence: 'likely',
  }, GX.crypto + 550, 360),

  n('the-graph', 'The Graph (Blockchain Indexing)', {
    description: '3 subgraphs: (1) Marketplace — primarySharesBoughts (recent activity). (2) Voting — proposals + votes. (3) Rent — rentWithdrawns (payout history). (4) Booster events.',
    actor: 'integration',
    integrations: ['The Graph Studio', 'GraphQL'],
    confidence: 'confirmed',
    calledBy: ['invest-marketplace', 'invest-proposals', 'invest-payouts'],
  }, GX.crypto, 540),

  n('revolut-pay', 'revolut-pay', {
    description: 'Creates Revolut payment DRAFT. Steps: revolut-token-refresh → register counterparty → get exchange rate (USD→GBP, fallback 0.75) → POST /payment-drafts. Returns draft_id. Does NOT pay — Hugo approves in Revolut app.',
    actor: 'system',
    edgeFunctions: ['revolut-pay'],
    tables: ['payout_claims', 'payout_audit_log'],
    integrations: ['Revolut Business API'],
    confidence: 'confirmed',
    debugTrigger: 'POST from AdminInvestPayouts "Approve" button or n8n batch',
  }, GX.crypto - 200, 720),

  n('revolut-token-refresh', 'revolut-token-refresh', {
    description: 'Refreshes Revolut OAuth access token every 30min via n8n cron. Builds JWT with client_id, signs with private key. POSTs to Revolut /token. Stores new tokens in Supabase secrets.',
    actor: 'system',
    edgeFunctions: ['revolut-token-refresh'],
    integrations: ['Revolut OAuth API', 'n8n cron'],
    confidence: 'confirmed',
    risks: ['If n8n cron stops, tokens expire and revolut-pay + revolut-check-status fail'],
  }, GX.crypto - 200, 880),

  n('revolut-webhook', 'revolut-webhook', {
    description: 'Revolut fires on TransactionCompleted or TransactionFailed. HMAC-SHA256 verified. Updates payout_claims status=paid. Cascades to inv_payouts or aff_commissions (status=paid). TODO: WhatsApp alert to user.',
    actor: 'system',
    edgeFunctions: ['revolut-webhook'],
    tables: ['payout_claims', 'inv_payouts', 'aff_commissions', 'payout_audit_log'],
    webhooks: ['Revolut webhook'],
    confidence: 'confirmed',
    gaps: ['WhatsApp notification to user on payout complete — marked TODO in code, not implemented'],
  }, GX.crypto, 720),

  n('n8n-tuesday-batch', 'n8n: Tuesday Payout Batch', {
    description: 'Runs Tuesday 05:00 AM UK. Queries pending payout_claims for current ISO week. Calls revolut-pay per claim. Sends WhatsApp summary to Hugo: "Batch ready — N payees, £X".',
    actor: 'integration',
    integrations: ['n8n', 'GHL WhatsApp'],
    confidence: 'unverified',
    gaps: ['n8n workflow not in codebase — must be active in n8n UI. If inactive, no batch runs.'],
  }, GX.crypto + 200, 720),

  n('bank-payout-complete', 'User Receives Bank Transfer', {
    description: 'GBP: Faster Payments (same day). EUR: SEPA (same/next day). USD: ACH (1-2 days). International: SWIFT (1-5 days). payout_claims.status=paid. Source rows cascaded.',
    actor: 'integration',
    tables: ['payout_claims', 'inv_payouts', 'aff_commissions'],
    confidence: 'confirmed',
  }, GX.crypto, 900),

  n('submit-payout-claim', 'submit-payout-claim', {
    description: 'User clicks "Claim" (Bank). Checks user_bank_accounts exists. Calculates amount server-side (never trusts frontend amount). UNIQUE(user_id, week_ref) constraint prevents doubles. Creates payout_claims (pending). Updates source rows (claimed).',
    actor: 'system',
    edgeFunctions: ['submit-payout-claim'],
    tables: ['payout_claims', 'user_bank_accounts', 'inv_payouts', 'aff_commissions', 'payout_audit_log'],
    confidence: 'confirmed',
    debugTrigger: 'POST from InvestPayoutsPage "Claim" button',
  }, GX.crypto - 200, 560),

  n('save-bank-details', 'save-bank-details', {
    description: 'Validates and saves bank account: sort code (UK), IBAN (EU), etc. Stored in user_bank_accounts. revolut-pay later populates revolut_counterparty_id.',
    actor: 'system',
    edgeFunctions: ['save-bank-details'],
    tables: ['user_bank_accounts', 'payout_audit_log'],
    confidence: 'confirmed',
    debugTrigger: 'POST from PayoutsPage bank form on first claim',
  }, GX.crypto - 200, 400),

];
