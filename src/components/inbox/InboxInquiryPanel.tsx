import { X, MapPin, Calendar, FileText } from 'lucide-react';
import type { Thread } from './types';

interface Props {
  thread: Thread;
  onClose: () => void;
}

export default function InboxInquiryPanel({ thread, onClose }: Props) {
  return (
    <div className="h-full flex flex-col bg-white border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-bold text-foreground">Inquiry Details</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Property image */}
        <div className="w-full h-32 rounded-xl bg-secondary overflow-hidden">
          {thread.propertyImage ? (
            <img src={thread.propertyImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">No image</div>
          )}
        </div>

        {/* Property info */}
        <div>
          <h4 className="text-base font-bold text-foreground">{thread.propertyTitle}</h4>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{thread.propertyCity} · {thread.propertyPostcode}</span>
          </div>
          {thread.propertyProfit > 0 && (
            <div className="mt-2 text-sm font-semibold text-accent-foreground">
              Est. profit: £{thread.propertyProfit.toLocaleString()}/mo
            </div>
          )}
        </div>

        {/* Operator info */}
        <div className="border-t border-border pt-4">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h5>
          <div className="text-sm font-medium text-foreground">{thread.contactName}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Joined NFsTay: Mar 2026</span>
          </div>
        </div>

        {/* Agreement CTA */}
        <div className="border-t border-border pt-4">
          {thread.termsAccepted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <FileText className="w-4 h-4" /> Agreement signed
              </div>
              <p className="text-xs text-emerald-700 mt-1">Direct contact details available. Agreement signed on 10 Mar 2026.</p>
              <div className="mt-3 space-y-1 text-xs text-foreground">
                <div>Phone: +44 7911 123 456</div>
                <div>Email: landlord@example.co.uk</div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-800 mb-3">Sign the agreement to unlock direct contact details for this landlord.</p>
              <button className="w-full h-10 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                Sign Agreement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
