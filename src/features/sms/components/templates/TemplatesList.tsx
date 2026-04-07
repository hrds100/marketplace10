import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, FileText } from 'lucide-react';
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
import type { SmsTemplate } from '../../types';

interface TemplatesListProps {
  templates: SmsTemplate[];
  onEdit: (template: SmsTemplate) => void;
  onDelete: (templateId: string) => void;
}

export default function TemplatesList({ templates, onEdit, onDelete }: TemplatesListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-[#9CA3AF] mb-4" />
        <p className="text-lg font-medium text-[#1A1A1A] mb-1">No templates yet</p>
        <p className="text-sm text-[#6B7280]">
          Create your first template to speed up messaging.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-between hover:shadow-[rgba(0,0,0,0.08)_0_4px_24px_-2px] transition-shadow duration-200"
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">{tpl.name}</h3>
                {tpl.category && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#1E9A80]">
                    {tpl.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                {tpl.body.length > 80 ? `${tpl.body.slice(0, 80)}...` : tpl.body}
              </p>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E5E7EB]">
              <span className="text-xs text-[#9CA3AF]">
                Updated {formatDistanceToNow(new Date(tpl.updatedAt), { addSuffix: true })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(tpl)}
                  className="h-8 w-8 p-0 text-[#6B7280] hover:text-[#1A1A1A]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(tpl.id)}
                  className="h-8 w-8 p-0 text-[#6B7280] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently removed.
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
