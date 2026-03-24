import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NfsReservation } from '@/lib/nfstay/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-200 dark:bg-yellow-800',
  confirmed: 'bg-green-200 dark:bg-green-800',
  cancelled: 'bg-red-200 dark:bg-red-800',
  completed: 'bg-blue-200 dark:bg-blue-800',
  no_show: 'bg-gray-200 dark:bg-gray-700',
  expired: 'bg-gray-100 dark:bg-gray-800',
};

interface Props {
  reservations: NfsReservation[];
}

export default function NfsCalendarView({ reservations }: Props) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday start

  const monthLabel = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const reservationsByDay = useMemo(() => {
    const map: Record<number, NfsReservation[]> = {};
    for (const r of reservations) {
      if (r.status === 'cancelled' || r.status === 'expired') continue;
      const start = new Date(r.check_in);
      const end = new Date(r.check_out);
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(year, month, d);
        if (day >= start && day < end) {
          if (!map[d]) map[d] = [];
          map[d].push(r);
        }
      }
    }
    return map;
  }, [reservations, year, month, daysInMonth]);

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div data-feature="BOOKING_NFSTAY__RESERVATIONS" className="space-y-4">
      <div data-feature="BOOKING_NFSTAY__CALENDAR_NAV" className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold">{monthLabel}</h3>
        <Button variant="ghost" size="sm" onClick={next}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div data-feature="BOOKING_NFSTAY__CALENDAR_GRID" className="grid grid-cols-7 gap-px bg-border/40 rounded-lg overflow-hidden">
        {days.map(d => (
          <div key={d} className="bg-muted/30 p-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-background p-2 min-h-[80px]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayReservations = reservationsByDay[day] || [];
          const isToday = new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;

          return (
            <div
              key={day}
              className={`bg-background p-1.5 min-h-[80px] ${isToday ? 'ring-1 ring-primary ring-inset' : ''}`}
            >
              <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayReservations.slice(0, 2).map(r => {
                  const name = r.guest_first_name || 'Guest';
                  return (
                    <div
                      key={r.id}
                      data-feature="BOOKING_NFSTAY__CALENDAR_EVENT"
                      className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${STATUS_COLORS[r.status] || ''}`}
                      onClick={() => navigate(`/nfstay/reservations/${r.id}`)}
                      title={`${name} — ${r.status}`}
                    >
                      {name}
                    </div>
                  );
                })}
                {dayReservations.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayReservations.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
