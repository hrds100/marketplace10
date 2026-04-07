import { Phone, Brain, Loader2 } from 'lucide-react';
import { useNumbers } from '../../hooks/useNumbers';

export default function IntegrationsSettings() {
  const { numbers, isLoading } = useNumbers();
  const hasNumbers = numbers.length > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Twilio */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-[#F3F3EE] p-2">
            <Phone className="h-5 w-5 text-[#1A1A1A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Twilio</p>
            <p className="text-xs text-[#6B7280]">SMS messaging provider</p>
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
                className={`h-2 w-2 rounded-full ${hasNumbers ? 'bg-[#1E9A80]' : 'bg-[#9CA3AF]'}`}
              />
              <span
                className={`text-sm font-medium ${hasNumbers ? 'text-[#1E9A80]' : 'text-[#9CA3AF]'}`}
              >
                {hasNumbers ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mb-2">
              {numbers.length} phone {numbers.length === 1 ? 'number' : 'numbers'} configured
            </p>
            {numbers.length > 0 && (
              <div className="space-y-1">
                {numbers.map((num) => (
                  <p key={num.id} className="text-xs text-[#6B7280]">
                    {num.phoneNumber} ({num.label})
                    {num.isDefault && (
                      <span className="ml-1 text-[10px] font-semibold text-[#1E9A80]">
                        Default
                      </span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* OpenAI */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg bg-[#F3F3EE] p-2">
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
        <p className="text-xs text-[#6B7280]">Models: GPT-4o, GPT-4o Mini, GPT-4.1, GPT-4.1 Mini</p>
      </div>
    </div>
  );
}
