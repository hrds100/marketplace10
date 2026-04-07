-- inv_kyc_sessions: Veriff identity verification sessions for investment KYC
-- KYC gates payout claims only, NOT share purchases

create table if not exists public.inv_kyc_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  wallet_address text not null,
  session_id text,
  status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_kyc_sessions_user_id_key unique (user_id)
);

-- Index for wallet lookups
create index if not exists idx_inv_kyc_sessions_wallet on public.inv_kyc_sessions(wallet_address);

-- RLS
alter table public.inv_kyc_sessions enable row level security;

-- Users can read their own row
create policy "Users can view own KYC session"
  on public.inv_kyc_sessions for select
  using (auth.uid() = user_id);

-- Users can insert their own row
create policy "Users can insert own KYC session"
  on public.inv_kyc_sessions for insert
  with check (auth.uid() = user_id);

-- Users can update their own row (session_id and status only enforced at app level)
create policy "Users can update own KYC session"
  on public.inv_kyc_sessions for update
  using (auth.uid() = user_id);

-- Service role bypasses RLS automatically
