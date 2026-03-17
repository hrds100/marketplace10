export default function SettingsStripe() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Stripe Connect</h3>
        <p className="text-sm text-muted-foreground">Accept payments from guests via Stripe.</p>
      </div>
      <div className="rounded-xl border border-border/40 bg-white dark:bg-card p-6 text-center space-y-3">
        <div className="text-4xl">💳</div>
        <p className="font-medium text-sm">Coming soon</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Stripe Connect integration will be available in Phase 4. You'll be able to connect your Stripe account, view earnings, and manage payouts.
        </p>
      </div>
    </div>
  );
}
