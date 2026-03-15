import { MessageSquare } from 'lucide-react';

const STARTERS = [
  "I'm really interested in this property. Is it still available?",
  'Can you confirm the monthly rent and move-in date?',
  'Is this property approved for serviced accommodation?',
  'Can I arrange a viewing for this property?',
  "Could you tell me what's included in the rent?",
  "I'd love to move forward — what are the next steps?",
];

interface Props {
  propertyTitle: string;
  onSelectStarter: (text: string) => void;
}

export default function ChatEmptyState({ propertyTitle, onSelectStarter }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10 gap-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-emerald-500" />
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900">Start the conversation</h3>
        <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">
          Send a message and the landlord or agent will be notified instantly.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm">
        <p className="text-sm text-gray-400 italic text-center">
          Ask about availability, rent, viewings, or serviced accommodation terms...
        </p>
      </div>

      <div className="w-full max-w-md">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center mb-3">Quick starters</p>
        <div className="space-y-2">
          {STARTERS.map(text => (
            <button
              key={text}
              onClick={() => onSelectStarter(text)}
              className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-100 bg-white text-sm text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all duration-150 shadow-sm"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
