import { toast } from 'sonner';
import type { Message } from './types';

interface Props {
  message: Message;
  isSender: boolean;
  termsAccepted: boolean;
}

const CTA_TEXT: Record<string, string> = {
  phone: 'Sign NDA to see the number',
  email: 'Sign NDA to see the email',
  address: 'Sign NDA to see the address',
  contact: 'Sign NDA to unlock contact details',
};

export default function MessageBubble({ message, isSender, termsAccepted }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (message.messageType === 'system') {
    return (
      <div className="text-center py-3">
        <span className="text-xs text-gray-400">{message.body}</span>
      </div>
    );
  }

  const isMe = message.senderId === 'me';

  // Determine which text to display
  // Sender always sees original body
  // Receiver sees body_receiver if masked AND NDA not yet signed
  let displayText = message.body;
  const showMaskedCTA = !isSender && message.isMasked && !termsAccepted && message.bodyReceiver;
  if (showMaskedCTA) {
    displayText = message.bodyReceiver!;
  }

  return (
    <div data-feature="CRM_INBOX__CHAT_WINDOW" className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-foreground'}`}>
        <p data-feature="CRM_INBOX__MESSAGE_BODY" className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>

        {/* Masked content CTA — only shown to receiver when NDA not signed */}
        {showMaskedCTA && (
          <button
            data-feature="CRM_INBOX__MESSAGE_MASKED"
            onClick={() => {
              if (termsAccepted) {
                toast('Details already unlocked — check the right panel');
              }
              // If not accepted, the parent component handles NDA modal
              // This is a visual indicator only — tapping scrolls attention to the NDA panel
            }}
            className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mt-1.5 hover:bg-amber-100 transition-colors inline-block"
          >
            {CTA_TEXT[message.maskType || 'contact'] || CTA_TEXT.contact}
          </button>
        )}

        <div data-feature="CRM_INBOX__MESSAGE_TIME" className={`text-[10px] mt-1 ${isMe ? 'text-gray-400' : 'text-muted-foreground'}`}>{time}</div>
      </div>
    </div>
  );
}
