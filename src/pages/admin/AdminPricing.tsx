import { CreditCard } from 'lucide-react';

export default function AdminPricing() {
  const tiers = [
    { name: 'Monthly', price: '£47/mo', url: 'https://checkout.nfstay.com/monthly' },
    { name: 'Yearly', price: '£597/yr', url: 'https://checkout.nfstay.com/yearly' },
    { name: 'Lifetime', price: '£997 one-time', url: 'https://checkout.nfstay.com/lifetime' },
  ];

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Pricing & Plans</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map(t => (
          <div key={t.name} className="bg-card border border-border rounded-2xl p-6">
            <CreditCard className="w-5 h-5 text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
            <div className="text-2xl font-extrabold text-foreground mt-2">{t.price}</div>
            <p className="text-xs text-muted-foreground mt-2">SamCart checkout link:</p>
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-medium break-all">{t.url}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
