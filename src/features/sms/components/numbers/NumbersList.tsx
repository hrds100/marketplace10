import { useState } from 'react';
import { Phone, Star, Trash2, Pencil, MessageSquare } from 'lucide-react';
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
import type { SmsPhoneNumber } from '../../types';
import PhoneNumber from '../shared/PhoneNumber';
import StatusBadge from '../shared/StatusBadge';

interface NumbersListProps {
  numbers: SmsPhoneNumber[];
  onEdit: (number: SmsPhoneNumber) => void;
  onSetDefault: (numberId: string) => void;
  onRemove: (numberId: string) => void;
}

export default function NumbersList({ numbers, onEdit, onSetDefault, onRemove }: NumbersListProps) {
  const [removeId, setRemoveId] = useState<string | null>(null);

  if (numbers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Phone className="h-12 w-12 text-[#9CA3AF] mb-4" />
        <p className="text-lg font-medium text-[#1A1A1A] mb-1">No phone numbers yet</p>
        <p className="text-sm text-[#6B7280]">
          Connect your first Twilio number to start sending messages.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {numbers.map((num) => (
          <div
            key={num.id}
            className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:shadow-[rgba(0,0,0,0.08)_0_4px_24px_-2px] transition-shadow duration-200"
          >
            {/* Phone number + badges */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <PhoneNumber
                  number={num.phoneNumber}
                  className="text-lg font-semibold text-[#1A1A1A]"
                />
                <p className="text-sm text-[#6B7280] mt-0.5">{num.label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {num.isDefault && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F3F3EE] text-[#1A1A1A]">
                    Default
                  </span>
                )}
                <StatusBadge status="active" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-1.5 text-sm text-[#6B7280] mb-4">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{num.messageCount.toLocaleString()} messages</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(num)}
                className="rounded-lg border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1A1A]"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              {!num.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSetDefault(num.id)}
                  className="rounded-lg border-[#E5E7EB] text-[#6B7280] hover:text-[#1E9A80]"
                >
                  <Star className="h-3.5 w-3.5 mr-1" />
                  Set Default
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRemoveId(num.id)}
                className="ml-auto text-[#6B7280] hover:text-[#EF4444]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Remove confirmation */}
      <AlertDialog open={removeId !== null} onOpenChange={(v) => !v && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove phone number?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the number from your account. Any active campaigns using this
              number will stop sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-[#E5E7EB]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeId) onRemove(removeId);
                setRemoveId(null);
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
