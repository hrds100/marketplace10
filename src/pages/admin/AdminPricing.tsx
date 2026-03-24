import { CreditCard } from 'lucide-react';

export default function AdminPricing() {
  const tiers = [
    { name: 'Monthly', price: '£67/mo', productId: '69b5b769081db66d1afbf145', priceId: '69b5d533d314dc23b8a6f918' },
    { name: 'Annual', price: '£397/yr', productId: '69b5b7791fe1a8f21eb651b5', priceId: '69b5d5371fe1a88dbdba1590' },
    { name: 'Lifetime', price: '£997 one-time', productId: '69b5b777711f98f382f110ff', priceId: '69b5d535a0334430aa1f2eac' },
  ];

  return (
    <div data-feature="ADMIN">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Pricing & Plans</h1>
      <p className="text-sm text-muted-foreground mb-6">Payments are handled via GoHighLevel funnel. Products are configured in GHL dashboard.</p>
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map(t => (
          <div key={t.name} className="bg-card border border-border rounded-2xl p-6">
            <CreditCard className="w-5 h-5 text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
            <div className="text-2xl font-extrabold text-foreground mt-2">{t.price}</div>
            <p className="text-xs text-muted-foreground mt-3">GHL Product: <span className="font-mono text-[11px]">{t.productId}</span></p>
            <p className="text-xs text-muted-foreground mt-1">GHL Price: <span className="font-mono text-[11px]">{t.priceId}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
