// 2-month date range picker — matches VPS DateRangeCalendar visual design
// Uses date-fns (no luxon dependency)
import { useState, useCallback, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isBefore,
  isAfter,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
} from 'date-fns';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
  onApply: () => void;
}

export function NfsDateRangePicker({ startDate, endDate, onDateChange, onApply }: Props) {
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState(today);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);

  const daysForMonth = useCallback((monthDate: Date) => {
    return eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
  }, []);

  const handleDayClick = (day: Date) => {
    if (isBefore(day, today)) return;

    if (!startDate || (startDate && endDate)) {
      onDateChange(day, null);
    } else {
      if (isSameDay(day, startDate)) {
        onDateChange(null, null);
      } else if (isBefore(day, startDate)) {
        onDateChange(day, startDate);
      } else {
        onDateChange(startDate, day);
      }
    }
  };

  const isInRange = (day: Date) => {
    const effectiveEnd = endDate ?? hoverDate;
    if (!startDate || !effectiveEnd) return false;
    const lo = isBefore(startDate, effectiveEnd) ? startDate : effectiveEnd;
    const hi = isBefore(startDate, effectiveEnd) ? effectiveEnd : startDate;
    return isAfter(day, lo) && isBefore(day, hi);
  };

  const isStart = (day: Date) => startDate ? isSameDay(day, startDate) : false;
  const isEnd = (day: Date) => endDate ? isSameDay(day, endDate) : false;
  const isSelected = (day: Date) => isStart(day) || isEnd(day) || isInRange(day);
  const isDisabled = (day: Date) => isBefore(day, today);

  const renderMonth = (monthDate: Date) => {
    const days = daysForMonth(monthDate);
    const firstDayIndex = getDay(days[0]); // 0=Sun … 6=Sat

    return (
      <div className="w-full min-w-0">
        {/* Month header */}
        <p className="text-base font-semibold text-gray-900 text-center mb-3">
          {format(monthDate, 'LLLL yyyy')}
        </p>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-[13px] font-medium pb-2 text-center text-gray-700">
              {d.charAt(0)}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0">
          {/* offset for first day */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`off-${i}`} className="h-10" />
          ))}

          {days.map((day) => {
            const sel = isSelected(day);
            const start = isStart(day);
            const end = isEnd(day);
            const middle = sel && !start && !end;
            const disabled = isDisabled(day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className="relative h-10"
                onMouseEnter={() => { if (startDate && !endDate) setHoverDate(day); }}
                onMouseLeave={() => setHoverDate(null)}
              >
                {/* Range background strip */}
                {sel && (
                  <div
                    className={cn(
                      'absolute inset-y-1',
                      start && !end && 'left-1/2 right-0 bg-purple-100',
                      end && !start && 'left-0 right-1/2 bg-purple-100',
                      middle && 'inset-x-0 bg-purple-100',
                      start && end && 'inset-x-0',
                    )}
                  />
                )}

                <button
                  type="button"
                  onClick={() => !disabled && handleDayClick(day)}
                  className={cn(
                    'relative w-full h-full text-sm font-medium transition-all duration-150 z-10 rounded-full flex items-center justify-center',
                    disabled && 'cursor-not-allowed opacity-40 text-gray-400 line-through',
                    isToday && !sel && !disabled && 'text-purple-600 font-semibold',
                    (start || end) && 'bg-purple-600 text-white font-semibold shadow-lg hover:bg-purple-700',
                    middle && 'text-purple-700 font-medium',
                    !disabled && !sel && 'hover:bg-blue-50 hover:text-blue-600',
                  )}
                >
                  {format(day, 'd')}
                  {isToday && !sel && !disabled && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const formatLabel = (d: Date) => format(d, 'MMM d');

  return (
    <div
      className="relative w-full max-w-sm md:max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 md:p-6 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-2 hover:bg-gray-100 rounded-full transition-all hover:scale-110 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div className="hidden md:flex gap-16">
          <span className="text-base font-semibold text-gray-900">
            {format(currentMonth, 'LLLL yyyy')}
          </span>
          <span className="text-base font-semibold text-gray-900">
            {format(nextMonth, 'LLLL yyyy')}
          </span>
        </div>
        <div className="md:hidden text-base font-semibold text-gray-900">
          {format(currentMonth, 'LLLL yyyy')}
        </div>

        <button
          type="button"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-2 hover:bg-gray-100 rounded-full transition-all hover:scale-110 active:scale-95"
        >
          <ArrowRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Months */}
      <div className="flex gap-8 md:gap-12">
        {renderMonth(currentMonth)}
        <div className="hidden md:block">{renderMonth(nextMonth)}</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4">
        <button
          type="button"
          onClick={() => onDateChange(null, null)}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Clear Dates
        </button>
        <div className="flex items-center gap-4">
          {startDate && endDate && (
            <span className="text-sm text-gray-600">
              {formatLabel(startDate)} – {formatLabel(endDate)}
            </span>
          )}
          <button
            type="button"
            onClick={onApply}
            disabled={!startDate || !endDate}
            className={cn(
              'px-8 py-3 rounded-full text-sm font-semibold transition-all',
              startDate && endDate
                ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-lg hover:shadow-xl hover:opacity-90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed',
            )}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
