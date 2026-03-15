import { useState } from 'react';
import { ChevronLeft, MapPin, Home, Phone, Mail, FileText, CheckCircle, Clock, Square } from 'lucide-react';
import type { Thread } from './types';
import AgreementModal from './AgreementModal';

interface Props {
  thread: Thread;
  onClose: () => void;
  onSignNDA: () => void;
  isOperator?: boolean;
}

export default function InboxInquiryPanel({ thread, onClose, onSignNDA, isOperator = true }: Props) {
  const [showAgreement, setShowAgreement] = useState(false);

  return (
    <>
      <div className="h-full flex flex-col bg-white border-l border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-bold text-gray-900">Inquiry Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="w-full h-40 rounded-xl bg-gray-100 overflow-hidden">
            {thread.propertyImage ? (
              <img src={thread.propertyImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">No image</div>
            )}
          </div>

          <div>
            <h4 className="text-base font-bold text-gray-900">{thread.propertyTitle}</h4>
            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{thread.propertyCity} · {thread.propertyPostcode}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Home className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{thread.dealType || 'Serviced Accommodation'}</span>
            </div>
            <div className="mt-3 text-lg font-bold text-emerald-600">£{thread.propertyProfit.toLocaleString()}/mo</div>
            <div className="text-[11px] text-gray-400">Estimated monthly profit</div>
          </div>

          {/* NDA status */}
          <div>
            {thread.termsAccepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> NDA Signed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" /> NDA Pending
              </span>
            )}
          </div>

          {/* NDA CTA */}
          <button
            onClick={() => setShowAgreement(true)}
            disabled={thread.termsAccepted}
            className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              thread.termsAccepted
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            {thread.termsAccepted ? 'NDA Signed ✓' : 'View NDA Agreement'}
          </button>

          <div className="border-t border-gray-100" />

          {/* Landlord details */}
          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Landlord Details</h5>
            <div className="space-y-2.5">
              <div className="text-sm font-medium text-gray-900">{thread.contactName}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {thread.termsAccepted ? thread.contactPhone : '•••• •••• ••••'}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {thread.termsAccepted ? thread.contactEmail : '••••@••••.co.uk'}
              </div>
            </div>
            {!thread.termsAccepted && (
              <p className="text-[10px] text-gray-400 mt-2 italic">Sign the NDA to reveal contact details</p>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Next steps */}
          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Next Steps</h5>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-gray-700">Initial enquiry sent</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm text-gray-700">Awaiting landlord response</span>
              </div>
              <div className="flex items-center gap-2.5">
                {thread.termsAccepted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-300 shrink-0" />
                )}
                <span className={`text-sm ${thread.termsAccepted ? 'text-gray-700' : 'text-gray-400'}`}>Sign NDA Agreement</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAgreement && (
        <AgreementModal thread={thread} isOperator={isOperator} onClose={() => setShowAgreement(false)} onSign={onSignNDA} />
      )}
    </>
  );
}
