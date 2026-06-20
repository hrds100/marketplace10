-- ============================================================================
-- Better Proposals import: archive all BP contracts in our DB.
-- Why: cancelling BP subscription, need full archive + searchable admin viewer
-- at /agreements. Additive only on shared `agreements` table; new `bp_*` tables
-- for reference data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Additive columns on agreements
-- ----------------------------------------------------------------------------
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'native'
    CHECK (source IN ('native','bp_import')),
  ADD COLUMN IF NOT EXISTS bp_id text,
  ADD COLUMN IF NOT EXISTS bp_type_id integer,
  ADD COLUMN IF NOT EXISTS bp_type_name text,
  ADD COLUMN IF NOT EXISTS bp_brand_id text,
  ADD COLUMN IF NOT EXISTS bp_company_id text,
  ADD COLUMN IF NOT EXISTS bp_quote_id text,
  ADD COLUMN IF NOT EXISTS bp_assigned_to text,
  ADD COLUMN IF NOT EXISTS bp_preview_url text,
  ADD COLUMN IF NOT EXISTS bp_view_url text,
  ADD COLUMN IF NOT EXISTS bp_raw jsonb,
  ADD COLUMN IF NOT EXISTS signer_email text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS subject_line text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS personal_message text,
  ADD COLUMN IF NOT EXISTS date_sent timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS html_storage_path text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS bp_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bp_deleted boolean DEFAULT false;

-- Token was NOT NULL; BP imports use bp_id instead. Drop the NOT NULL,
-- enforce "at least one identifier present" via CHECK.
ALTER TABLE agreements ALTER COLUMN token DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agreements_token_or_bpid'
  ) THEN
    ALTER TABLE agreements
      ADD CONSTRAINT agreements_token_or_bpid
      CHECK (token IS NOT NULL OR bp_id IS NOT NULL);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS agreements_bp_id_uidx
  ON agreements(bp_id) WHERE bp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agreements_source_idx ON agreements(source);
CREATE INDEX IF NOT EXISTS agreements_bp_type_idx ON agreements(bp_type_id);
CREATE INDEX IF NOT EXISTS agreements_date_sent_idx ON agreements(date_sent DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS agreements_company_name_idx ON agreements(company_name);

-- Full-text search: weighted across title, recipient/signer, body, etc.
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple',
      coalesce(recipient_name,'') || ' ' ||
      coalesce(signer_name,'')    || ' ' ||
      coalesce(company_name,'')   || ' ' ||
      coalesce(signer_email,'')   || ' ' ||
      coalesce(recipient_email,'')
    ), 'B') ||
    setweight(to_tsvector('simple',
      coalesce(description,'')   || ' ' ||
      coalesce(subject_line,'')  || ' ' ||
      coalesce(personal_message,'')
    ), 'C') ||
    setweight(to_tsvector('simple', coalesce(terms_html,'')), 'D')
  ) STORED;
CREATE INDEX IF NOT EXISTS agreements_search_idx ON agreements USING GIN (search_tsv);

-- ----------------------------------------------------------------------------
-- 2. Tighten read RLS: BP-imported rows are admin-only.
--    Existing public-read policy was "USING (true)" — fine for native
--    (public sign page reads by token), but BP rows must not be exposed.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "agreements_public_read" ON agreements;

CREATE POLICY "agreements_native_public_read"
  ON agreements FOR SELECT
  USING (source = 'native');

CREATE POLICY "agreements_bp_admin_read"
  ON agreements FOR SELECT
  USING (
    source = 'bp_import'
    AND (auth.jwt() ->> 'email') IN (
      'admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. BP reference tables (lookup data so we can rebuild relationships)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bp_templates (
  bp_id text PRIMARY KEY,
  account_id text,
  template_name text,
  description text,
  type_id integer,
  type_name text,
  brand_id text,
  cover_id text,
  category_id text,
  industry_id text,
  is_default boolean,
  is_deleted boolean,
  sample_template boolean,
  from_marketplace text,
  quote_amount numeric,
  monthly_amount numeric,
  quarterly_amount numeric,
  annual_amount numeric,
  date_created timestamptz,
  date_edited timestamptz,
  raw jsonb,
  imported_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bp_templates_type_idx ON bp_templates(type_id);
CREATE INDEX IF NOT EXISTS bp_templates_name_idx ON bp_templates(template_name);

CREATE TABLE IF NOT EXISTS bp_companies (
  bp_id text PRIMARY KEY,
  account_id text,
  company_name text,
  company_crm_id text,
  is_demo boolean,
  is_deleted boolean,
  date_created timestamptz,
  date_edited timestamptz,
  raw jsonb,
  imported_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bp_companies_name_idx ON bp_companies(company_name);

CREATE TABLE IF NOT EXISTS bp_quotes (
  bp_id text PRIMARY KEY,
  account_id text,
  company_id text,
  status integer,
  quote_amount numeric,
  monthly_amount numeric,
  quarterly_amount numeric,
  annual_amount numeric,
  vat_amount numeric,
  quote_total numeric,
  is_archived boolean,
  is_deleted boolean,
  marked_dead boolean,
  date_created timestamptz,
  date_edited timestamptz,
  date_accepted timestamptz,
  date_completed timestamptz,
  raw jsonb,
  imported_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bp_quotes_company_idx ON bp_quotes(company_id);

CREATE TABLE IF NOT EXISTS bp_doctypes (
  bp_id integer PRIMARY KEY,
  type_name text,
  type_name_singular text,
  type_colour text,
  num_outstanding integer,
  num_templates integer,
  raw jsonb,
  imported_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bp_currencies (
  bp_id text PRIMARY KEY,
  currency_name text,
  currency_code text,
  currency_symbol text,
  raw jsonb,
  imported_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bp_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  action text,
  triggered_by uuid REFERENCES profiles(id),
  proposals_pulled integer DEFAULT 0,
  proposals_inserted integer DEFAULT 0,
  proposals_updated integer DEFAULT 0,
  templates_pulled integer DEFAULT 0,
  companies_pulled integer DEFAULT 0,
  quotes_pulled integer DEFAULT 0,
  doctypes_pulled integer DEFAULT 0,
  currencies_pulled integer DEFAULT 0,
  preview_fetches integer DEFAULT 0,
  preview_failures integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'running' CHECK (status IN ('running','completed','failed'))
);
CREATE INDEX IF NOT EXISTS bp_import_runs_started_idx ON bp_import_runs(started_at DESC);

-- ----------------------------------------------------------------------------
-- 4. RLS on all bp_* tables: admin-only
-- ----------------------------------------------------------------------------
ALTER TABLE bp_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_doctypes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_currencies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_import_runs  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bp_templates','bp_companies','bp_quotes','bp_doctypes','bp_currencies','bp_import_runs']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "%s_admin_all" ON %I FOR ALL
      USING (
        (auth.jwt() ->> 'email') IN (
          'admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com'
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'email') IN (
          'admin@hub.nfstay.com', 'hugo@nfstay.com', 'hugodesouzax@gmail.com'
        )
      );
    $f$, t, t);
  END LOOP;
END$$;
