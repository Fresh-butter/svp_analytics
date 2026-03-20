import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  label: string;
  value: string; // 24h format "HH:mm"
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * Converts 24h "HH:mm" to { hour12, minute, period }.
 */
function parse24(time: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = (time || '09:00').split(':').map(Number);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute: m, period };
}

/**
 * Converts 12h parts back to 24h "HH:mm".
 */
function to24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange, required }) => {
  const { hour12, minute, period } = parse24(value);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const setHour = (h: number) => onChange(to24(h, minute, period));
  const setMinute = (m: number) => onChange(to24(hour12, m, period));
  const setPeriod = (p: 'AM' | 'PM') => onChange(to24(hour12, minute, p));

  // Round minute to nearest 5 for display, but keep actual value
  const displayMinute = Math.round(minute / 5) * 5;
  const displayTime = `${hour12}:${String(displayMinute >= 60 ? 0 : displayMinute).padStart(2, '0')} ${period}`;

  return (
    <div ref={ref} className="space-y-1.5 relative">
      <label className="text-sm font-medium text-textMuted">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all flex items-center justify-between"
      >
        <span>{displayTime}</span>
        <Clock size={16} className="text-textMuted" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-surface border border-surfaceHighlight rounded-lg shadow-2xl p-3 space-y-3">
          {/* Hours */}
          <div>
            <span className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">Hour</span>
            <div className="grid grid-cols-6 gap-1">
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={`text-sm py-1.5 rounded-md transition-colors ${
                    h === hour12
                      ? 'bg-primary text-white font-medium'
                      : 'text-text hover:bg-surfaceHighlight'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div>
            <span className="text-xs font-medium text-textMuted uppercase tracking-wider block mb-1.5">Minute</span>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={`text-sm py-1.5 rounded-md transition-colors ${
                    m === displayMinute
                      ? 'bg-primary text-white font-medium'
                      : 'text-text hover:bg-surfaceHighlight'
                  }`}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* AM / PM */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPeriod('AM')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                period === 'AM'
                  ? 'bg-primary text-white'
                  : 'bg-surfaceHighlight text-text hover:bg-surfaceHighlight/80'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setPeriod('PM')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                period === 'PM'
                  ? 'bg-primary text-white'
                  : 'bg-surfaceHighlight text-text hover:bg-surfaceHighlight/80'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
