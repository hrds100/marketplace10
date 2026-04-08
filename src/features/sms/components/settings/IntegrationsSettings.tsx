import { Phone, Brain, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNumbers } from '../../hooks/useNumbers';

export default function IntegrationsSettings() {
  const { numbers, isLoading } = useNumbers();
  const smsNumbers = numbers.filter((n) => n.channel === 'sms');
  const waNumbers = numbers.filter((n) => n.channel === 'whatsapp');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Twilio SMS */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-[#F5F5F5] p-2">
            <Phone className="h-5 w-5 text-[#1A1A1A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Twilio SMS</p>
            <p className="text-xs text-[#6B7280]">SMS messaging</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-[#9CA3AF] animate-spin" />
            <span className="text-xs text-[#9CA3AF]">Checking...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`h-2 w-2 rounded-full ${smsNumbers.length > 0 ? 'bg-[#1E9A80]' : 'bg-[#9CA3AF]'}`}
              />
              <span
                className={`text-sm font-medium ${smsNumbers.length > 0 ? 'text-[#1E9A80]' : 'text-[#9CA3AF]'}`}
              >
                {smsNumbers.length > 0 ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mb-2">
              {smsNumbers.length} SMS {smsNumbers.length === 1 ? 'number' : 'numbers'}
            </p>
            {smsNumbers.map((num) => (
              <p key={num.id} className="text-xs text-[#6B7280]">
                {num.phoneNumber} ({num.label})
                {num.isDefault && (
                  <span className="ml-1 text-[10px] font-semibold text-[#1E9A80]">Default</span>
                )}
              </p>
            ))}
          </>
        )}
      </div>

      {/* WhatsApp */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-[#25D366]/10 p-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">WhatsApp</p>
            <p className="text-xs text-[#6B7280]">WhatsApp Business API</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-[#9CA3AF] animate-spin" />
            <span className="text-xs text-[#9CA3AF]">Checking...</span>
          </div>
        ) : waNumbers.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#25D366]" />
              <span className="text-sm font-medium text-[#25D366]">Connected</span>
            </div>
            <p className="text-xs text-[#6B7280] mb-2">
              {waNumbers.length} WhatsApp {waNumbers.length === 1 ? 'number' : 'numbers'}
            </p>
            {waNumbers.map((num) => (
              <p key={num.id} className="text-xs text-[#6B7280]">
                {num.phoneNumber} ({num.label})
              </p>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
              <span className="text-sm font-medium text-[#9CA3AF]">Not connected</span>
            </div>
            <p className="text-xs text-[#6B7280] mb-3">
              Connect your WhatsApp Business account to send and receive WhatsApp messages.
            </p>
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#25D366]/90 text-white text-xs rounded-lg gap-1.5"
              onClick={() => {
                // TODO: implement Meta OAuth flow
                window.open('https://business.facebook.com/latest/whatsapp_manager', '_blank');
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Connect WhatsApp
            </Button>
          </>
        )}
      </div>

      {/* OpenAI */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-[#F5F5F5] p-2">
            <Brain className="h-5 w-5 text-[#1A1A1A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">OpenAI</p>
            <p className="text-xs text-[#6B7280]">AI response generation</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#1E9A80]" />
          <span className="text-sm font-medium text-[#1E9A80]">Connected</span>
        </div>
        <p className="text-xs text-[#6B7280]">
          Models: GPT-5.4, GPT-5.4 Mini, GPT-5.4 Nano, GPT-5, O4 Mini
        </p>
      </div>
    </div>
  );
}
