// StubPage — placeholder body used by every Caller page in Phase 1.
//
// Renders the page title and a small note pointing at the build phase
// where the real UI gets implemented. The components folder otherwise
// stays empty until each phase fills it in.

interface Props {
  title: string;
  phase: string;
}

export default function StubPage({ title, phase }: Props) {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-[440px]">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-[#ECFDF5] text-[11px] font-semibold tracking-wide text-[#1E9A80] uppercase">
          Caller — placeholder
        </div>
        <h1 className="text-[28px] font-bold text-[#1A1A1A] tracking-tight">{title}</h1>
        <p className="text-[14px] text-[#6B7280] mt-3 leading-relaxed">
          This page lands in <span className="font-semibold text-[#1A1A1A]">{phase}</span> of
          the Caller rebuild. Until then, the live experience for {title} is at the
          existing <code className="text-[12px] bg-[#F3F3EE] px-1.5 py-0.5 rounded">/crm</code> URL.
        </p>
      </div>
    </div>
  );
}
