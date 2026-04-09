import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, Bed, Bath, Phone, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScraperDeal } from '../types';

interface DealCardProps {
  deal: ScraperDeal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSubmit: (id: string) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-[#F3F3EE] text-[#6B7280]',
  approved: 'bg-[rgba(30,154,128,0.08)] text-[#1E9A80]',
  rejected: 'bg-red-50 text-red-600',
  submitted: 'bg-blue-50 text-blue-600',
};

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return '-';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DealCard({ deal, onApprove, onReject, onSubmit, selected, onSelect }: DealCardProps) {
  const [showRaw, setShowRaw] = useState(false);
  const pd = deal.parsed_data;

  return (
    <div className={cn(
      'bg-white rounded-xl border border-[#E5E7EB] overflow-hidden transition-shadow hover:shadow-md',
      selected && 'ring-2 ring-[#1E9A80]',
    )}>
      {/* Image thumbnails */}
      {deal.images.length > 0 && (
        <div className="flex gap-1 p-2 bg-[#F3F3EE]">
          {deal.images.slice(0, 3).map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Deal image ${i + 1}`}
              className="w-20 h-16 object-cover rounded-lg"
            />
          ))}
          {deal.images.length > 3 && (
            <div className="w-20 h-16 rounded-lg bg-[#E5E7EB] flex items-center justify-center text-[12px] font-medium text-[#6B7280]">
              +{deal.images.length - 3}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header: checkbox + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              role="checkbox"
              checked={selected}
              onChange={() => onSelect(deal.id)}
              className="w-4 h-4 rounded border-[#E5E7EB] text-[#1E9A80] focus:ring-[#1E9A80]"
            />
            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase', statusStyles[deal.status])}>
              {deal.status}
            </span>
          </div>
          <span className="text-[11px] text-[#9CA3AF]">{relativeTime(deal.created_at)}</span>
        </div>

        {/* Parsed data or raw text */}
        {pd ? (
          <div>
            <h3 className="text-[15px] font-semibold text-[#1A1A1A] mb-2">
              {pd.title ?? 'Untitled Deal'}
            </h3>
            <div className="flex flex-wrap gap-3 text-[13px] text-[#6B7280] mb-2">
              {(pd.city || pd.postcode) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[pd.city, pd.postcode].filter(Boolean).join(', ')}
                </span>
              )}
              {pd.bedrooms !== undefined && (
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" />
                  {pd.bedrooms} bed
                </span>
              )}
              {pd.bathrooms !== undefined && (
                <span className="flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {pd.bathrooms} bath
                </span>
              )}
            </div>
            <div className="flex gap-4 mb-2">
              {pd.rent_monthly !== undefined && (
                <div>
                  <span className="text-[11px] text-[#9CA3AF] block">Rent</span>
                  <span className="text-[14px] font-semibold text-[#1A1A1A]">{formatCurrency(pd.rent_monthly)}/mo</span>
                </div>
              )}
              {pd.profit_est !== undefined && (
                <div>
                  <span className="text-[11px] text-[#9CA3AF] block">Est. Profit</span>
                  <span className="text-[14px] font-semibold text-[#1E9A80]">{formatCurrency(pd.profit_est)}/mo</span>
                </div>
              )}
            </div>
            {pd.property_type && (
              <span className="inline-block text-[11px] font-medium text-[#6B7280] bg-[#F3F3EE] px-2 py-0.5 rounded-full mr-1">
                {pd.property_type}
              </span>
            )}
            {pd.property_category && (
              <span className="inline-block text-[11px] font-medium text-[#6B7280] bg-[#F3F3EE] px-2 py-0.5 rounded-full">
                {pd.property_category}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-[#1A1A1A] whitespace-pre-wrap mb-2">{deal.raw_text}</p>
        )}

        {/* Raw text toggle (when parsed data exists) */}
        {pd && (
          <div className="mt-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              aria-label={showRaw ? 'Hide raw' : 'Show raw'}
            >
              {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showRaw ? 'Hide raw text' : 'Show raw'}
            </button>
            {showRaw && (
              <pre className="text-[12px] text-[#6B7280] mt-1 p-2 bg-[#F3F3EE] rounded-lg whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                {deal.raw_text}
              </pre>
            )}
          </div>
        )}

        {/* Sender info */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#E5E7EB] text-[12px] text-[#6B7280]">
          {deal.sender_name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {deal.sender_name}
            </span>
          )}
          {deal.sender_phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {deal.sender_phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {deal.group_name}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          {deal.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(deal.id)}
                className="flex-1 h-8 rounded-lg bg-[#1E9A80] text-white text-[13px] font-medium hover:bg-[#178a72] transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(deal.id)}
                className="flex-1 h-8 rounded-lg bg-red-50 text-red-600 text-[13px] font-medium hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {deal.status === 'approved' && (
            <button
              onClick={() => onSubmit(deal.id)}
              className="flex-1 h-8 rounded-lg bg-[#1E9A80] text-white text-[13px] font-medium hover:bg-[#178a72] transition-colors"
            >
              Submit as Deal
            </button>
          )}
          {deal.status === 'submitted' && (
            <span className="text-[12px] text-[#1E9A80] font-medium">Submitted to marketplace</span>
          )}
          {deal.status === 'rejected' && (
            <button
              onClick={() => onApprove(deal.id)}
              className="flex-1 h-8 rounded-lg border border-[#E5E7EB] text-[#6B7280] text-[13px] font-medium hover:bg-[#F3F3EE] transition-colors"
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
