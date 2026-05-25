import { useEffect, useState } from "react";
import type { BrrrrFloorplan } from "../types";

type Props = { floorplans: BrrrrFloorplan[] };

export function FloorPlanViewer({ floorplans }: Props) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [floorplans]);

  if (floorplans.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        No floor plan available for this property.
      </div>
    );
  }

  const total = floorplans.length;
  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <div className="relative h-full w-full bg-slate-50 flex items-center justify-center">
      <img
        src={floorplans[idx].image_url}
        alt={`Floor plan ${idx + 1} of ${total}`}
        className="max-h-full max-w-full object-contain"
      />
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-8 h-8"
            aria-label="Previous floor plan"
          >‹</button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-8 h-8"
            aria-label="Next floor plan"
          >›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {floorplans.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Floor plan ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full ${i === idx ? "bg-emerald-500" : "bg-white/70 border border-slate-300"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
