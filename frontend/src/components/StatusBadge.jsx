import React from 'react';

export default function StatusBadge({ status, size = 'sm' }) {
  const getStyles = (st) => {
    switch (st) {
      case 'Critical Attention':
      case 'Critical':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500 animate-pulse',
        };
      case 'High Risk':
      case 'High':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
      case 'Requires Inspection':
      case 'Moderate':
        return {
          bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
          dot: 'bg-yellow-400',
        };
      case 'Operational':
      case 'Low':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'Under Maintenance':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
        };
      default:
        return {
          bg: 'bg-slate-700/30 text-slate-300 border-slate-600',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStyles(status);
  const sizeClasses = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{status || 'Unknown'}</span>
    </span>
  );
}
