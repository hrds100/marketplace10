import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Send, Copy, Eye, Trash2, Edit2, Loader2, Check, X, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from './components/SignaturePad';
import {
  useContractorAgreements,
  useContractTemplates,
  type ContractTemplate,
} from './hooks/useContractorAgreements';

function plainTextToHtml(text: string): string {
  if (!text) return '';
  if (text.trim().startsWith('<')) return text;
  return text
    .split(/\n\n+/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) {
        return `<h2 style="margin-top:24px;margin-bottom:8px;font-size:18px;font-weight:700">${trimmed.slice(2)}</h2>`;
      }
      const lines = trimmed.split('\n').map(line => {
        const l = line.trim();
        if (l.startsWith('- ') || l.startsWith('* ')) return `<li>${l.slice(2)}</li>`;
        return l;
      });
      const hasList = lines.some(l => l.startsWith('<li>'));
      if (hasList) {
        return `<ul style="margin:8px 0;padding-left:24px">${lines.filter(l => l.startsWith('<li>')).join('')}</ul>`;
      }
      return `<p style="margin:8px 0;line-height:1.6">${lines.join('<br/>')}</p>`;
    })
    .join('');
}

export { plainTextToHtml };

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-[#F3F3EE] text-[#6B7280]',
    sent: 'bg-blue-50 text-blue-700',
    opened: 'bg-amber-50 text-amber-700',
    signed: 'bg-[#ECFDF5] text-[#1E9A80]',
    paid: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function SendContractModal({
  templates,
  onSend,
  onClose,
}: {
  templates: ContractTemplate[];
  onSend: (data: { recipientName: string; recipientEmail: string; templateId: string; title: string; termsHtml: string; senderName: string; senderSignaturePng: string }) => Promise<string | null>;
  onClose: () => void;
}) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [sending, setSending] = useState(false);

  const selected = templates.find(t => t.id === templateId);
  const canSend = recipientName.trim() && recipientEmail.trim() && templateId && selected?.sender_signature_png;

  const handleSend = async () => {
    if (!canSend || !selected) return;
    setSending(true);
    const token = await onSend({
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim(),
      templateId,
      title: selected.title,
      termsHtml: selected.terms_html || '',
      senderName: selected.sender_name || 'Hugo Souza',
      senderSignaturePng: selected.sender_signature_png || '',
    });
    setSending(false);
    if (token) {
      navigator.clipboard.writeText(`https://hub.nfstay.com/contract/${token}`);
      toast.success('Link copied to clipboard');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Send Contract</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[#525252]">Template</label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full mt-1 h-10 rounded-[10px] border border-[#E5E5E5] px-3 text-sm bg-white"
            >
              {templates.length === 0 && <option value="">No templates — create one first</option>}
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selected && !selected.sender_signature_png && (
              <p className="text-xs text-red-500 mt-1">This template has no signature. Go to My Signature tab first.</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[#525252]">Recipient name</label>
            <Input
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              placeholder="John Smith"
              className="mt-1 rounded-[10px] border-[#E5E5E5]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#525252]">Recipient email</label>
            <Input
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="john@example.com"
              type="email"
              className="mt-1 rounded-[10px] border-[#E5E5E5]"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-[10px]">Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || sending}
            className="flex-1 rounded-[10px] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: Partial<ContractTemplate> | null;
  onSave: (t: Partial<ContractTemplate>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [title, setTitle] = useState(template?.title || 'Contractor Agreement');
  const [termsHtml, setTermsHtml] = useState(template?.terms_html || '');
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-4 border border-[#E5E7EB] rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1A1A1A]">{template?.id ? 'Edit Template' : 'New Template'}</h3>
        <button onClick={onCancel} className="text-[#6B7280] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
      </div>

      <div>
        <label className="text-sm font-medium text-[#525252]">Template name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Sourcing Agent Agreement"
          className="mt-1 rounded-[10px] border-[#E5E5E5]"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-[#525252]">Agreement title (shown at top)</label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Contractor Agreement"
          className="mt-1 rounded-[10px] border-[#E5E5E5]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-[#525252]">Agreement body</label>
          <button
            onClick={() => setPreview(!preview)}
            className="text-xs text-[#1E9A80] hover:underline"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
        <p className="text-xs text-[#9CA3AF] mb-2">Write in plain text. Use blank lines to separate paragraphs. Lines starting with # become headings.</p>
        {preview ? (
          <div
            className="min-h-[200px] border border-[#E5E7EB] rounded-[10px] p-4 prose prose-sm max-w-none bg-white"
            dangerouslySetInnerHTML={{ __html: plainTextToHtml(termsHtml) }}
          />
        ) : (
          <textarea
            value={termsHtml}
            onChange={e => setTermsHtml(e.target.value)}
            rows={20}
            className="w-full rounded-[10px] border border-[#E5E5E5] p-3 text-sm resize-y focus:ring-[#1E9A80] focus:border-[#1E9A80]"
            placeholder={"# 1. Scope of Work\n\nThe Contractor agrees to...\n\n# 2. Schedule\n\nMonday to Saturday, 10am to 7pm UK time"}
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="rounded-[10px]">Cancel</Button>
        <Button
          onClick={() => onSave({ ...template, name, title, terms_html: termsHtml })}
          disabled={!name.trim()}
          className="rounded-[10px] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          Save Template
        </Button>
      </div>
    </div>
  );
}

export default function AdminContracts() {
  const { agreements, loading: loadingAgreements, sendContract } = useContractorAgreements();
  const { templates, loading: loadingTemplates, saveTemplate, deleteTemplate } = useContractTemplates();
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ContractTemplate> | null | 'new'>(null);
  const [signatureData, setSignatureData] = useState('');
  const [signatureName, setSignatureName] = useState('Hugo Souza');
  const [savingSignature, setSavingSignature] = useState(false);

  const sentCount = agreements.filter(a => a.status === 'sent' || a.status === 'opened').length;
  const signedCount = agreements.filter(a => a.status === 'signed' || a.status === 'paid').length;

  const currentSignature = templates.find(t => t.sender_signature_png)?.sender_signature_png || null;

  const handleSaveSignature = useCallback(async () => {
    if (!signatureData) return;
    setSavingSignature(true);
    try {
      for (const t of templates) {
        await saveTemplate({ ...t, sender_signature_png: signatureData, sender_name: signatureName });
      }
      toast.success('Signature saved to all templates');
    } catch {
      toast.error('Failed to save signature');
    }
    setSavingSignature(false);
  }, [signatureData, signatureName, templates, saveTemplate]);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`https://hub.nfstay.com/contract/${token}`);
    toast.success('Link copied');
  };

  return (
    <div data-feature="ADMIN">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#1A1A1A]">Contracts</h1>
          <p className="text-sm text-[#6B7280] mt-1">Send agreements to contractors and track signatures</p>
        </div>
        <Button
          onClick={() => setShowSendModal(true)}
          disabled={templates.length === 0}
          className="h-11 px-5 rounded-[14px] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          <Send className="w-4 h-4 mr-2" /> Send Contract
        </Button>
      </div>

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList className="bg-[#F3F3EE] rounded-xl p-1">
          <TabsTrigger value="contracts" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">
            Contracts ({agreements.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="signature" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">
            My Signature
          </TabsTrigger>
        </TabsList>

        {/* ── Contracts tab ── */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex-1">
              <p className="text-xs text-[#6B7280] uppercase font-semibold">Total</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{agreements.length}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex-1">
              <p className="text-xs text-[#6B7280] uppercase font-semibold">Awaiting</p>
              <p className="text-2xl font-bold text-amber-600">{sentCount}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex-1">
              <p className="text-xs text-[#6B7280] uppercase font-semibold">Signed</p>
              <p className="text-2xl font-bold text-[#1E9A80]">{signedCount}</p>
            </div>
          </div>

          {loadingAgreements ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#6B7280]" /></div>
          ) : agreements.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <FileSignature className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No contracts sent yet</p>
              <p className="text-sm mt-1">Create a template first, then send your first contract</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F3F3EE]/50">
                    <th className="text-left px-4 py-3 font-semibold text-[#525252]">Recipient</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#525252]">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#525252]">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#525252]">Sent</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#525252]">Signed</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#525252]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map(a => (
                    <tr key={a.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F3F3EE]/30">
                      <td className="px-4 py-3 font-medium text-[#1A1A1A]">{a.recipient_name || '—'}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{a.recipient_email || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-[#6B7280]">{new Date(a.created_at).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{a.signed_at ? new Date(a.signed_at).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => copyLink(a.token)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a
                          href={`/contract/${a.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        {a.status === 'signed' && a.signature_png && (
                          <span className="inline-flex items-center justify-center w-8 h-8 text-[#1E9A80]" title="Signed">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Templates tab ── */}
        <TabsContent value="templates" className="space-y-4">
          {editingTemplate ? (
            <TemplateEditor
              template={editingTemplate === 'new' ? null : editingTemplate}
              onSave={async (t) => {
                await saveTemplate(t);
                setEditingTemplate(null);
              }}
              onCancel={() => setEditingTemplate(null)}
            />
          ) : (
            <>
              <Button
                onClick={() => setEditingTemplate('new')}
                className="rounded-[14px] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> New Template
              </Button>

              {loadingTemplates ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#6B7280]" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-[#6B7280]">
                  <p className="font-medium">No templates yet</p>
                  <p className="text-sm mt-1">Create your first agreement template to start sending contracts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(t => (
                    <div key={t.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{t.name}</p>
                        <p className="text-sm text-[#6B7280]">{t.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {t.sender_signature_png ? (
                            <span className="text-xs text-[#1E9A80] flex items-center gap-1"><Check className="w-3 h-3" /> Signature attached</span>
                          ) : (
                            <span className="text-xs text-amber-600">No signature — go to My Signature tab</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingTemplate(t)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Signature tab ── */}
        <TabsContent value="signature" className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 max-w-lg space-y-4">
            <h3 className="font-semibold text-[#1A1A1A]">Your Signature</h3>
            <p className="text-sm text-[#6B7280]">
              Draw your signature below. It will be pre-applied to every contract you send.
            </p>

            {currentSignature && !signatureData && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#525252]">Current signature:</p>
                <div className="border border-[#E5E7EB] rounded-lg p-3 bg-[#F3F3EE]/30">
                  <img src={currentSignature} alt="Current signature" className="max-h-[80px]" />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-[#525252]">Signer name</label>
              <Input
                value={signatureName}
                onChange={e => setSignatureName(e.target.value)}
                className="mt-1 rounded-[10px] border-[#E5E5E5] max-w-xs"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-[#525252] mb-2">{signatureData ? 'New signature:' : 'Draw new signature:'}</p>
              <SignaturePad onSignature={setSignatureData} width={400} height={160} />
            </div>

            <Button
              onClick={handleSaveSignature}
              disabled={!signatureData || savingSignature}
              className="rounded-[10px] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
            >
              {savingSignature ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Signature to All Templates
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {showSendModal && (
        <SendContractModal
          templates={templates}
          onSend={sendContract}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </div>
  );
}
