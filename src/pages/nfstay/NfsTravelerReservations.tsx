import { Link } from "react-router-dom";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { CalendarDays, MapPin, Users, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NfsStatusBadge } from "@/components/nfstay/NfsStatusBadge";
import { NfsEmptyState } from "@/components/nfstay/NfsEmptyState";
import { mockReservations, getReservationProperty, MockReservation } from "@/data/nfstay/mock-reservations";
import { useCurrency } from "@/contexts/NfsCurrencyContext";

function ReservationCard({ r }: { r: MockReservation }) {
  const { formatPrice } = useCurrency();
  const prop = getReservationProperty(r);
  return (
    <Link data-feature="BOOKING_NFSTAY__TRAVELER_CARD" to={`/nfstay/traveler/reservation/${r.id}`} className="flex gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
      <img src={prop.image} alt={prop.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">{prop.title}</h3>
          <NfsStatusBadge status={r.status} />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="w-3 h-3" />{prop.city}, {prop.country}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{format(parseISO(r.check_in), 'MMM d')} – {format(parseISO(r.check_out), 'MMM d, yyyy')}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.adults + r.children} guests</span>
        </div>
        <p className="text-sm font-semibold mt-2">{formatPrice(r.total_amount)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

export default function NfsTravelerReservations() {
  const all = mockReservations;
  const upcoming = all.filter(r => isFuture(parseISO(r.check_in)) && r.status !== 'cancelled');
  const past = all.filter(r => isPast(parseISO(r.check_out)) || r.status === 'completed');
  const cancelled = all.filter(r => r.status === 'cancelled');

  const renderList = (list: typeof all) =>
    list.length === 0
      ? <NfsEmptyState icon={CalendarDays} title="No reservations" description="You don't have any reservations in this category." />
      : <div className="space-y-3">{list.map(r => <ReservationCard key={r.id} r={r} />)}</div>;

  return (
    <div data-feature="BOOKING_NFSTAY__TRAVELER" className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-6">My Reservations</h1>
      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__TRAVELER_UPCOMING" value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger data-feature="BOOKING_NFSTAY__TRAVELER_PAST" value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderList(all)}</TabsContent>
        <TabsContent value="upcoming">{renderList(upcoming)}</TabsContent>
        <TabsContent value="past">{renderList(past)}</TabsContent>
        <TabsContent value="cancelled">{renderList(cancelled)}</TabsContent>
      </Tabs>
    </div>
  );
}
