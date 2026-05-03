import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Agreement {
  id: string;
  token: string;
  contact_id: string | null;
  user_id: string | null;
  property_id: number | null;
  title: string;
  recipient_name: string | null;
  amount: number;
  currency: string;
  terms_html: string | null;
  signer_name: string | null;
  signature_png: string | null;
  signed_at: string | null;
  status: 'draft' | 'sent' | 'opened' | 'signed' | 'paid';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementProperty {
  id: string;
  title: string;
  location: string;
  image: string;
  images: string[];
  price_per_share: number;
  total_shares: number;
  shares_sold: number;
  annual_yield: number;
  monthly_rent: number;
  property_value: number;
  rent_cost: number;
  type: string;
  bedrooms: number;
  description: string;
  highlights: string[];
  financials: {
    transaction?: Array<{ description: string; amount: string; calculation_basis: string }>;
    rental?: Array<{ description: string; value: string; calculation_basis: string }>;
  };
}

export function useAgreement(token: string | undefined) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [property, setProperty] = useState<AgreementProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: ag, error: agErr } = await (supabase.from('agreements' as any) as any)
        .select('id, token, contact_id, user_id, property_id, title, recipient_name, amount, currency, terms_html, signer_name, signature_png, signed_at, status, created_by, created_at, updated_at')
        .eq('token', token)
        .maybeSingle();
      if (agErr) { setError(agErr.message); setLoading(false); return; }
      if (!ag) { setError('Agreement not found'); setLoading(false); return; }
      setAgreement(ag as Agreement);

      if (ag.status === 'sent') {
        await (supabase.from('agreements' as any) as any)
          .update({ status: 'opened', updated_at: new Date().toISOString() })
          .eq('id', ag.id);
        setAgreement((prev) => prev ? { ...prev, status: 'opened' } : prev);
      }

      if (ag.property_id) {
        const { data: prop } = await (supabase.from('inv_properties' as any) as any)
          .select('id, title, location, image, images, price_per_share, total_shares, shares_sold, annual_yield, monthly_rent, property_value, rent_cost, type, bedrooms, description, highlights, financials')
          .eq('id', ag.property_id)
          .maybeSingle();
        if (prop) setProperty(prop as AgreementProperty);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const submitSignature = useCallback(async (signerName: string, signaturePng: string, userId: string) => {
    if (!agreement) throw new Error('No agreement loaded');
    const { error: err } = await (supabase.from('agreements' as any) as any)
      .update({
        signer_name: signerName,
        signature_png: signaturePng,
        signed_at: new Date().toISOString(),
        user_id: userId,
        status: 'signed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreement.id);
    if (err) throw new Error(err.message);
    setAgreement((prev) => prev ? {
      ...prev,
      signer_name: signerName,
      signature_png: signaturePng,
      signed_at: new Date().toISOString(),
      user_id: userId,
      status: 'signed',
    } : prev);
  }, [agreement]);

  return { agreement, property, loading, error, reload: load, submitSignature };
}

export function useAgreementsList() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('agreements' as any) as any)
      .select('id, token, contact_id, user_id, property_id, title, recipient_name, amount, currency, signer_name, signed_at, status, created_by, created_at, updated_at')
      .order('created_at', { ascending: false });
    setAgreements((data ?? []) as Agreement[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { agreements, loading, reload: load };
}
