import { MapPin } from "lucide-react";
import type { MockProperty } from "@/data/nfstay/mock-properties";
import { CURRENCIES } from "@/lib/nfstay/constants";

interface NfsSearchMapProps {
  properties: MockProperty[];
}

export function NfsSearchMap({ properties }: NfsSearchMapProps) {
  return (
    <div className="relative w-full h-full bg-muted overflow-hidden">
      {/* Placeholder map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-secondary opacity-60" />

      {/* Search this area button */}
      <button className="absolute top-4 right-4 z-10 bg-card text-foreground text-xs font-medium px-4 py-2 rounded-lg border border-border shadow-sm hover:shadow-md transition">
        Search this area
      </button>

      {/* Price markers scattered on the map */}
      <div className="absolute inset-0">
        {properties.slice(0, 12).map((p, i) => {
          const currency = CURRENCIES.find(c => c.code === p.base_rate_currency);
          const top = 12 + ((i * 37 + 13) % 72);
          const left = 8 + ((i * 53 + 7) % 78);
          return (
            <div
              key={p.id}
              className="absolute group cursor-pointer"
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              <div className="bg-card text-foreground text-xs font-semibold px-2.5 py-1.5 rounded-full border border-border shadow-sm hover:bg-foreground hover:text-background transition whitespace-nowrap">
                {currency?.symbol}{p.base_rate_amount}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center attribution */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Map placeholder &ndash; requires Google Maps API
      </div>
    </div>
  );
}
