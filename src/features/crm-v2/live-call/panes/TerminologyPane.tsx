// crm-v2 TerminologyPane — glossary / objections reference.
//
// PR C scope: placeholder pane to preserve the four-column layout.
// The smsv2 version reads wk_terminologies; we'll port if/when Hugo
// asks. Keeping the pane structurally so the layout reads correctly.

export default function TerminologyPane() {
  return (
    <div className="flex flex-col h-full" data-testid="incall-terminology-pane">
      <div className="px-4 py-2 border-b border-[#E5E7EB]">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
          Terminology
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-[11px] text-[#9CA3AF] italic">
        Glossary panel — coming soon.
      </div>
    </div>
  );
}
