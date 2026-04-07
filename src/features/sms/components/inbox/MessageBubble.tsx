import { format } from 'date-fns';
import { AlertTriangle, Check, CheckCheck, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmsMessage } from '../../types';

interface MessageBubbleProps {
  message: SmsMessage;
}

function DeliveryStatus({ status }: { status: SmsMessage['status'] }) {
  switch (status) {
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-[#1E9A80]" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-[#9CA3AF]" />;
    case 'queued':
    case 'scheduled':
      return <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />;
    case 'failed':
      return <X className="h-3.5 w-3.5 text-[#EF4444]" />;
    case 'undelivered':
      return <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" />;
    default:
      return null;
  }
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';
  const isFailed = message.status === 'failed';
  const time = format(new Date(message.createdAt), 'HH:mm');

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            'px-3 py-2 text-sm leading-relaxed',
            isOutbound
              ? 'bg-[#1E9A80] text-white rounded-2xl rounded-tr-sm'
              : 'bg-white border border-[#E5E7EB] text-[#1A1A1A] rounded-2xl rounded-tl-sm',
            isFailed && 'border-[#EF4444] bg-red-50'
          )}
        >
          {message.body}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-xs text-[#9CA3AF]',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span>{time}</span>
          {isOutbound && <DeliveryStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}
