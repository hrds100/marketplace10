import { UserCheck, Link as LinkIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAffiliates() {
  const affiliates = [
    { name: 'Sarah K.', email: 'sarah@example.com', referrals: 12, earnings: '£576', status: 'Active' },
    { name: 'Tom P.', email: 'tom@example.com', referrals: 5, earnings: '£240', status: 'Active' },
    { name: 'Priya S.', email: 'priya@example.com', referrals: 0, earnings: '£0', status: 'Pending' },
  ];

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Affiliates</h1>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Email', 'Referrals', 'Earnings', 'Status'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a, i) => (
              <tr key={a.email} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 font-medium text-foreground">{a.name}</td>
                <td className="p-3.5 text-muted-foreground">{a.email}</td>
                <td className="p-3.5 text-foreground">{a.referrals}</td>
                <td className="p-3.5 font-semibold text-foreground">{a.earnings}</td>
                <td className="p-3.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.status === 'Active' ? 'bg-accent-light text-primary' : 'bg-secondary text-muted-foreground'}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
