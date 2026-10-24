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
    brand: 'text-green-700 bg-green-50 border-green-200',
    rose: 'text-red-700 bg-red-50 border-red-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    emerald: 'text-green-700 bg-green-50 border-green-200',
  };

  const accent = colorMap[highlightColor] || colorMap.brand;

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  trendPositive
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 pt-1">
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
