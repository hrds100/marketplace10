export interface TestResult {
  id: string;
  name: string;
  suite: string;
  route: string;
  status: "passing" | "failing" | "stale";
  expected?: string;
  actual?: string;
  errorMessage?: string;
  timestamp: string;
  consecutiveFailures?: number;
  duration?: number;
}

const now = Date.now();

export const MOCK_TEST_RESULTS: TestResult[] = [
  // ── Failing tests ──────────────────────────────────────
  {
    id: "MKT-017",
    name: "Deal submission saves all required fields",
    suite: "Marketplace Core",
    route: "/list-a-deal",
    status: "failing",
    expected: "Property inserted with status 'pending_review'",
    actual: "RLS policy violation: INSERT on properties denied for authenticated role",
    errorMessage:
      "PostgrestError: new row violates row-level security policy for table \"properties\"",
    timestamp: new Date(now - 3 * 60_000).toISOString(),
    consecutiveFailures: 4,
    duration: 1230,
  },
  {
    id: "INV-031",
    name: "Buy shares transaction completes on BNB Chain",
    suite: "Invest",
    route: "/invest/marketplace",
    status: "failing",
    expected: "Transaction receipt with status 1 (success)",
    actual: "Transaction reverted: insufficient USDC allowance",
    errorMessage:
      'ContractFunctionExecutionError: execution reverted: "ERC20: insufficient allowance"',
    timestamp: new Date(now - 7 * 60_000).toISOString(),
    consecutiveFailures: 2,
    duration: 8450,
  },
  {
    id: "BKS-012",
    name: "Guest booking creates Stripe PaymentIntent",
    suite: "Bookingsite",
    route: "/nfstay/search",
    status: "failing",
    expected: "PaymentIntent created with amount matching nightly rate x nights",
    actual: "Stripe API returned 401: Invalid API Key provided",
    errorMessage:
      "StripeAuthenticationError: Invalid API Key provided: sk_test_****EXPIRED",
    timestamp: new Date(now - 1 * 60_000).toISOString(),
    consecutiveFailures: 11,
    duration: 340,
  },

  // ── Stale test ─────────────────────────────────────────
  {
    id: "MKT-008",
    name: "Affiliate commission calculated on referral signup",
    suite: "Marketplace Core",
    route: "/admin/affiliates",
    status: "stale",
    timestamp: new Date(now - 15 * 60_000).toISOString(),
    duration: 560,
  },

  // ── Passing tests ──────────────────────────────────────
  {
    id: "MKT-001",
    name: "Homepage renders hero section",
    suite: "Marketplace Core",
    route: "/",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 420,
  },
  {
    id: "MKT-002",
    name: "Deals page loads property cards",
    suite: "Marketplace Core",
    route: "/deals",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 890,
  },
  {
    id: "MKT-003",
    name: "CRM pipeline displays stages",
    suite: "Marketplace Core",
    route: "/crm",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 650,
  },
  {
    id: "MKT-004",
    name: "Inbox loads chat threads",
    suite: "Marketplace Core",
    route: "/inbox",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 710,
  },
  {
    id: "MKT-005",
    name: "University lesson content renders",
    suite: "Marketplace Core",
    route: "/university",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 530,
  },
  {
    id: "MKT-006",
    name: "Sign-up creates profile and sends OTP",
    suite: "Marketplace Core",
    route: "/sign-up",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 1100,
  },
  {
    id: "MKT-007",
    name: "Admin submissions page lists pending properties",
    suite: "Marketplace Core",
    route: "/admin/submissions",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 480,
  },
  {
    id: "INV-001",
    name: "Investment marketplace loads property cards",
    suite: "Invest",
    route: "/invest/marketplace",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 920,
  },
  {
    id: "INV-002",
    name: "Portfolio page shows shareholdings",
    suite: "Invest",
    route: "/invest/portfolio",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 770,
  },
  {
    id: "INV-003",
    name: "Governance proposals render with vote counts",
    suite: "Invest",
    route: "/invest/governance",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 680,
  },
  {
    id: "INV-004",
    name: "Rent claim button triggers blockchain tx",
    suite: "Invest",
    route: "/invest/portfolio",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 3200,
  },
  {
    id: "BKS-001",
    name: "Search page renders property list",
    suite: "Bookingsite",
    route: "/nfstay/search",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 610,
  },
  {
    id: "BKS-002",
    name: "Property detail page shows amenities",
    suite: "Bookingsite",
    route: "/nfstay/property/1",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 540,
  },
  {
    id: "BKS-003",
    name: "Operator dashboard loads reservations",
    suite: "Bookingsite",
    route: "/nfstay/operator/dashboard",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 830,
  },
  {
    id: "BKS-004",
    name: "Onboarding wizard saves operator profile",
    suite: "Bookingsite",
    route: "/nfstay/operator/onboarding",
    status: "passing",
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration: 950,
  },
];

export const DEFAULT_AI_SYSTEM_PROMPT = `You are an expert full-stack developer specializing in React, TypeScript, Supabase, and Vite. You are fixing a failing end-to-end test in the nfstay marketplace (hub.nfstay.com).

Context:
- The app uses React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend is Supabase (Postgres + Auth + Edge Functions + Storage)
- Blockchain features use BNB Chain + Particle Wallet
- Booking site uses Stripe for payments
- Automations run on Supabase Edge Functions + GHL workflows

When given a test failure, you must:
1. Identify the root cause from the error message
2. Locate the exact file(s) that need changing
3. Provide the minimal code fix with before/after
4. Explain why this fixes the issue in one sentence
5. Note any RLS policy, env var, or migration changes needed

Keep your response concise and actionable. No filler.`;
