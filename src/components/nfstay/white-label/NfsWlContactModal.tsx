// White-label contact modal — shows operator contact methods
import { Phone, Mail, MessageCircle } from 'lucide-react';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NfsWlContactModal({ open, onOpenChange }: Props) {
  const { operator } = useNfsWhiteLabel();

  if (!operator) return null;

  const hasAnyContact =
    operator.contact_phone ||
    operator.contact_email ||
    operator.contact_whatsapp ||
    operator.contact_telegram;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {operator.brand_name || 'Us'}</DialogTitle>
          <DialogDescription>
            Get in touch with us through any of these channels.
          </DialogDescription>
        </DialogHeader>

        {!hasAnyContact ? (
          <p className="text-sm text-muted-foreground py-4">
            No contact information available.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {operator.contact_phone && (
              <a
                href={`tel:${operator.contact_phone}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {operator.contact_phone}
                  </p>
                </div>
              </a>
            )}

            {operator.contact_email && (
              <a
                href={`mailto:${operator.contact_email}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {operator.contact_email}
                  </p>
                </div>
              </a>
            )}

            {operator.contact_whatsapp && (
              <a
                href={`https://wa.me/${operator.contact_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    {operator.contact_whatsapp}
                  </p>
                </div>
              </a>
            )}

            {operator.contact_telegram && (
              <a
                href={`https://t.me/${operator.contact_telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Telegram</p>
                  <p className="text-sm text-muted-foreground">
                    @{operator.contact_telegram.replace('@', '')}
                  </p>
                </div>
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
