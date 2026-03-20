import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export function NfsHeroSearch() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const totalGuests = adults + children;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('query', location);
    if (dateRange?.from) params.set('checkIn', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('checkOut', format(dateRange.to, 'yyyy-MM-dd'));
    if (adults > 1) params.set('adults', String(adults));
    if (children > 0) params.set('children', String(children));
    navigate(`/search?${params.toString()}`);
  };

  const Stepper = ({ label, sub, value, onChange, min = 0 }: { label: string; sub: string; value: number; onChange: (v: number) => void; min?: number }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-foreground disabled:opacity-30 disabled:hover:border-border transition"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium w-4 text-center">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-foreground transition"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d')} \u2013 ${format(dateRange.to, 'MMM d')}`
      : format(dateRange.from, 'MMM d')
    : null;

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-full shadow-xl border border-border flex flex-col md:flex-row md:items-center">
      {/* Destination */}
      <div className="flex-1 px-7 py-4 min-w-0">
        <p className="text-xs font-semibold text-foreground mb-0.5">Destination</p>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder="Search a destination..."
          className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
        />
      </div>

      <div className="hidden md:block h-10 w-px bg-border" />

      {/* Check-in/Check-out */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="px-7 py-4 text-left min-w-[180px]">
            <p className="text-xs font-semibold text-foreground mb-0.5">Check-in/Check-out</p>
            <p className={cn("text-sm", dateLabel ? "text-foreground" : "text-muted-foreground")}>
              {dateLabel ?? "Any dates..."}
            </p>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            disabled={{ before: new Date() }}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <div className="hidden md:block h-10 w-px bg-border" />

      {/* Guests */}
      <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
        <PopoverTrigger asChild>
          <button className="px-7 py-4 text-left">
            <p className="text-xs font-semibold text-foreground mb-0.5">Guests</p>
            <p className={cn("text-sm", totalGuests > 1 ? "text-foreground" : "text-muted-foreground")}>
              {totalGuests > 1 ? `${totalGuests} guests` : '1 guest'}
            </p>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="end">
          <Stepper label="Adults" sub="Ages 13 or above" value={adults} onChange={setAdults} min={1} />
          <Stepper label="Children" sub="Ages 2\u201312" value={children} onChange={setChildren} />
          <Stepper label="Infants" sub="Under 2" value={infants} onChange={setInfants} />
        </PopoverContent>
      </Popover>

      {/* Search button */}
      <div className="pr-3 py-2">
        <Button onClick={handleSearch} size="lg" className="h-12 rounded-full px-7 shrink-0 text-base">
          Search
        </Button>
      </div>
    </div>
  );
}
