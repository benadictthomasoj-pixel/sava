import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function StatusBadge({ status, size = 'sm' }) {
  const { t } = useLanguage();

  const getStyles = (st) => {
    switch (st) {
      case 'Critical Attention':
      case 'Critical':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200 font-semibold',
          dot: 'bg-red-600 animate-pulse',
        };
      case 'High Risk':
      case 'High':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
          dot: 'bg-amber-600',
        };
      case 'Requires Inspection':
      case 'Moderate':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
          dot: 'bg-amber-500',
        };
      case 'Operational':
      case 'Low':
        return {
          bg: 'bg-green-50 text-green-700 border-green-200 font-medium',
          dot: 'bg-green-600',
        };
      case 'Under Maintenance':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200 font-medium',
          dot: 'bg-sky-600',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
          dot: 'bg-slate-400',
        };
    }
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'Critical Attention':
        return t('status.criticalAttention', 'Critical Attention');
      case 'Critical':
        return t('status.critical', 'Critical');
      case 'High Risk':
        return t('status.highRisk', 'High Risk');
      case 'High':
        return t('status.high', 'High');
      case 'Requires Inspection':
        return t('status.requiresInspection', 'Requires Inspection');
      case 'Moderate':
        return t('status.moderate', 'Moderate');
      case 'Operational':
        return t('status.operational', 'Operational');
      case 'Low':
        return t('status.low', 'Low');
      case 'Under Maintenance':
        return t('status.underMaintenance', 'Under Maintenance');
      default:
        return st || t('status.unknown', 'Unknown');
    }
  };

  const config = getStyles(status);
  const sizeClasses = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}
