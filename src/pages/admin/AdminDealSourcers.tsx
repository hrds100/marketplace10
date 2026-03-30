import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Link2, FileCheck, UserCheck, Clock, ChevronDown } from 'lucide-react';

interface DealSourcer {
  phone: string;
  name: string | null;
  email: string | null;
  role: string | null;
  claimed: boolean;
  profileId: string | null;
  createdAt: string | null;
  magicLinkClicks: number;
  lastMagicLinkClick: string | null;
  totalLeads: number;
  ndaSigned: number;
  ndaPending: number;
  properties: number;
}

export default function AdminDealSourcers() {
  useEffect(() => { document.title = 'Admin - Deal Sourcer Metrics'; }, []);
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);

  const { data: sourcers = [], isLoading } = useQuery({
    queryKey: ['admin-deal-sourcers'],
    queryFn: async () => {
      // 1. Get all properties with lister_type = deal_sourcer
      const { data: properties } = await (supabase.from('properties') as any)
        .select('id, landlord_whatsapp, contact_phone, contact_name, contact_email, lister_type, created_at')
        .eq('lister_type', 'deal_sourcer');

      // 2. Get all inquiries for deal sourcer properties
      const propIds = (properties || []).map((p: any) => p.id);
      let inquiries: any[] = [];
      if (propIds.length > 0) {
        const { data } = await (supabase.from('inquiries') as any)
          .select('id, property_id, lister_phone, nda_signed, nda_signed_at, created_at')
          .in('property_id', propIds);
        inquiries = data || [];
      }

      // 3. Get magic link clicks from landlord_invites
      const phones = [...new Set((properties || []).map((p: any) => p.landlord_whatsapp || p.contact_phone).filter(Boolean))];
      let invites: any[] = [];
      if (phones.length > 0) {
        const { data } = await (supabase.from('landlord_invites') as any)
          .select('id, phone, used, used_at, created_at')
          .in('phone', phones);
        invites = data || [];
      }

      // 4. Get profiles for claimed status
      let profiles: any[] = [];
      if (phones.length > 0) {
        const { data } = await (supabase.from('profiles') as any)
          .select('id, name, whatsapp, role, created_at')
          .in('whatsapp', phones);
        profiles = data || [];
      }

      // 5. Aggregate by phone
      const phoneMap = new Map<string, DealSourcer>();

      for (const prop of (properties || [])) {
        const phone = prop.landlord_whatsapp || prop.contact_phone || '';
        if (!phone) continue;

        if (!phoneMap.has(phone)) {
          const profile = profiles.find((p: any) => p.whatsapp === phone);
          const isClaimed = profile && !profile.id?.toString().includes('nfstay.internal');
          const profileEmail = profile ? (await supabase.auth.admin?.getUserById?.(profile.id))?.data?.user?.email : null;

          phoneMap.set(phone, {
            phone,
            name: prop.contact_name || profile?.name || null,
            email: prop.contact_email || null,
            role: profile?.role || null,
            claimed: isClaimed || false,
            profileId: profile?.id || null,
            createdAt: prop.created_at || null,
            magicLinkClicks: 0,
            lastMagicLinkClick: null,
            totalLeads: 0,
            ndaSigned: 0,
            ndaPending: 0,
            properties: 0,
          });
        }

        const s = phoneMap.get(phone)!;
        s.properties++;
      }

      // Count magic link clicks
      for (const inv of invites) {
        const s = phoneMap.get(inv.phone);
        if (!s) continue;
        if (inv.used) s.magicLinkClicks++;
        if (inv.used_at && (!s.lastMagicLinkClick || inv.used_at > s.lastMagicLinkClick)) {
          s.lastMagicLinkClick = inv.used_at;
        }
      }

      // Count leads & NDA
      for (const inq of inquiries) {
        const prop = (properties || []).find((p: any) => p.id === inq.property_id);
        if (!prop) continue;
        const phone = prop.landlord_whatsapp || prop.contact_phone || '';
        const s = phoneMap.get(phone);
        if (!s) continue;
        s.totalLeads++;
        if (inq.nda_signed) s.ndaSigned++;
        else s.ndaPending++;
      }

      // Check claimed status by checking if email ends with nfstay.internal
      for (const profile of profiles) {
        const s = phoneMap.get(profile.whatsapp);
        if (!s) continue;
        // If profile has a real name (not just phone), consider claimed
        if (profile.name && profile.name !== profile.whatsapp && !profile.name.includes('+')) {
          s.claimed = true;
          s.name = profile.name;
        }
      }

      return Array.from(phoneMap.values()).sort((a, b) => b.totalLeads - a.totalLeads);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#1A1A1A' }}>Deal Sourcer Metrics</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100" />)}
        </div>
      </div>
    );
  }

  const totalSourcers = sourcers.length;
  const totalClaimed = sourcers.filter(s => s.claimed).length;
  const totalLeads = sourcers.reduce((acc, s) => acc + s.totalLeads, 0);
  const totalNdaSigned = sourcers.reduce((acc, s) => acc + s.ndaSigned, 0);
  const totalClicks = sourcers.reduce((acc, s) => acc + s.magicLinkClicks, 0);

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Deal Sourcer Metrics</h1>
      <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Track deal sourcer engagement, lead access agreements, and account claims.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Deal Sourcers', value: totalSourcers, icon: Phone },
          { label: 'Magic Link Clicks', value: totalClicks, icon: Link2 },
          { label: 'Total Leads', value: totalLeads, icon: FileCheck },
          { label: 'Agreements Signed', value: totalNdaSigned, icon: FileCheck },
          { label: 'Accounts Claimed', value: `${totalClaimed}/${totalSourcers}`, icon: UserCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border p-3" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
              <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#6B7280' }}>{label}</span>
            </div>
            <span className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#F3F4F6', backgroundColor: '#FAFAFA' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Deal Sourcer</th>
              <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Properties</th>
              <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Link Clicks</th>
              <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Leads</th>
              <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Agreed</th>
              <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Pending</th>
              <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Claimed</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: '#6B7280' }}>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sourcers.map(s => (
              <tr
                key={s.phone}
                className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#F3F4F6' }}
                onClick={() => setExpandedPhone(expandedPhone === s.phone ? null : s.phone)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedPhone === s.phone ? 'rotate-180' : ''}`} style={{ color: '#9CA3AF' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{s.name || s.phone}</p>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{s.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center px-3 py-3 font-medium" style={{ color: '#1A1A1A' }}>{s.properties}</td>
                <td className="text-center px-3 py-3 font-medium" style={{ color: '#1A1A1A' }}>{s.magicLinkClicks}</td>
                <td className="text-center px-3 py-3 font-medium" style={{ color: '#1A1A1A' }}>{s.totalLeads}</td>
                <td className="text-center px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: s.ndaSigned > 0 ? '#ECFDF5' : '#F3F4F6', color: s.ndaSigned > 0 ? '#1E9A80' : '#9CA3AF' }}>
                    {s.ndaSigned}
                  </span>
                </td>
                <td className="text-center px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: s.ndaPending > 0 ? '#FEF3C7' : '#F3F4F6', color: s.ndaPending > 0 ? '#D97706' : '#9CA3AF' }}>
                    {s.ndaPending}
                  </span>
                </td>
                <td className="text-center px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: s.claimed ? '#ECFDF5' : '#FEE2E2', color: s.claimed ? '#1E9A80' : '#DC2626' }}>
                    {s.claimed ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="text-right px-4 py-3">
                  {s.lastMagicLinkClick ? (
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                        {new Date(s.lastMagicLinkClick).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px]" style={{ color: '#D1D5DB' }}>Never</span>
                  )}
                </td>
              </tr>
            ))}
            {sourcers.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>
                  No deal sourcers found. Properties with lister_type = "deal_sourcer" will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
