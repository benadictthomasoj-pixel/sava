import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  highlightColor = 'brand',
  onClick,
}) {
  const colorMap = {
    brand: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40',
    rose: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
    amber: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  };

  const accent = colorMap[highlightColor] || colorMap.brand;

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 shadow-lg ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  trendPositive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 pt-1">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${accent}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
