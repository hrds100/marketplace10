import { CalendarDays } from 'lucide-react';

export default function NfsReservations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage your bookings.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
        <CalendarDays className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Reservation management coming in Phase 3.</p>
      </div>
    </div>
  );
}
