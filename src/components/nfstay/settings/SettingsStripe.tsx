import { useNfsStripeAccount, useNfsStripeConnect } from '@/hooks/nfstay/use-nfs-stripe';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Unlink } from 'lucide-react';

export default function SettingsStripe() {
  const { stripeAccount, loading, error: fetchError, refetch } = useNfsStripeAccount();
  const { connecting, disconnecting, error: connectError, initiateConnect, disconnect } = useNfsStripeConnect();

  const error = fetchError || connectError;
  const isConnected = stripeAccount?.connection_status === 'connected';
  const chargesEnabled = stripeAccount?.charges_enabled;
  const payoutsEnabled = stripeAccount?.payouts_enabled;

  const handleDisconnect = async () => {
    const ok = await disconnect();
    if (ok) refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY__SETTINGS" className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Stripe Connect</h3>
        <p className="text-sm text-muted-foreground">Accept payments from guests via Stripe.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isConnected ? (
        /* ── Not connected ── */
        <div className="rounded-xl border border-border/40 bg-white dark:bg-card p-6 text-center space-y-4">
          <div className="text-4xl">💳</div>
          <div>
            <p className="font-medium text-sm">Connect your Stripe account</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Connect your Stripe account to accept payments from guests. Payouts are sent directly to your bank account.
            </p>
          </div>
          <Button onClick={initiateConnect} disabled={connecting} className="w-full max-w-xs">
            {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {connecting ? 'Connecting...' : 'Connect with Stripe'}
          </Button>
        </div>
      ) : (
        /* ── Connected ── */
        <div className="rounded-xl border border-border/40 bg-white dark:bg-card p-6 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Stripe Connected</p>
              <p className="text-xs text-muted-foreground font-mono">
                {stripeAccount?.connect_account_id}
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              {chargesEnabled
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertCircle className="w-4 h-4 text-yellow-600" />}
              <span>Charges {chargesEnabled ? 'enabled' : 'pending'}</span>
            </div>
            <div className="flex items-center gap-2">
              {payoutsEnabled
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertCircle className="w-4 h-4 text-yellow-600" />}
              <span>Payouts {payoutsEnabled ? 'enabled' : 'pending'}</span>
            </div>
          </div>

          {!stripeAccount?.onboarding_completed && (
            <div className="text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 px-4 py-3 rounded-lg">
              Your Stripe account setup is incomplete. Please complete your account details on Stripe to enable charges and payouts.
            </div>
          )}

          {/* Earnings summary */}
          {stripeAccount?.total_earned != null && Number(stripeAccount.total_earned) > 0 && (
            <div className="border-t border-border/40 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total earned</span>
                <span className="font-medium">GBP {Number(stripeAccount.total_earned).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total transferred</span>
                <span className="font-medium">GBP {Number(stripeAccount.total_transferred).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" /> Stripe Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
