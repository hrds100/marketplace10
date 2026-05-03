import { useState, useCallback, useEffect } from 'react';
import { Copy, ExternalLink, Pencil, Loader2, Check, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAgreementsList, type Agreement } from '../hooks/useAgreement';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  opened: 'bg-amber-50 text-amber-600 border-amber-200',
  signed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

const BASE_URL = 'https://hub.nfstay.com/agreement/';

export default function AdminAgreementsPage() {
  const { agreements, loading, reload } = useAgreementsList();
  const [editId, setEditId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${BASE_URL}${token}`);
    setCopied(token);
    toast.success('Link copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const counts = {
    total: agreements.length,
    draft: agreements.filter(a => a.status === 'draft').length,
    sent: agreements.filter(a => a.status === 'sent').length,
    signed: agreements.filter(a => a.status === 'signed').length,
    paid: agreements.filter(a => a.status === 'paid').length,
  };

  return (
    <div data-feature="ADMIN__INVEST">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Agreements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} total &middot; {counts.draft} draft &middot; {counts.sent} sent &middot; {counts.signed} signed &middot; {counts.paid} paid
          </p>
        </div>
        <p className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
          Send agreements from CRM &rarr; Contact &rarr; Agreement
        </p>
      </div>

      {editId && (
        <AgreementForm
          editId={editId}
          existing={agreements.find(a => a.id === editId)}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); reload(); }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.token}</TableCell>
                    <TableCell className="font-medium">
                      {a.signer_name || a.recipient_name || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {a.currency} {Number(a.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs capitalize', STATUS_COLORS[a.status])}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.signed_at ? new Date(a.signed_at).toLocaleDateString('en-GB') : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyLink(a.token)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Copy link"
                        >
                          {copied === a.token ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <a
                          href={`/agreement/${a.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Preview"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setEditId(a.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {a.status === 'draft' && (
                          <button
                            onClick={async () => {
                              await (supabase.from('agreements' as any) as any)
                                .update({ status: 'sent', updated_at: new Date().toISOString() })
                                .eq('id', a.id);
                              reload();
                              toast.success('Marked as sent');
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Mark as sent"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {agreements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No agreements yet. Click "New Agreement" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AgreementForm({
  editId,
  existing,
  onClose,
  onSaved,
}: {
  editId: string | null;
  existing?: Agreement;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [token, setToken] = useState(existing?.token ?? '');
  const [recipientName, setRecipientName] = useState(existing?.recipient_name ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD');
  const [title, setTitle] = useState(existing?.title ?? 'Token Sale Agreement');
  const [termsHtml, setTermsHtml] = useState(existing?.terms_html ?? '');
  const [status, setStatus] = useState(existing?.status ?? 'draft');
  const [propertyId, setPropertyId] = useState(existing?.property_id ? String(existing.property_id) : '');
  const [properties, setProperties] = useState<Array<{ id: number; title: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from('inv_properties' as any) as any)
        .select('id, title')
        .order('title', { ascending: true });
      setProperties((data ?? []) as Array<{ id: number; title: string }>);
      if (!propertyId && data?.length) setPropertyId(String(data[0].id));
    })();
  }, []);

  const handleSave = useCallback(async () => {
    if (!token.trim() || !amount) {
      toast.error('Token and amount are required');
      return;
    }
    if (!propertyId) {
      toast.error('Please select a property');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        token: token.trim(),
        recipient_name: recipientName.trim() || null,
        amount: Number(amount),
        currency,
        title: title.trim(),
        terms_html: termsHtml.trim() || null,
        status,
        property_id: propertyId ? Number(propertyId) : null,
        updated_at: new Date().toISOString(),
      };

      if (editId) {
        const { error } = await (supabase.from('agreements' as any) as any)
          .update(payload)
          .eq('id', editId);
        if (error) throw new Error(error.message);
        toast.success('Agreement updated');
      } else {
        const { error } = await (supabase.from('agreements' as any) as any)
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw new Error(error.message);
        toast.success('Agreement created');
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [token, recipientName, amount, currency, title, termsHtml, status, propertyId, editId, onSaved]);

  return (
    <Card className="mb-6 border-[#1E9A80]/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{editId ? 'Edit Agreement' : 'New Agreement'}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">URL Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. mark-05"
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link: hub.nfstay.com/agreement/{token || '...'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recipient Name</label>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Mark Johnson"
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            >
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Property</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            >
              <option value="">Select a property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Additional Terms (HTML)</label>
            <textarea
              value={termsHtml}
              onChange={(e) => setTermsHtml(e.target.value)}
              rows={4}
              placeholder="Optional custom terms — HTML supported"
              className="w-full px-3 py-2 border border-input rounded-lg text-sm font-mono"
            />
          </div>
          {editId && (
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Agreement['status'])}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="opened">Opened</option>
                <option value="signed">Signed</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1E9A80] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editId ? 'Save Changes' : 'Create Agreement'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
