import { Phone, Brain } from 'lucide-react';

export default function IntegrationsSettings() {
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
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#1E9A80]" />
          <span className="text-sm font-medium text-[#1E9A80]">Connected</span>
        </div>
        <p className="text-xs text-[#6B7280]">3 phone numbers configured</p>
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
        <p className="text-xs text-[#6B7280]">Model: gpt-4o</p>
      </div>
    </div>
  );
}
