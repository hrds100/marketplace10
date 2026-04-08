import { useState, useEffect } from 'react';
import { Trash2, MessageSquare, Loader2 } from 'lucide-react';
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
import type { WhatsAppTemplate } from '../../hooks/useWhatsappTemplates';

interface WhatsAppTemplatesListProps {
  templates: WhatsAppTemplate[];
  isLoading: boolean;
  onFetch: () => void;
  onDelete: (name: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-[#ECFDF5] text-[#1E9A80]',
  PENDING: 'bg-[#FEF3C7] text-[#F59E0B]',
  REJECTED: 'bg-[#FEF2F2] text-[#EF4444]',
};

const CATEGORY_STYLES: Record<string, string> = {
  UTILITY: 'bg-[#ECFDF5] text-[#1E9A80]',
  MARKETING: 'bg-[#F3F3EE] text-[#6B7280]',
  AUTHENTICATION: 'bg-[#F3F3EE] text-[#525252]',
};

function getBodyText(components: WhatsAppTemplate['components']): string {
  const bodyComp = components?.find((c) => c.type === 'BODY');
  return bodyComp?.text || '(No body text)';
}

export default function WhatsAppTemplatesList({
  templates,
  isLoading,
  onFetch,
  onDelete,
}: WhatsAppTemplatesListProps) {
  const [deleteName, setDeleteName] = useState<string | null>(null);

  useEffect(() => {
    onFetch();
  }, [onFetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-[#25D366]" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="h-12 w-12 text-[#9CA3AF] mb-4" />
        <p className="text-lg font-medium text-[#1A1A1A] mb-1">
          No WhatsApp templates
        </p>
        <p className="text-sm text-[#6B7280]">
          Create your first template to send pre-approved WhatsApp messages.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => {
          const bodyText = getBodyText(tpl.components);
          const statusClass =
            STATUS_STYLES[tpl.status] || 'bg-[#F3F3EE] text-[#6B7280]';
          const categoryClass =
            CATEGORY_STYLES[tpl.category] || 'bg-[#F3F3EE] text-[#6B7280]';

          return (
            <div
              key={tpl.id}
              className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-between hover:shadow-[rgba(0,0,0,0.08)_0_4px_24px_-2px] transition-shadow duration-200"
            >
              <div>
                {/* Header: name + status */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] font-mono">
                    {tpl.name}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}`}
                  >
                    {tpl.status}
                  </span>
                </div>

                {/* Category + Language badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryClass}`}
                  >
                    {tpl.category}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">{tpl.language}</span>
                </div>

                {/* Body preview */}
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  {bodyText.length > 100
                    ? `${bodyText.slice(0, 100)}...`
                    : bodyText}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-[#E5E7EB]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteName(tpl.name)}
                  className="h-8 w-8 p-0 text-[#6B7280] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteName !== null}
        onOpenChange={(v) => !v && setDeleteName(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WhatsApp template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template from Meta. Templates
              that are currently in use by active campaigns cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-[#E5E7EB]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteName) onDelete(deleteName);
                setDeleteName(null);
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
