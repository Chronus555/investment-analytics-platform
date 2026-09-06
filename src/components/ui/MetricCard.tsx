import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number | string; // Optional change (decimal or formatted string)
  changeType?: 'positive' | 'negative' | 'neutral';
  changeLabel?: string;
  subtext?: string;
  helperText?: string;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  changeType,
  changeLabel,
  subtext,
  helperText,
  trend,
  accentColor,
  className = '',
}) => {
  const isPositive =
    changeType === 'positive' ||
    (typeof change === 'number' ? change > 0 : trend === 'up');
  const isNegative =
    changeType === 'negative' ||
    (typeof change === 'number' ? change < 0 : trend === 'down');
  const bottomText = helperText || subtext || changeLabel;

  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white p-4.5 relative overflow-hidden transition hover:border-slate-300 hover:shadow-sm ${className}`}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wider uppercase text-slate-500">
          {label}
        </span>
        {change !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-medium px-1.5 py-0.5 rounded ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isNegative
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isPositive && <ArrowUpRight className="h-3 w-3" />}
            {isNegative && <ArrowDownRight className="h-3 w-3" />}
            {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
            {typeof change === 'number' ? `${Math.abs(change * 100).toFixed(1)}%` : change}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {value}
        </span>
      </div>

      {bottomText && (
        <p className="mt-1 text-[11px] text-slate-500 truncate leading-tight">
          {bottomText}
        </p>
      )}
    </div>
  );
};