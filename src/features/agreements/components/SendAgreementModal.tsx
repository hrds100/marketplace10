import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, FileSignature } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import StageSelector from '@/features/smsv2/components/shared/StageSelector';
import FollowupPromptModal from '@/features/smsv2/components/followups/FollowupPromptModal';
import { useContactPersistence } from '@/features/smsv2/hooks/useContactPersistence';
import { useSmsV2 } from '@/features/smsv2/store/SmsV2Store';

interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface Props {
  contact: Contact | null;
  onClose: () => void;
}

export default function SendAgreementModal({ contact, onClose }: Props) {
  const { user } = useAuth();
  const { moveToColumn } = useContactPersistence();
  const { columns } = useSmsV2();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<Array<{ id: number; title: string }>>([]);
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'email'>('whatsapp');
  const [sending, setSending] = useState(false);
  const [stageId, setStageId] = useState<string>('');
  const [stageError, setStageError] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);

  const agentFirstName = (user?.user_metadata?.name ?? user?.email ?? '').split(' ')[0] || 'nfstay';

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from('inv_properties' as any) as any)
        .select('id, title')
        .order('title', { ascending: true });
      const props = (data ?? []) as Array<{ id: number; title: string }>;
      setProperties(props);
      if (props.length) setPropertyId(String(props[0].id));
    })();
  }, []);

  const generateToken = useCallback((name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
    const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    return `${slug}-${num}`;
  }, []);

  const handleSend = useCallback(async () => {
    if (!stageId) {
      setStageError(true);
      toast.error('Pick a pipeline outcome before sending');
      return;
    }
    setStageError(false);

    if (!contact) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!propertyId) {
      toast.error('Select a property');
      return;
    }
    setSending(true);

    try {
      const token = generateToken(contact.name);
      const agreementUrl = `hub.nfstay.com/agreement/${token}`;

      const { error: insertErr } = await (supabase.from('agreements' as any) as any)
        .insert({
          token,
          contact_id: contact.id,
          property_id: Number(propertyId),
          recipient_name: contact.name,
          amount: Number(amount),
          currency,
          title: 'Property Service Accommodation Partnership Agreement',
          status: 'sent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (insertErr) throw new Error(insertErr.message);

      // Move contact to selected pipeline stage
      await moveToColumn(contact.id, stageId);

      const propertyTitle = properties.find(p => String(p.id) === propertyId)?.title ?? 'the property';
      const firstName = (contact.name || '').split(' ')[0] || 'there';
      const signoff = `Best,\n${agentFirstName}\nnfstay`;

      if (channel === 'sms' && contact.phone) {
        const body = `Hi ${firstName},\n\nI've prepared your Partnership Agreement for the ${propertyTitle} opportunity.\n\nReview and sign here:\n${agreementUrl}\n\n${signoff}`;

        const { error: smsErr } = await supabase.functions.invoke('wk-sms-send', {
          body: { to: contact.phone, body, contact_id: contact.id },
        });
        if (smsErr) throw new Error(smsErr.message ?? 'SMS send failed');
      } else if (channel === 'whatsapp' && contact.phone) {
        const body = `Hi ${firstName},\n\nFollowing our conversation, I've prepared your Partnership Agreement for the ${propertyTitle} opportunity.\n\nPlease review the terms and sign here:\n${agreementUrl}\n\nOnce signed, you'll be taken straight to the secure payment page.\n\nLet me know if you have any questions.\n\n${signoff}`;

        const { error: waErr } = await supabase.functions.invoke('unipile-send', {
          body: { contact_id: contact.id, body },
        });
        if (waErr) throw new Error(waErr.message ?? 'WhatsApp send failed');
      } else if (channel === 'email' && contact.email) {
        const body = `Hi ${firstName},\n\nThank you for your interest in the ${propertyTitle} property.\n\nI've prepared a Partnership Agreement for your review. This document outlines the deal details, allocation terms, financial projections, and your rights as a partner.\n\nPlease review and sign the agreement here:\n${agreementUrl}\n\nAfter signing, you'll be redirected to complete your secure payment.\n\n${signoff}\nhub.nfstay.com`;

        const { data: emailResp, error: emailErr } = await supabase.functions.invoke('wk-email-send', {
          body: {
            contact_id: contact.id,
            to: contact.email,
            subject: `Your Partnership Agreement — ${propertyTitle}`,
            body,
          },
        });
        if (emailErr) throw new Error(emailErr.message ?? 'Email send failed');
        if (emailResp?.error) throw new Error(emailResp.error);
      } else {
        throw new Error(`No ${channel} address for this contact`);
      }

      toast.success(`Agreement sent to ${contact.name}`);
      // Open follow-up prompt — mandatory before closing
      setShowFollowup(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }, [contact, amount, currency, propertyId, channel, properties, generateToken, stageId, moveToColumn, agentFirstName]);

  const selectedColumn = columns.find(c => c.id === stageId);

  if (!contact) return null;

  // Follow-up modal (shown after send succeeds)
  if (showFollowup) {
    return (
      <FollowupPromptModal
        open={true}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        contactId={contact.id}
        contactName={contact.name}
        columnId={stageId}
        columnName={selectedColumn?.name ?? 'Agreement Sent'}
        suggestedHoursAhead={48}
        onSaved={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[#1E9A80]" />
            <h2 className="text-base font-bold text-[#1A1A1A]">Send Agreement</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F3F3EE]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-[#F3F3EE] rounded-xl p-3">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Recipient</p>
            <p className="text-sm font-medium text-[#1A1A1A]">{contact.name}</p>
            {contact.phone && <p className="text-xs text-[#6B7280]">{contact.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Property</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E5E5E5] rounded-lg text-sm"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1">Amount</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="5000"
                className="w-full px-3 py-2.5 border border-[#E5E5E5] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#525252] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E5E5E5] rounded-lg text-sm"
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Pipeline Outcome — MANDATORY */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${stageError ? 'text-[#EF4444]' : 'text-[#525252]'}`}>
              Pipeline Outcome <span className="text-[#EF4444]">*</span>
            </label>
            <div className={`p-2.5 border rounded-lg ${stageError ? 'border-[#EF4444] bg-[#FEF2F2]' : 'border-[#E5E5E5]'}`}>
              <StageSelector
                value={stageId || undefined}
                onChange={(id) => { setStageId(id); setStageError(false); }}
                size="md"
              />
              {stageError && (
                <p className="text-[11px] text-[#EF4444] mt-1">Required — where should this contact go in the pipeline?</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#525252] mb-1">Send via</label>
            <div className="flex gap-2">
              <button
                onClick={() => setChannel('sms')}
                disabled={!contact.phone}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  channel === 'sms'
                    ? 'bg-[#ECFDF5] text-[#1E9A80] border-[#1E9A80]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F3F3EE]'
                } disabled:opacity-40`}
              >
                SMS
              </button>
              <button
                onClick={() => setChannel('whatsapp')}
                disabled={!contact.phone}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  channel === 'whatsapp'
                    ? 'bg-[#ECFDF5] text-[#1E9A80] border-[#1E9A80]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F3F3EE]'
                } disabled:opacity-40`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setChannel('email')}
                disabled={!contact.email}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  channel === 'email'
                    ? 'bg-[#ECFDF5] text-[#1E9A80] border-[#1E9A80]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F3F3EE]'
                } disabled:opacity-40`}
              >
                Email
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#E5E7EB]">
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-[#1E9A80] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shadow-[0_4px_16px_rgba(30,154,128,0.35)]"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Sending...
              </span>
            ) : (
              `Send Agreement to ${contact.name}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
