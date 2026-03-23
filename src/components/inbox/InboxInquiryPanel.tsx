import { ChevronLeft, MapPin, Home, Phone, Mail, User, FileText, CheckCircle, Clock, Circle, Lock, ExternalLink, TrendingUp } from 'lucide-react';
import type { Thread } from './types';
import EarningsEstimator from './EarningsEstimator';

interface Props {
  thread: Thread;
  onClose: () => void;
  onSignNDA: () => void;
  isOperator?: boolean;
  onOpenAgreement?: () => void;
  onEstimatedProfitChange?: (profit: number) => void;
}

// Shared property info section — identical for both views
function PropertyInfo({ thread }: { thread: Thread }) {
  const fallbackImage = `https://picsum.photos/seed/${thread.id.slice(0, 8)}/400/240`;
  return (
    <>
      <div className="w-full h-36 rounded-xl bg-gray-100 overflow-hidden relative">
        <img src={thread.propertyImage || fallbackImage} alt=""
          className="w-full h-full object-cover"
          style={thread.propertyImageBlurred ? { filter: 'blur(8px)', transform: 'scale(1.1)' } : undefined}
          onError={e => { (e.target as HTMLImageElement).src = fallbackImage; }} />
        {thread.propertyImageBlurred && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <span className="text-white text-xs font-medium">Photos on request</span>
          </div>
        )}
      </div>
      <div>
        <h4 className="text-base font-semibold text-gray-900 leading-snug">{thread.propertyTitle}</h4>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm text-gray-500">{thread.propertyCity}{thread.propertyPostcode ? ` · ${thread.propertyPostcode}` : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Home className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm text-gray-500">{thread.dealType || 'Serviced Accommodation'}</span>
        </div>
        {thread.propertyProfit > 0 && (
          <div className="mt-2">
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              £{thread.propertyProfit.toLocaleString()}/mo
            </span>
          </div>
        )}
      </div>
      {thread.propertyId ? (
        <a href={`/deals/${thread.propertyId}`} className="w-full h-10 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
          <ExternalLink className="w-4 h-4" /> View Listing
        </a>
      ) : (
        <div className="w-full h-10 rounded-xl bg-gray-200 text-gray-400 text-sm font-medium flex items-center justify-center gap-2 opacity-50 cursor-not-allowed" title="Property not available">
          <ExternalLink className="w-4 h-4" /> View Listing
        </div>
      )}
    </>
  );
}

// OPERATOR VIEW — sees waiting state, no NDA controls, has earnings estimator
function OperatorView({ thread, onEstimatedProfitChange }: { thread: Thread; onEstimatedProfitChange?: (profit: number) => void }) {
  return (
    <>
      <PropertyInfo thread={thread} />

      <EarningsEstimator
        monthlyRent={thread.propertyRent ?? 0}
        bedrooms={thread.propertyBedrooms ?? 0}
        propertyType={thread.dealType ?? 'Property'}
        propertyProfit={thread.propertyProfit ?? 0}
        onEstimatedProfitChange={onEstimatedProfitChange}
      />

      {/* Landlord Details — locked */}
      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-50 pt-4 mb-3">Landlord Details</h5>
        <div className="rounded-xl bg-gray-50 px-3 py-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-gray-300 shrink-0" />
            <span className="text-sm text-gray-400 italic">Waiting to unlock landlord details</span>
          </div>
          <p className="text-xs text-gray-400">Waiting for landlord to release details.</p>
        </div>
      </div>

      {/* Next Steps */}
      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-50 pt-4 mb-3">Next Steps</h5>
        <div className="rounded-xl bg-gray-50 px-3 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-gray-600">Initial inquiry sent</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-gray-400">Waiting for landlord response</span>
          </div>
        </div>
      </div>
    </>
  );
}

// LANDLORD VIEW — sees NDA flow and unlock mechanism
function LandlordView({ thread, onOpenAgreement }: { thread: Thread; onOpenAgreement: () => void }) {
  return (
    <>
      <PropertyInfo thread={thread} />

      {/* NDA Status */}
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
        onClick={onOpenAgreement}
        disabled={thread.termsAccepted}
        className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
          thread.termsAccepted ? 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        <FileText className="w-4 h-4" />
        {thread.termsAccepted ? 'NDA Signed ✓' : 'View NDA Agreement'}
      </button>

      {/* Operator Details — gated by NDA */}
      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-50 pt-4 mb-3">Operator Details</h5>
        {thread.termsAccepted ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              {thread.contactName || 'nfstay Operator'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              {thread.contactPhone || 'Not provided'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              {thread.contactEmail || 'Not provided'}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 px-3 py-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-400 italic">Hidden until NDA is signed</span>
            </div>
            <p className="text-xs text-gray-400">Will be released after you sign the above agreement.</p>
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-50 pt-4 mb-3">Next Steps</h5>
        <div className="rounded-xl bg-gray-50 px-3 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-gray-600">Initial inquiry sent</span>
          </div>
          <div className="flex items-center gap-2.5">
            {thread.termsAccepted ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className={`text-sm ${thread.termsAccepted ? 'text-gray-600' : 'text-gray-400'}`}>Awaiting your response</span>
          </div>
          <div className="flex items-center gap-2.5">
            {thread.termsAccepted ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 shrink-0" />
            )}
            <span className={`text-sm ${thread.termsAccepted ? 'text-gray-600' : 'text-gray-400'}`}>Sign NDA Agreement</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function InboxInquiryPanel({ thread, onClose, onSignNDA, isOperator = true, onOpenAgreement, onEstimatedProfitChange }: Props) {
  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-bold text-gray-900">Inquiry Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {isOperator ? (
          <OperatorView thread={thread} onEstimatedProfitChange={onEstimatedProfitChange} />
        ) : (
          <LandlordView thread={thread} onOpenAgreement={() => onOpenAgreement?.()} />
        )}
      </div>
    </div>
  );
}
