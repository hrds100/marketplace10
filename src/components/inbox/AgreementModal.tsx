import { useState } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Thread } from './types';

interface Props {
  thread: Thread;
  isOperator: boolean;
  onClose: () => void;
  onSign: () => void;
}

const NDA_TEXT = `
1. DEFINITIONS AND INTERPRETATION

This Non-Disclosure Agreement ("Agreement") is entered into between the property owner/agent ("Landlord") and the serviced accommodation operator ("Operator") introduced via the NFsTay platform ("Platform").

"Confidential Information" means all information disclosed by either party relating to property addresses, rental terms, financial projections, occupancy data, guest information, pricing strategies, and any other commercially sensitive information shared during or after the introduction.

2. OBLIGATIONS OF CONFIDENTIALITY

Both parties agree to keep all Confidential Information strictly confidential and shall not disclose, publish, or otherwise reveal any Confidential Information to any third party without the prior written consent of the disclosing party, except as required by law.

3. COMMISSION AND INTRODUCTION TERMS

The Landlord acknowledges that this introduction was facilitated by NFsTay. If the Landlord and Operator proceed to sign a lease, management agreement, or any other arrangement for this property within 12 months of this introduction, an introduction fee of £250 is payable to NFsTay by the Landlord.

4. PERMITTED USE

The receiving party may use Confidential Information solely for the purpose of evaluating and potentially entering into a serviced accommodation arrangement for the specific property referenced in this conversation thread.

5. DURATION

This Agreement shall remain in force for a period of 12 (twelve) months from the date of signature. Obligations of confidentiality shall survive the termination of this Agreement.

6. RETURN OF INFORMATION

Upon request by the disclosing party, the receiving party shall promptly return or destroy all copies of Confidential Information in their possession.

7. NO WARRANTY

All Confidential Information is provided "as is" without warranty of any kind. Neither party makes any representation or warranty as to the accuracy or completeness of any information provided.

8. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.
`.trim();

export default function AgreementModal({ thread, isOperator, onClose, onSign }: Props) {
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const canSign = fullName.trim().length >= 2 && agreed;

  const handleSign = () => {
    if (!canSign) return;
    onSign();
    toast.success('NDA signed — contact details are now unlocked');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">NDA Agreement</h2>
            <p className="text-xs text-gray-500 mt-0.5">Non-Disclosure Agreement between NFsTay and the Landlord/Agent</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-50"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Status banner */}
          {thread.termsAccepted ? (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">NDA Signed</div>
                <p className="text-xs text-emerald-700 mt-0.5">Contact details are now visible in this conversation.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-800">Awaiting landlord signature</div>
                <p className="text-xs text-amber-700 mt-0.5">The landlord must sign this NDA before contact details and phone numbers are shared in this chat.</p>
              </div>
            </div>
          )}

          {/* Property reference */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-900">{thread.propertyTitle}</div>
            <div className="text-xs text-gray-500 mt-0.5">{thread.propertyCity} · {thread.propertyPostcode} · £{thread.propertyRent.toLocaleString()}/mo</div>
          </div>

          {/* Agreement text */}
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono text-[13px] bg-gray-50 rounded-xl p-5 border border-gray-100">
            {NDA_TEXT}
          </div>

          {/* Signature section — only for operators when not yet signed */}
          {!thread.termsAccepted && isOperator && (
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Landlord / Agent Signature Required</h3>
                <p className="text-xs text-gray-500 mt-0.5">The landlord or their agent must sign below to unlock full messaging.</p>
              </div>

              {/* Signature pad placeholder */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 bg-gray-50 flex items-center justify-center">
                <span className="text-sm text-gray-400">Signature area — landlord signs here</span>
              </div>

              {/* Name input */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Full name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter full legal name"
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-emerald-600 w-4 h-4" />
                <span className="text-xs text-gray-700">I agree to the terms of this NDA</span>
              </label>

              {/* Sign button */}
              <button
                onClick={handleSign}
                disabled={!canSign}
                className="w-full h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sign NDA
              </button>
            </div>
          )}

          {/* Operator waiting view */}
          {!thread.termsAccepted && !isOperator && (
            <div className="border-t border-gray-100 pt-5 text-center">
              <p className="text-sm text-gray-500">Waiting for landlord to sign this agreement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
