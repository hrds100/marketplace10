import { useEffect, useState } from 'react';
import { MessageCircle, Mail, Clock, Eye, User, MapPin, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Inquiry {
  id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_id: string | null;
  channel: string;
  message: string | null;
  status: string;
  token: string;
  created_at: string;
  property_name?: string;
  property_city?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LeadsTab() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchLeads() {
      try {
        // Get user's phone and email from profiles table
        const { data: profileData } = await supabase.from('profiles').select('whatsapp, email').eq('id', user!.id).single();
        const phone = profileData?.whatsapp || '';
        const email = profileData?.email || user!.email || '';

        let query = (supabase.from('inquiries') as any).select('*').order('created_at', { ascending: false });

        // Build OR filter for lister matching
        const filters: string[] = [];
        if (phone) filters.push(`lister_phone.eq.${phone}`);
        if (email) filters.push(`lister_email.eq.${email}`);

        if (filters.length === 0) {
          setLeads([]);
          setLoading(false);
          return;
        }

        const { data, error } = await query.or(filters.join(','));
        if (error) { console.error(error); setLoading(false); return; }

        // Fetch property names for each inquiry
        const propertyIds = [...new Set((data || []).map((d: any) => d.property_id).filter(Boolean))];
        let propertyMap: Record<string, { name: string; city: string }> = {};
        if (propertyIds.length > 0) {
          const { data: props } = await (supabase.from('properties') as any)
            .select('id, name, city')
            .in('id', propertyIds);
          if (props) {
            for (const p of props) {
              propertyMap[p.id] = { name: p.name, city: p.city };
            }
          }
        }

        const enriched: Inquiry[] = (data || []).map((d: any) => ({
          ...d,
          property_name: d.property_id ? propertyMap[d.property_id]?.name : undefined,
          property_city: d.property_id ? propertyMap[d.property_id]?.city : undefined,
        }));

        setLeads(enriched);
      } catch {
        console.error('Failed to fetch leads');
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16">
        <User className="h-10 w-10 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
        <h3 className="text-base font-semibold mb-1" style={{ color: '#1A1A1A' }}>No leads yet</h3>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Leads will appear here when tenants inquire about your properties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
      {leads.map(lead => (
        <a
          key={lead.id}
          href={`/lead/${lead.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-[#1E9A80]/30 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                  {lead.tenant_name || 'Unknown'}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: lead.channel === 'whatsapp' ? '#ECFDF5' : '#F3F4F6',
                    color: lead.channel === 'whatsapp' ? '#1E9A80' : '#374151',
                  }}
                >
                  {lead.channel === 'whatsapp' ? <MessageCircle className="w-2.5 h-2.5" /> : <Mail className="w-2.5 h-2.5" />}
                  {lead.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </span>
              </div>
              {lead.property_name && (
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                  <span className="text-xs text-muted-foreground truncate">
                    {lead.property_name}{lead.property_city ? ` - ${lead.property_city}` : ''}
                  </span>
                </div>
              )}
              {lead.message && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.message}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: lead.status === 'new' ? '#1E9A80' : lead.status === 'viewed' ? '#F59E0B' : '#9CA3AF',
                  }}
                />
                <span className="text-[10px] capitalize text-muted-foreground">{lead.status}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
              </div>
              <ExternalLink className="w-3 h-3" style={{ color: '#9CA3AF' }} />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
