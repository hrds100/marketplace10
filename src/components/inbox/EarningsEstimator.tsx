import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  monthlyRent: number;
  bedrooms: number;
  propertyType: string;
  propertyProfit?: number;
  onEstimatedProfitChange?: (profit: number) => void;
}

export default function EarningsEstimator({ monthlyRent, bedrooms, propertyType, propertyProfit, onEstimatedProfitChange }: Props) {
  const [nightsBooked, setNightsBooked] = useState(20);
  // Seed nightlyRate so Est. monthly profit matches the property's real profit on first render
  const [nightlyRate, setNightlyRate] = useState(() => {
    if (propertyProfit && propertyProfit > 0 && monthlyRent > 0) {
      const derived = Math.round((monthlyRent + propertyProfit) / 20);
      return Math.max(20, Math.min(500, derived));
    }
    return 85;
  });
  const [extraCosts, setExtraCosts] = useState(0);
  const [showExtraCosts, setShowExtraCosts] = useState(false);

  const estimatedRevenue = nightsBooked * nightlyRate;
  const estimatedProfit = estimatedRevenue - monthlyRent - extraCosts;
  const isProfitable = estimatedProfit >= 0;
  const sliderPercent = ((nightsBooked - 5) / 25) * 100;

  useEffect(() => {
    onEstimatedProfitChange?.(estimatedProfit);
  }, [estimatedProfit, onEstimatedProfitChange]);

  const summary = [bedrooms > 0 ? `${bedrooms}-bed` : null, propertyType].filter(Boolean).join(' ') || 'Property';

  return (
    <div data-feature="CRM_INBOX__EARNINGS_ESTIMATOR" className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Earnings Estimator</span>
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{summary}</span>
      </div>

      {/* Nights booked slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Nights booked / month</span>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{nightsBooked} nights</span>
        </div>
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={nightsBooked}
          onChange={e => setNightsBooked(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>5 nights</span>
          <span>30 nights</span>
        </div>
      </div>

      {/* Nightly rate input */}
      <div>
        <label className="text-xs text-gray-500 block mb-1.5">Nightly average rate</label>
        <div className="flex items-center border border-gray-200 rounded-xl px-3 h-10 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-100 transition">
          <span className="text-sm text-gray-400 mr-1">£</span>
          <input
            type="number"
            min={20}
            max={500}
            step={5}
            value={nightlyRate}
            onChange={e => setNightlyRate(parseInt(e.target.value) || 0)}
            className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Extra costs (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowExtraCosts(!showExtraCosts)}
          className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
        >
          {showExtraCosts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Extra costs
        </button>
        {showExtraCosts && (
          <div className="mt-2">
            <label className="text-xs text-gray-500 block mb-1.5">Monthly extras (cleaning, bills...)</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-3 h-10 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-100 transition">
              <span className="text-sm text-gray-400 mr-1">£</span>
              <input
                type="number"
                min={0}
                max={5000}
                step={10}
                value={extraCosts}
                onChange={e => setExtraCosts(parseInt(e.target.value) || 0)}
                className="flex-1 bg-transparent text-sm text-gray-900 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary rows */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Nightly rate</span>
          <span className="text-xs font-medium text-gray-700">£{nightlyRate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Est. revenue</span>
          <span className="text-xs font-medium text-gray-700">£{estimatedRevenue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Monthly rent</span>
          <span className="text-xs font-medium text-red-500">−£{monthlyRent.toLocaleString()}</span>
        </div>
        {extraCosts > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Extra costs</span>
            <span className="text-xs font-medium text-red-500">−£{extraCosts.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Profit highlight */}
      <div className={`rounded-xl px-3 py-2.5 flex justify-between items-center ${isProfitable ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <span className={`text-sm font-semibold ${isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>Est. monthly profit</span>
        <span className={`text-lg font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
          {isProfitable ? '' : '−'}£{Math.abs(estimatedProfit).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
