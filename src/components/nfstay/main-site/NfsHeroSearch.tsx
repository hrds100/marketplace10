// Exact port of VPS Hero.tsx search widget
// Location + Date range + Guest selector → navigates to /search
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, CircleUserRound, CalendarDays, X } from 'lucide-react';
import { format } from 'date-fns';
import { NfsGuestSelect } from './NfsGuestSelect';
import { NfsDateRangePicker } from './NfsDateRangePicker';

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export default function NfsHeroSearch() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState<GuestCounts>({ adults: 1, children: 0, infants: 0, pets: 0 });
  const [activeDropdown, setActiveDropdown] = useState<'location' | 'date' | 'guest' | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setActiveDropdown(null);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeDropdown && heroRef.current && !heroRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const formatDateRange = () => {
    if (!startDate) return 'Any dates';
    if (!endDate) return 'Select end date';
    return `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`;
  };

  const formatGuests = () => {
    const total = guests.adults + guests.children;
    const parts: string[] = [];
    if (total > 0) parts.push(`${total} guest${total !== 1 ? 's' : ''}`);
    if (guests.infants > 0) parts.push(`${guests.infants} infant${guests.infants !== 1 ? 's' : ''}`);
    if (guests.pets > 0) parts.push(`${guests.pets} pet${guests.pets !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') : 'Any guests';
  };

  const handleSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('query', location.trim());
    if (startDate && endDate) {
      params.set('dates', `${format(startDate, 'yyyy-MM-dd')},${format(endDate, 'yyyy-MM-dd')}`);
    }
    params.set('adults', String(guests.adults));
    if (guests.children > 0) params.set('children', String(guests.children));
    if (guests.infants > 0) params.set('infants', String(guests.infants));
    if (guests.pets > 0) params.set('pets', String(guests.pets));
    navigate(`/search?${params.toString()}`);
  };

  const toggle = (e: React.MouseEvent, type: 'location' | 'date' | 'guest') => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === type ? null : type);
  };

  const isActive = activeDropdown !== null;

  return (
    <div
      ref={heroRef}
      className={`border-b border-gray-200 h-auto pb-8 md:pb-14 relative`}
    >
      <section className="flex items-center justify-center px-2">
        <div className="w-full max-w-[500px] md:max-w-[1000px] h-auto mt-4 md:mt-16">
          {/* Headline */}
          <div className="text-center px-4 py-2 mb-4 md:mb-6">
            <h1 className="text-3xl md:text-5xl font-semibold">Host, Find Stays,</h1>
            <h1 className="text-3xl md:text-5xl font-semibold mt-4">Book Direct and Save</h1>
            <p className="text-[#9d9da1] mt-3 md:mt-6 text-sm md:text-base">
              The comfort of your own home in the heart of the city.
            </p>
          </div>

          {/* Search widget */}
          <div
            className={`w-auto border border-[#e6e6eb] lg:rounded-full rounded-3xl flex flex-col lg:flex-row max-md:gap-4 justify-between lg:p-2 md:p-8 p-5 mx-auto relative transition-all duration-300 z-30 ${
              isActive
                ? 'shadow-2xl shadow-purple-500/10 ring-1 ring-purple-200/50 bg-white backdrop-blur-sm'
                : 'shadow-sm hover:shadow-md bg-white'
            }`}
          >
            {/* ── Location ── */}
            <div className="flex items-center flex-1 p-2 border-b lg:border-none relative lg:min-w-[200px] lg:max-w-[300px]">
              <div className="flex items-center flex-1 gap-2 min-w-0">
                <MapPin className="flex-shrink-0 text-black w-5 h-5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setActiveDropdown('location'); }}
                  onFocus={() => setActiveDropdown('location')}
                  placeholder="Find Location"
                  className="outline-none border-none w-full placeholder:text-black text-sm bg-transparent"
                />
                <ChevronDown className="text-black w-4 h-4 flex-shrink-0" />
              </div>
              <div className="h-7 w-px bg-[#e6e6eb] hidden lg:block absolute right-0" />

              {/* Location suggestions — shows current typed value as option */}
              {activeDropdown === 'location' && location.trim() && (
                <div className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-[400px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2">
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}
                  >
                    <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>{location}</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Dates ── */}
            <div
              className="flex flex-1 justify-between items-center mt-5 lg:mt-0 p-2 gap-2 cursor-pointer border-b lg:border-none relative lg:min-w-[250px] lg:max-w-[350px]"
              onClick={(e) => toggle(e, 'date')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') toggle(e as unknown as React.MouseEvent, 'date'); }}
            >
              <div className="flex flex-row gap-2 min-w-0">
                <CalendarDays className="flex-shrink-0 text-black w-5 h-5" />
                <span className="text-nowrap overflow-hidden text-ellipsis text-sm">{formatDateRange()}</span>
              </div>
              <ChevronDown className={`ml-2 flex-shrink-0 transition-transform w-4 h-4 ${activeDropdown === 'date' ? 'rotate-180' : ''}`} />
              <div className="h-7 w-px bg-[#e6e6eb] hidden lg:block absolute right-0" />

              {activeDropdown === 'date' && (
                <div
                  className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-[700px] sm:w-[700px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <NfsDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                    onApply={() => setActiveDropdown(null)}
                  />
                </div>
              )}
            </div>

            {/* ── Guests ── */}
            <div
              className="flex flex-1 justify-between items-center p-2 mt-5 lg:mt-0 gap-2 cursor-pointer relative lg:min-w-[180px] lg:max-w-[250px]"
              onClick={(e) => toggle(e, 'guest')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') toggle(e as unknown as React.MouseEvent, 'guest'); }}
            >
              <div className="flex flex-row gap-2 min-w-0">
                <CircleUserRound className="flex-shrink-0 text-black w-5 h-5" />
                <span className="text-nowrap overflow-hidden text-ellipsis text-sm">{formatGuests()}</span>
              </div>
              <ChevronDown className={`ml-2 flex-shrink-0 transition-transform w-4 h-4 ${activeDropdown === 'guest' ? 'rotate-180' : ''}`} />

              {activeDropdown === 'guest' && (
                <div
                  className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-[350px] min-w-[280px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <NfsGuestSelect
                    initialValues={guests}
                    onApply={(g) => setGuests(g)}
                    onClose={() => setActiveDropdown(null)}
                  />
                </div>
              )}
            </div>

            {/* ── Search button ── */}
            <button
              onClick={handleSearch}
              className="w-auto md:w-[140px] h-[50px] mt-4 lg:mt-0 bg-gradient-to-r from-purple-600 to-teal-500 text-nowrap text-white font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity text-[14px] flex items-center justify-center"
            >
              Explore Properties
            </button>
          </div>

          {/* Mobile overlay */}
          {isMobile && activeDropdown && (
            <div
              className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 backdrop-blur-md z-20 animate-in fade-in duration-300"
              onClick={() => setActiveDropdown(null)}
            >
              <div className="absolute top-4 right-4">
                <button
                  className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-all duration-200"
                  onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          )}

          {/* Desktop overlay */}
          {!isMobile && activeDropdown && (
            <div
              className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 backdrop-blur-sm z-20 animate-in fade-in duration-500"
              onClick={() => setActiveDropdown(null)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
