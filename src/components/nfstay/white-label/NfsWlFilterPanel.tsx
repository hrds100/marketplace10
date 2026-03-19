import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';

export interface NfsWlSearchFilters {
  query: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  minGuests: string;
}

interface NfsWlFilterPanelProps {
  filters: NfsWlSearchFilters;
  onFiltersChange: (filters: NfsWlSearchFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  loading: boolean;
  resultCount: number;
}

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'loft', label: 'Loft' },
  { value: 'other', label: 'Other' },
];

function hasActiveFilters(filters: NfsWlSearchFilters): boolean {
  return !!(
    filters.query ||
    filters.propertyType ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minGuests
  );
}

export default function NfsWlFilterPanel({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  loading,
  resultCount,
}: NfsWlFilterPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isActive = hasActiveFilters(filters);

  const update = (key: keyof NfsWlSearchFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch();
    setSheetOpen(false);
  };

  const handleClear = () => {
    onClear();
    setSheetOpen(false);
  };

  // Shared filter fields (used in both desktop and mobile)
  const filterFields = (
    <>
      {/* Property type */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground md:sr-only">
          Property Type
        </label>
        <Select
          value={filters.propertyType}
          onValueChange={(v) => update('propertyType', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((t) => (
              <SelectItem key={t.value || 'all'} value={t.value || 'all'}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min price */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground md:sr-only">
          Min Price
        </label>
        <Input
          type="number"
          placeholder="Min £"
          value={filters.minPrice}
          onChange={(e) => update('minPrice', e.target.value)}
          className="w-full md:w-[100px]"
          min={0}
        />
      </div>

      {/* Max price */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground md:sr-only">
          Max Price
        </label>
        <Input
          type="number"
          placeholder="Max £"
          value={filters.maxPrice}
          onChange={(e) => update('maxPrice', e.target.value)}
          className="w-full md:w-[100px]"
          min={0}
        />
      </div>

      {/* Guests */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground md:sr-only">
          Guests
        </label>
        <Input
          type="number"
          placeholder="Guests"
          value={filters.minGuests}
          onChange={(e) => update('minGuests', e.target.value)}
          className="w-full md:w-[80px]"
          min={1}
        />
      </div>
    </>
  );

  return (
    <div className="border-b border-border/40 bg-white dark:bg-card">
      <div className="mx-auto max-w-7xl px-4 py-3">
        {/* Desktop filters */}
        <form
          onSubmit={handleSubmit}
          className="hidden items-end gap-3 md:flex"
        >
          {/* Search input */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search location, name..."
              value={filters.query}
              onChange={(e) => update('query', e.target.value)}
              className="pl-9"
            />
          </div>

          {filterFields}

          <Button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>

          {isActive && (
            <button
              type="button"
              onClick={handleClear}
              className="pb-2.5 text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear
            </button>
          )}
        </form>

        {/* Mobile filters */}
        <div className="flex items-center gap-2 md:hidden">
          <form onSubmit={handleSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.query}
              onChange={(e) => update('query', e.target.value)}
              className="pl-9"
            />
          </form>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                {isActive && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription className="sr-only">
                  Filter search results by property type, price, and guests
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                {/* Search (also in sheet for mobile clarity) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search location, name..."
                      value={filters.query}
                      onChange={(e) => update('query', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {filterFields}

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                    {loading ? 'Searching...' : 'Apply'}
                  </Button>
                  {isActive && (
                    <SheetClose asChild>
                      <Button variant="ghost" onClick={handleClear}>
                        <X className="mr-1 h-4 w-4" />
                        Clear
                      </Button>
                    </SheetClose>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Result count */}
        <p className="mt-2 text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? 'property' : 'properties'} available
        </p>
      </div>
    </div>
  );
}
