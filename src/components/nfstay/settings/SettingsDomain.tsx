// Domain settings — subdomain + custom domain management
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useNfsOperatorUpdate } from '@/hooks/nfstay/use-nfs-operator-update';
import { supabase } from '@/integrations/supabase/client';
import type { NfsOperator } from '@/lib/nfstay/types';
import { Globe, CheckCircle, AlertCircle, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  operator: NfsOperator;
  onGatedAction?: (action: () => void) => void;
}

export default function SettingsDomain({ operator, onGatedAction }: Props) {
  const { update, saving, error: saveError, success, clearStatus } = useNfsOperatorUpdate();

  // Subdomain
  const [subdomain, setSubdomain] = useState(operator.subdomain ?? '');
  const [subdomainCopied, setSubdomainCopied] = useState(false);

  // Custom domain
  const [customDomain, setCustomDomain] = useState(operator.custom_domain ?? '');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    setSubdomain(operator.subdomain ?? '');
    setCustomDomain(operator.custom_domain ?? '');
  }, [operator]);

  const subdomainUrl = subdomain ? `https://${subdomain}.nfstay.app` : null;

  const doSaveSubdomain = async () => {
    clearStatus();
    const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 63);
    setSubdomain(clean);
    await update({ subdomain: clean || null });
  };

  const handleSaveSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (onGatedAction) {
      onGatedAction(doSaveSubdomain);
    } else {
      doSaveSubdomain();
    }
  };

  const handleCopySubdomain = async () => {
    if (!subdomainUrl) return;
    try {
      await navigator.clipboard.writeText(subdomainUrl);
      setSubdomainCopied(true);
      setTimeout(() => setSubdomainCopied(false), 2000);
    } catch {
      // Fallback handled silently
    }
  };

  const handleVerifyDomain = async () => {
    if (!customDomain.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setVerifyError('Not authenticated');
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/nfs-domain-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'verify', domain: customDomain.trim() }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || 'Verification failed');
      } else if (data.dns_verified) {
        setVerifyResult('Domain verified successfully! SSL will be provisioned automatically.');
      } else {
        setVerifyResult(data.instructions || 'DNS not yet pointing to Vercel.');
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co'}/functions/v1/nfs-domain-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'remove' }),
        }
      );
      setCustomDomain('');
      setVerifyResult(null);
    } catch {
      setVerifyError('Failed to remove domain');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div data-feature="BOOKING_NFSTAY__SETTINGS" className="space-y-8 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Domain Settings
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your storefront URL for travelers.
        </p>
      </div>

      {saveError && <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{saveError}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">Saved successfully.</div>}

      {/* Subdomain */}
      <section className="space-y-3">
        <h4 className="font-medium text-sm">Subdomain</h4>
        <form onSubmit={handleSaveSubdomain} className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="your-brand"
              maxLength={63}
              disabled={saving}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">.nfstay.app</span>
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving...' : 'Save Subdomain'}
          </Button>
        </form>

        {subdomainUrl && (
          <div data-feature="BOOKING_NFSTAY__DOMAIN_SUBDOMAIN" className="flex items-center gap-2 text-sm">
            <a
              href={subdomainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              {subdomainUrl} <ExternalLink className="w-3 h-3" />
            </a>
            <button data-feature="BOOKING_NFSTAY__DOMAIN_COPY" onClick={handleCopySubdomain} className="text-muted-foreground hover:text-foreground">
              {subdomainCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </section>

      <hr className="border-border/40" />

      {/* Custom Domain */}
      <section className="space-y-3">
        <h4 className="font-medium text-sm">Custom Domain</h4>
        <p className="text-xs text-muted-foreground">
          Use your own domain (e.g. bookings.yourbrand.com) for your storefront.
        </p>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Domain</Label>
            <Input
              data-feature="BOOKING_NFSTAY__DOMAIN_CUSTOM"
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="bookings.yourbrand.com"
              disabled={verifying}
            />
          </div>

          <div className="flex gap-2">
            <Button data-feature="BOOKING_NFSTAY__DOMAIN_VERIFY" size="sm" onClick={() => onGatedAction ? onGatedAction(handleVerifyDomain) : handleVerifyDomain()} disabled={verifying || !customDomain.trim()}>
              {verifying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {verifying ? 'Verifying...' : 'Verify DNS'}
            </Button>
            {operator.custom_domain && (
              <Button size="sm" variant="outline" onClick={() => onGatedAction ? onGatedAction(handleRemoveDomain) : handleRemoveDomain()} disabled={verifying}>
                Remove Domain
              </Button>
            )}
          </div>

          {/* Status */}
          {operator.custom_domain_verified && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Verified — <strong>{operator.custom_domain}</strong> is active</span>
            </div>
          )}
          {operator.custom_domain && !operator.custom_domain_verified && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span>Pending — DNS not yet verified</span>
            </div>
          )}

          {verifyResult && (
            <div className="bg-muted/30 rounded-lg p-3 text-xs whitespace-pre-line">{verifyResult}</div>
          )}
          {verifyError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" /> {verifyError}
            </div>
          )}

          {/* DNS instructions */}
          <div className="bg-muted/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">DNS Setup Instructions:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Option A — CNAME record (recommended):</strong></p>
              <p className="font-mono bg-muted/40 px-2 py-1 rounded">CNAME → cname.vercel-dns.com</p>
              <p className="mt-2"><strong>Option B — A record:</strong></p>
              <p className="font-mono bg-muted/40 px-2 py-1 rounded">A → 76.76.21.21</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
