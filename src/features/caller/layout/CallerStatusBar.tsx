// CallerStatusBar — minimal status bar for Phase 1.
//
// Phase 1 ships a thin presence pill only. The legacy smsv2 statusbar
// pulls in spend, kill switches, agent presence, inbox notifications,
// and a leaderboard popover from ~6 different smsv2 hooks. Those hooks
// are rebuilt fresh in later phases. Until then, this stub keeps the
// top bar visually consistent without importing anything from smsv2/.

import { useAuth } from '@/hooks/useAuth';

export default function CallerStatusBar() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name
    ?? user?.email?.split('@')[0]
    ?? 'Agent';

  return (
    <div
      data-feature="CALLER__STATUS_BAR"
      className="flex items-center gap-3 px-3 py-1 bg-[#F3F3EE]/60 rounded-full border border-[#E5E7EB] text-[11px] text-[#6B7280]"
    >
      <span className="font-medium text-[#1A1A1A]">{firstName}</span>
      <span className="text-[#9CA3AF]">· Caller</span>
    </div>
  );
}
