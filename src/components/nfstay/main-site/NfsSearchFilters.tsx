import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NfsSearchFiltersProps {
  resultCount: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeType: string;
  onTypeChange: (type: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  bedrooms: number;
  onBedroomsChange: (n: number) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const typeOptions = [
  'All', 'Entire home', 'Apartment', 'Villa', 'Castle', 'Cabin',
  'Boat', 'Treehouse', 'Beach house', 'Mountain',
];

export function NfsSearchFilters({
  resultCount, sortBy, onSortChange, showFilters, onToggleFilters,
  activeType, onTypeChange, priceMin, priceMax, onPriceMinChange,
  onPriceMaxChange, bedrooms, onBedroomsChange, hasFilters, onClearFilters,
}: NfsSearchFiltersProps) {
  return (
    <div data-feature="BOOKING_NFSTAY__MAIN_SITE" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground font-semibold">{resultCount}+ results</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <span className="text-xs text-muted-foreground px-3">Sort by:</span>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-9 w-[120px] text-xs border-0 border-l border-border rounded-none shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevant">Relevant</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-lg" onClick={onToggleFilters}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasFilters && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive gap-1" onClick={onClearFilters}>
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Type:</span>
            <Select value={activeType} onValueChange={onTypeChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Price / night:</span>
            <div className="flex items-center gap-1">
              <input type="number" placeholder="Min" value={priceMin} onChange={(e) => onPriceMinChange(e.target.value)}
                className="w-20 h-8 px-2 text-xs border border-input rounded-md bg-card outline-none focus:border-primary" />
              <span className="text-muted-foreground">–</span>
              <input type="number" placeholder="Max" value={priceMax} onChange={(e) => onPriceMaxChange(e.target.value)}
                className="w-20 h-8 px-2 text-xs border border-input rounded-md bg-card outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Bedrooms:</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => onBedroomsChange(n)}
                  className={`w-8 h-8 rounded-md text-xs font-medium border transition ${
                    bedrooms === n ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'
                  }`}>
                  {n === 0 ? 'Any' : n === 5 ? '5+' : n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
