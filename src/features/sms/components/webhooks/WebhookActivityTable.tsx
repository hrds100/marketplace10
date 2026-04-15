import { useState } from 'react';
import { CheckCircle2, XCircle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SmsWebhookLog } from '../../types';

interface Props {
  logs: SmsWebhookLog[];
  isLoading: boolean;
  onRemoveFromHistory: (phone: string) => void;
  isRemoving: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WebhookActivityTable({
  logs,
  isLoading,
  onRemoveFromHistory,
  isRemoving,
}: Props) {
  const [removePhone, setRemovePhone] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-8 text-center">
        <p className="text-sm text-[#6B7280]">No activity yet — logs will appear here after the first dispatch.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F3F3EE] text-[#6B7280] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Phone</th>
              <th className="text-left px-4 py-3 font-semibold">HTTP</th>
              <th className="text-left px-4 py-3 font-semibold">Attempt</th>
              <th className="text-left px-4 py-3 font-semibold">When</th>
              <th className="text-right px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F3F3EE]/40">
                <td className="px-4 py-3">
                  {log.status === 'success' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E9A80]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
                      <XCircle className="h-3.5 w-3.5" />
                      Failed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#1A1A1A]">{log.phone}</td>
                <td className="px-4 py-3 text-xs text-[#6B7280]">
                  {log.httpStatus ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-[#6B7280]">{log.attempt}</td>
                <td className="px-4 py-3 text-xs text-[#6B7280]">
                  {formatTime(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemovePhone(log.phone)}
                    className="h-7 text-xs text-[#6B7280] hover:text-[#EF4444]"
                    title="Remove from history (unlocks phone for re-send)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={removePhone !== null} onOpenChange={(v) => !v && setRemovePhone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from history?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes log + queue rows for <span className="font-mono">{removePhone}</span>{' '}
              and unlocks the phone, so it can be dispatched again on its next stage change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-[#E5E7EB]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() => {
                if (removePhone) onRemoveFromHistory(removePhone);
                setRemovePhone(null);
              }}
              className="rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
