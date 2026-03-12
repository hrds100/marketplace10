import { Info, Copy } from 'lucide-react';
import { payoutHistory } from '@/data/mockData';
import { toast } from 'sonner';

export default function AffiliatesPage() {
  const copyLink = () => {
    navigator.clipboard.writeText('nfstay.co.uk/?ref=JAMES123');
    toast.success('Copied ✓');
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground">Affiliates</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Share NFsTay and earn recurring commission.</p>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        {/* Left summary */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Total commission earned</span>
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-[32px] font-extrabold text-foreground mt-2">£0.00</div>
          <p className="text-[13px] text-muted-foreground mt-1">Paid monthly, straight to your account.</p>
          <button className="text-[13px] font-semibold text-primary mt-4 hover:opacity-75 transition-opacity">View payout history →</button>

          <div className="flex gap-6 mt-6">
            {['Clicks', 'Sign-ups', 'Conversions'].map(s => (
              <div key={s}>
                <div className="text-sm text-muted-foreground">{s}</div>
                <div className="text-lg font-bold text-foreground">0</div>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5 mt-4">
            {[20, 35, 15, 45, 30].map((h, i) => (
              <div key={i} className={`w-8 rounded-sm ${i === 3 ? 'bg-primary' : 'bg-border'}`} style={{ height: h }} />
            ))}
          </div>
        </div>

        {/* Right breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5">
          {[
            { label: 'Referrals', value: '£0.00' },
            { label: 'Conversions', value: '£0.00' },
            { label: 'Pending', value: '£0.00', pending: true },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
              <span className="text-[13px] text-muted-foreground">{r.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${r.pending ? 'text-amber-700' : 'text-foreground'}`}>{r.value}</span>
                {r.pending && <span className="badge-amber text-[10px]">Pending</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier card */}
      <div className="bg-primary rounded-2xl p-6 mt-6 text-primary-foreground">
        <div className="text-base font-bold">Starter Affiliate</div>
        <p className="text-sm mt-1 opacity-80">Refer 3 members to reach Pro Affiliate</p>
        <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <div className="h-full bg-white rounded-full" style={{ width: '33%' }} />
        </div>
        <p className="text-[13px] mt-2 opacity-80">1 of 3 referrals completed</p>
      </div>

      {/* Refer panel */}
      <div className="bg-card border border-border rounded-2xl p-5 mt-6">
        <h3 className="text-base font-bold text-foreground">Refer and earn</h3>
        <p className="text-sm text-muted-foreground mt-1">Share your link and earn commission on every subscription your referrals start.</p>
        <div className="mt-4 space-y-2">
          {['Friends get full platform access', 'You earn on every month they pay', 'Payouts handled automatically'].map(t => (
            <div key={t} className="flex items-center gap-2 text-sm text-foreground">
              <span className="text-primary">✓</span> {t}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <input readOnly value="nfstay.co.uk/?ref=JAMES123" className="input-nfstay flex-1 bg-secondary text-sm" />
          <button onClick={copyLink} className="h-10 px-4 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Copy className="w-4 h-4" /> Copy link
          </button>
        </div>
      </div>

      {/* Payout table */}
      <div className="mt-6">
        <h3 className="text-base font-bold text-foreground mb-4">Payout history</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payoutHistory.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                  <td className="p-3.5 text-foreground">{row.date}</td>
                  <td className="p-3.5 text-foreground">{row.amount}</td>
                  <td className="p-3.5"><span className={row.status === 'Paid' ? 'badge-green' : 'badge-amber'}>{row.status}</span></td>
                  <td className="p-3.5 text-muted-foreground">{row.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
