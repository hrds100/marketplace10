// ScriptPane — call-script teleprompter with live stage cursor.
// Parses the campaign's script_md and highlights the block the agent
// is currently reading, advanced by useScriptStage (which matches the
// agent's transcript against the parsed blocks).

import { ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Block } from '../../lib/scriptParser';
import { useScriptStage } from '../../hooks/useScriptStage';

interface Props {
  callId: string | null;
  scriptMd: string | null;
}

export default function ScriptPane({ callId, scriptMd }: Props) {
  const { blocks, stageIdx } = useScriptStage(callId, scriptMd);
  return (
    <div
      data-feature="CALLER__SCRIPT_PANE"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold inline-flex items-center gap-1.5">
          <ListTree className="w-3.5 h-3.5" />
          Script
        </div>
        {blocks.length > 0 && (
          <div className="text-[10px] text-[#9CA3AF] tabular-nums">
            stage {stageIdx + 1} / {blocks.length}
          </div>
        )}
      </div>
      {!scriptMd && (
        <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
          No script attached to this campaign.
        </div>
      )}
      {scriptMd && blocks.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
          Script is empty.
        </div>
      )}
      <ul className="flex-1 overflow-y-auto space-y-2 text-[13px] leading-relaxed">
        {blocks.map((b, i) => (
          <BlockItem key={i} block={b} active={i === stageIdx} done={i < stageIdx} />
        ))}
      </ul>
    </div>
  );
}

function BlockItem({
  block,
  active,
  done,
}: {
  block: Block;
  active: boolean;
  done: boolean;
}) {
  const wrap = cn(
    'rounded-[10px] px-3 py-2 transition-colors',
    active && 'bg-[#ECFDF5] border border-[#1E9A80] shadow-[0_2px_12px_rgba(30,154,128,0.15)]',
    !active && done && 'opacity-50',
    !active && !done && 'bg-transparent'
  );
  switch (block.type) {
    case 'h':
      return (
        <li
          className={cn(
            wrap,
            block.level === 1 && 'text-[16px] font-bold text-[#1A1A1A]',
            block.level === 2 && 'text-[14px] font-bold text-[#1A1A1A]',
            block.level === 3 && 'text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wide'
          )}
        >
          {block.text}
        </li>
      );
    case 'p':
      return <li className={cn(wrap, 'text-[#1A1A1A]')}>{block.text}</li>;
    case 'q':
      return (
        <li className={cn(wrap, 'border-l-2 border-[#9CA3AF] pl-3 text-[#6B7280] italic')}>
          {block.text}
        </li>
      );
    case 'hr':
      return <li className="border-t border-[#E5E7EB] my-1" />;
    case 'ul':
      return (
        <li className={wrap}>
          <ul className="list-disc pl-4 space-y-1">
            {block.items.map((it, j) => (
              <li key={j} className="text-[#1A1A1A]">
                {it.kind === 'if' && it.condition && (
                  <span className="inline-flex items-center gap-1 mr-1.5 px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold uppercase tracking-wide">
                    if {it.condition}
                  </span>
                )}
                {it.text}
              </li>
            ))}
          </ul>
        </li>
      );
  }
}
