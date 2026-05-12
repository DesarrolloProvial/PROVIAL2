import { useState, useRef, useEffect } from 'react';
import {
  format, parseISO, isValid, isToday, isSameDay, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, isBefore, isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (v: string) => void;
  label?: string;
  min?: string;            // YYYY-MM-DD
  max?: string;            // YYYY-MM-DD
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

function toDate(s: string): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

function toYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export default function CalendarPicker({
  value, onChange, label, min, max, required, className = '', placeholder = 'Seleccionar fecha',
}: CalendarPickerProps) {
  const selected = toDate(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [value]);

  const minDate = toDate(min ?? '');
  const maxDate = toDate(max ?? '');

  const isDisabled = (d: Date) => {
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    return false;
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end:   endOfWeek(endOfMonth(viewMonth)),
  });

  const select = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toYMD(d));
    setOpen(false);
  };

  const displayValue = selected
    ? format(selected, "EEEE d 'de' MMMM yyyy", { locale: es })
    : '';

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className="label">{label}{required && ' *'}</label>}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field flex items-center gap-2 w-full text-left"
      >
        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
        <span className={displayValue ? 'capitalize' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-[280px]">
          {/* Header del mes */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>

            <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize text-sm">
              {format(viewMonth, "MMMM yyyy", { locale: es })}
            </span>

            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Cabecera de días */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map(d => {
              const isOtherMonth = !isSameMonth(d, viewMonth);
              const isSelected = selected ? isSameDay(d, selected) : false;
              const isTodayDay = isToday(d);
              const disabled = isDisabled(d);

              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(d)}
                  className={[
                    'w-full aspect-square flex items-center justify-center text-sm rounded-lg transition-all',
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : isTodayDay
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : isOtherMonth
                          ? 'text-gray-300 dark:text-gray-600'
                          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
                    disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          {/* Botón "Hoy" */}
          <button
            type="button"
            onClick={() => { setViewMonth(new Date()); select(new Date()); }}
            className="mt-3 w-full text-xs text-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            Hoy
          </button>
        </div>
      )}
    </div>
  );
}
