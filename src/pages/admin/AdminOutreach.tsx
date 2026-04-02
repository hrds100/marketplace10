import { useState } from 'react';
import { Rocket, ChevronDown, ChevronUp, Check, Send, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

interface InquiryRow {
  id: string;
  property_id: string;
  authorized: boolean;
  tenant_name: string | null;
  created_at: string;
  lister_id: string | null;
  lister_name: string | null;
  lister_phone: string | null;
}

interface PropertyRow {
  id: string;
  name: string;
  city: string;
  landlord_whatsapp: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  outreach_sent: boolean;
  outreach_sent_at: string | null;
}

interface LandlordGroup {
  landlordName: string;
  landlordWhatsapp: string;
  profileId: string | null;
  properties: Array<{
    property: PropertyRow;
    inquiries: InquiryRow[];
  }>;
}

export default function AdminOutreach() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedLandlord, setExpandedLandlord] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const addLoading = (key: string) => setLoadingActions(prev => new Set(prev).add(key));
  const removeLoading = (key: string) => setLoadingActions(prev => { const n = new Set(prev); n.delete(key); return n; });

  // Fetch all inquiries joined with properties
  const { data: landlordGroups = [], isLoading, isError } = useQuery({
    queryKey: ['admin-outreach'],
    queryFn: async () => {
      // Fetch inquiries
      const { data: inquiries, error: iqErr } = await (supabase.from('inquiries') as any)
        .select('id, property_id, authorized, tenant_name, created_at, lister_id, lister_name, lister_phone')
        .order('created_at', { ascending: false });
      if (iqErr) throw iqErr;

      if (!inquiries || inquiries.length === 0) return [];

      // Fetch properties for those inquiries
      const propIds = [...new Set((inquiries as InquiryRow[]).map(i => i.property_id))];
      const { data: properties, error: propErr } = await (supabase.from('properties') as any)
        .select('id, name, city, landlord_whatsapp, contact_phone, contact_name, outreach_sent, outreach_sent_at')
        .in('id', propIds);
      if (propErr) throw propErr;

      const propMap = new Map<string, PropertyRow>();
      (properties as PropertyRow[]).forEach(p => propMap.set(p.id, p));

      // Group by landlord WhatsApp
      const groupMap = new Map<string, LandlordGroup>();
      for (const inq of inquiries as InquiryRow[]) {
        const prop = propMap.get(inq.property_id);
        if (!prop) continue;
        const whatsapp = prop.landlord_whatsapp || prop.contact_phone || 'unknown';
        const landlordName = prop.contact_name || inq.lister_name || 'Unknown Landlord';

        if (!groupMap.has(whatsapp)) {
          groupMap.set(whatsapp, {
            landlordName,
            landlordWhatsapp: whatsapp,
            profileId: inq.lister_id,
            properties: [],
          });
        }

        const group = groupMap.get(whatsapp)!;
        let propEntry = group.properties.find(pe => pe.property.id === prop.id);
        if (!propEntry) {
          propEntry = { property: prop, inquiries: [] };
          group.properties.push(propEntry);
        }
        propEntry.inquiries.push(inq);
      }

      return Array.from(groupMap.values()).sort((a, b) => {
        // Sort: pending first, then ready, then sent
        const scoreA = getGroupStatus(a) === 'Pending' ? 0 : getGroupStatus(a) === 'Ready' ? 1 : 2;
        const scoreB = getGroupStatus(b) === 'Pending' ? 0 : getGroupStatus(b) === 'Ready' ? 1 : 2;
        return scoreA - scoreB;
      });
    },
  });

  function getGroupStatus(group: LandlordGroup): 'Pending' | 'Ready' | 'Sent' {
    const allInquiries = group.properties.flatMap(pe => pe.inquiries);
    const hasUnauthorized = allInquiries.some(i => !i.authorized);
    const hasSent = group.properties.some(pe => pe.property.outreach_sent);
    if (hasUnauthorized) return 'Pending';
    if (hasSent) return 'Sent';
    return 'Ready';
  }

  // Authorize single inquiry
  const authorizeInquiry = async (inquiryId: string, propertyRefCode: string) => {
    const key = `auth-${inquiryId}`;
    addLoading(key);
    try {
      const { error } = await (supabase.from('inquiries') as any)
        .update({ authorized: true })
        .eq('id', inquiryId);
      if (error) throw error;
      if (user) logAdminAction(user.id, { action: 'inquiry_authorized', target_table: 'inquiries', target_id: inquiryId, metadata: { ref_code: propertyRefCode } });
      toast.success('Inquiry authorized');
      queryClient.invalidateQueries({ queryKey: ['admin-outreach'] });
    } catch {
      toast.error('Failed to authorize inquiry');
    } finally {
      removeLoading(key);
    }
  };

  // Bulk authorize all inquiries for a landlord
  const bulkAuthorize = async (group: LandlordGroup) => {
    const key = `bulk-${group.landlordWhatsapp}`;
    addLoading(key);
    try {
      const unauthorizedIds = group.properties
        .flatMap(pe => pe.inquiries)
        .filter(i => !i.authorized)
        .map(i => i.id);

      if (unauthorizedIds.length === 0) { toast('All already authorized'); removeLoading(key); return; }

      const { error } = await (supabase.from('inquiries') as any)
        .update({ authorized: true })
        .in('id', unauthorizedIds);
      if (error) throw error;

      // Audit log each
      if (user) {
        for (const id of unauthorizedIds) {
          logAdminAction(user.id, { action: 'inquiry_authorized', target_table: 'inquiries', target_id: id, metadata: { bulk: true, landlord: group.landlordName } });
        }
      }
      toast.success(`${unauthorizedIds.length} inquiries authorized`);
      queryClient.invalidateQueries({ queryKey: ['admin-outreach'] });
    } catch {
      toast.error('Bulk authorize failed');
    } finally {
      removeLoading(key);
    }
  };

  // Send first outreach via n8n
  const sendOutreach = async (group: LandlordGroup) => {
    const key = `outreach-${group.landlordWhatsapp}`;
    addLoading(key);
    try {
      // Find properties that are authorized but not yet sent
      const eligibleProps = group.properties.filter(pe => {
        const allAuthorized = pe.inquiries.every(i => i.authorized);
        return allAuthorized && !pe.property.outreach_sent;
      });

      if (eligibleProps.length === 0) {
        toast.error('No eligible properties for outreach');
        removeLoading(key);
        return;
      }

      const firstProp = eligibleProps[0].property;
      const totalInquiries = eligibleProps.reduce((sum, pe) => sum + pe.inquiries.length, 0);

      const n8nBase = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud/webhook';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${n8nBase}/landlord-first-outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlord_whatsapp: group.landlordWhatsapp,
          landlord_name: group.landlordName,
          property_ref_code: firstProp.id.slice(0, 5).toUpperCase(),
          property_title: firstProp.name,
          property_city: firstProp.city,
          inquiry_count: totalInquiries,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error('n8n returned error');

      // Mark all eligible properties as outreach sent
      for (const pe of eligibleProps) {
        const { error } = await (supabase.from('properties') as any)
          .update({ outreach_sent: true, outreach_sent_at: new Date().toISOString() })
          .eq('id', pe.property.id);
        if (error) console.error('Failed to mark outreach_sent:', error);

        if (user) {
          logAdminAction(user.id, {
            action: 'outreach_sent',
            target_table: 'properties',
            target_id: pe.property.id,
            metadata: { landlord_whatsapp: group.landlordWhatsapp },
          });
        }
      }

      toast.success('Outreach sent to ' + group.landlordName);
      queryClient.invalidateQueries({ queryKey: ['admin-outreach'] });
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      toast.error(isAbort ? 'Outreach failed - n8n did not respond in time' : 'Outreach failed - n8n did not respond');
    } finally {
      removeLoading(key);
    }
  };

  const statusBadge = (status: 'Pending' | 'Ready' | 'Sent') => {
    if (status === 'Pending') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>;
    if (status === 'Ready') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Ready</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Sent</span>;
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div data-feature="ADMIN">
        <div className="flex items-center gap-3 mb-6">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-[28px] font-bold text-foreground">The Gates</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-secondary rounded w-48 mb-3" />
              <div className="h-4 bg-secondary rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    toast.error('Failed to load outreach data');
  }

  // Empty state
  if (landlordGroups.length === 0 && !isLoading) {
    return (
      <div data-feature="ADMIN">
        <div className="flex items-center gap-3 mb-6">
          <Rocket className="w-6 h-6 text-primary" />
          <h1 className="text-[28px] font-bold text-foreground">The Gates</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No landlords with pending inquiries</p>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center gap-3 mb-6">
        <Rocket className="w-6 h-6 text-primary" />
        <h1 className="text-[28px] font-bold text-foreground">The Gates</h1>
        <span className="text-xs text-muted-foreground ml-2">{landlordGroups.length} landlords</span>
      </div>

      <div className="space-y-4">
        {landlordGroups.map(group => {
          const status = getGroupStatus(group);
          const isExpanded = expandedLandlord === group.landlordWhatsapp;
          const allInquiries = group.properties.flatMap(pe => pe.inquiries);
          const unauthorizedCount = allInquiries.filter(i => !i.authorized).length;
          const authorizedCount = allInquiries.filter(i => i.authorized).length;
          const awaitingOutreach = group.properties.filter(pe => !pe.property.outreach_sent && pe.inquiries.every(i => i.authorized)).length;

          return (
            <div key={group.landlordWhatsapp} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => setExpandedLandlord(isExpanded ? null : group.landlordWhatsapp)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{group.landlordName}</span>
                    {statusBadge(status)}
                    {awaitingOutreach > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {awaitingOutreach} awaiting activation
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.landlordWhatsapp} - {group.properties.length} {group.properties.length === 1 ? 'property' : 'properties'} - {authorizedCount}/{allInquiries.length} authorized
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {unauthorizedCount > 0 && (
                    <button
                      onClick={() => bulkAuthorize(group)}
                      disabled={loadingActions.has(`bulk-${group.landlordWhatsapp}`)}
                      className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {loadingActions.has(`bulk-${group.landlordWhatsapp}`) ? 'Authorizing...' : `Authorize All (${unauthorizedCount})`}
                    </button>
                  )}
                  {status === 'Ready' && (
                    <button
                      onClick={() => sendOutreach(group)}
                      disabled={loadingActions.has(`outreach-${group.landlordWhatsapp}`)}
                      className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      {loadingActions.has(`outreach-${group.landlordWhatsapp}`) ? 'Sending...' : 'Send First Activation'}
                    </button>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border">
                  {group.properties.map(pe => (
                    <div key={pe.property.id} className="border-b border-border last:border-b-0">
                      {/* Property header */}
                      <div className="px-4 py-3 bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">#{pe.property.id.slice(0, 5).toUpperCase()}</span>
                          <span className="text-sm font-medium text-foreground">{pe.property.name}</span>
                          <span className="text-xs text-muted-foreground">{pe.property.city}</span>
                          {pe.property.outreach_sent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-auto">
                              Outreach sent {pe.property.outreach_sent_at ? new Date(pe.property.outreach_sent_at).toLocaleDateString() : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Inquiry rows */}
                      {pe.inquiries.map(inq => (
                        <div key={inq.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-secondary/20 transition-colors">
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground font-medium">{inq.tenant_name || 'Unknown tenant'}</span>
                            <span className="text-muted-foreground ml-2">{new Date(inq.created_at).toLocaleDateString()}</span>
                          </div>
                          {inq.authorized ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <Check className="w-3 h-3" /> Authorized
                            </span>
                          ) : (
                            <button
                              onClick={() => authorizeInquiry(inq.id, pe.property.id.slice(0, 5).toUpperCase())}
                              disabled={loadingActions.has(`auth-${inq.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {loadingActions.has(`auth-${inq.id}`) ? '...' : 'Authorize'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
