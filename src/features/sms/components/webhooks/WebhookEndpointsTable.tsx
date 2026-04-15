import { useState } from 'react';
import { Pencil, Trash2, Globe, Clock, Plus } from 'lucide-react';
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
import type { SmsWebhookEndpoint } from '../../types';

interface Props {
  endpoints: SmsWebhookEndpoint[];
  onEdit: (endpoint: SmsWebhookEndpoint) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function shortTime(hms: string): string {
  return hms.slice(0, 5);
}

export default function WebhookEndpointsTable({ endpoints, onEdit, onDelete, onAdd }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#E5E7EB] rounded-xl bg-white">
        <div className="rounded-2xl bg-[#F3F3EE] p-4 mb-4">
          <Globe className="h-8 w-8 text-[#9CA3AF]" />
        </div>
        <p className="text-[#1A1A1A] font-semibold mb-1">No webhook endpoints yet</p>
        <p className="text-sm text-[#6B7280] mb-4">
          Add a WAtoolbox endpoint to start dispatching contacts
        </p>
        <Button
          size="sm"
          onClick={onAdd}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Endpoint
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:shadow-[rgba(0,0,0,0.08)_0_4px_24px_-2px] transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-[#1A1A1A] truncate">{ep.name}</h3>
                  {ep.status === 'active' ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#1E9A80]">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F3F3EE] text-[#6B7280]">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] font-mono truncate">{ep.url}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-[#6B7280] mb-4">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {shortTime(ep.sendWindowStart)}–{shortTime(ep.sendWindowEnd)} UK
              </span>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(ep)}
                className="rounded-lg border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1A1A]"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(ep.id)}
                className="ml-auto text-[#6B7280] hover:text-[#EF4444]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              The dispatcher will stop using this endpoint. Queue rows currently assigned to it
              will fall back to other active endpoints.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-[#E5E7EB]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId);
                setDeleteId(null);
              }}
              className="rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
