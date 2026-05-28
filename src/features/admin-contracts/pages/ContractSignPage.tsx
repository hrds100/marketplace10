import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SignaturePad from '../components/SignaturePad';
import { plainTextToHtml } from '../AdminContracts';

interface ContractData {
  id: string;
  token: string;
  title: string;
  terms_html: string | null;
  sender_name: string | null;
  sender_signature_png: string | null;
  recipient_name: string | null;
  status: string;
  signer_name: string | null;
  signature_png: string | null;
  signed_at: string | null;
}

export default function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signaturePng, setSignaturePng] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('agreements')
          .select('id, token, title, terms_html, sender_name, sender_signature_png, recipient_name, status, signer_name, signature_png, signed_at')
          .eq('token', token)
          .eq('type', 'contractor')
          .single();
        if (err || !data) {
          setError('Contract not found');
          return;
        }
        const c = data as ContractData;
        setContract(c);

        if (c.status === 'signed') {
          setSigned(true);
          return;
        }

        if (c.status === 'sent') {
          await supabase
            .from('agreements')
            .update({ status: 'opened', updated_at: new Date().toISOString() })
            .eq('id', c.id);
        }
      } catch {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSign = useCallback(async () => {
    if (!contract || !signerName.trim() || !signaturePng) return;
    setSubmitting(true);
    try {
      const { error: err } = await supabase
        .from('agreements')
        .update({
          signer_name: signerName.trim(),
          signature_png: signaturePng,
          signed_at: new Date().toISOString(),
          status: 'signed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);
      if (err) throw err;
      setSigned(true);
    } catch {
      setError('Failed to submit signature. Please try again.');
    }
    setSubmitting(false);
  }, [contract, signerName, signaturePng]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#1A1A1A]">{error || 'Contract not found'}</p>
          <p className="text-sm text-[#6B7280] mt-2">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-[#1E9A80] mx-auto" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Agreement Signed</h1>
          <p className="text-[#6B7280]">
            Thank you{contract.signer_name ? `, ${contract.signer_name}` : ''}. Your signed agreement has been recorded.
          </p>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="rounded-[10px] mt-4"
          >
            <Download className="w-4 h-4 mr-2" /> Download / Print
          </Button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F3F3EE]">
      {/* Header */}
      <header className="bg-white/92 backdrop-blur-[12px] border-b border-[rgba(0,0,0,0.08)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg border-2 border-[#0A0A0A] text-[#0A0A0A] text-xs font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>nf</span>
            <span className="text-[#0A0A0A] text-sm tracking-[2px]" style={{ fontFamily: 'Sora, sans-serif' }}>stay</span>
          </div>
          <span className="text-[#6B7280] text-sm">|</span>
          <span className="text-sm text-[#6B7280]">Agreement</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 print:py-4">
        {/* Title */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 mb-6 print:border-0 print:shadow-none">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">{contract.title}</h1>
          <p className="text-sm text-[#6B7280]">Date: {today}</p>
          {contract.recipient_name && (
            <p className="text-sm text-[#6B7280]">Prepared for: <span className="font-medium text-[#1A1A1A]">{contract.recipient_name}</span></p>
          )}
        </div>

        {/* Agreement body */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 mb-6 print:border-0 print:shadow-none">
          {contract.terms_html ? (
            <div
              className="prose prose-sm max-w-none text-[#1A1A1A]"
              dangerouslySetInnerHTML={{ __html: plainTextToHtml(contract.terms_html) }}
            />
          ) : (
            <p className="text-[#6B7280] italic">No agreement content provided.</p>
          )}
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 print:border-0 print:shadow-none">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Signatures</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sender signature (pre-signed) */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#525252] uppercase tracking-wide">Company</p>
              <div className="border border-[#E5E7EB] rounded-lg p-4 bg-[#F3F3EE]/30 min-h-[120px] flex flex-col justify-between">
                {contract.sender_signature_png ? (
                  <img src={contract.sender_signature_png} alt="Sender signature" className="max-h-[80px] object-contain" />
                ) : (
                  <div className="h-[80px]" />
                )}
                <div className="border-t border-[#E5E7EB] pt-2 mt-2">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{contract.sender_name || 'nfstay'}</p>
                  <p className="text-xs text-[#6B7280]">Date: {today}</p>
                </div>
              </div>
            </div>

            {/* Recipient signature */}
            <div className="space-y-3 print:hidden">
              <p className="text-sm font-semibold text-[#525252] uppercase tracking-wide">Contractor</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[#525252]">Full legal name</label>
                  <Input
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1 rounded-[10px] border-[#E5E5E5]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#525252]">Signature</label>
                  <div className="mt-1">
                    <SignaturePad onSignature={setSignaturePng} width={400} height={160} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-8 print:hidden">
            <Button
              onClick={handleSign}
              disabled={!signerName.trim() || !signaturePng || submitting}
              className="w-full md:w-auto h-12 px-8 rounded-[14px] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white text-base font-semibold"
              style={{ boxShadow: 'rgba(30,154,128,0.35) 0 4px 16px' }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Confirm & Sign Agreement
            </Button>
            <p className="text-xs text-[#9CA3AF] mt-2">
              By signing, you confirm you have read and agree to the terms above.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
