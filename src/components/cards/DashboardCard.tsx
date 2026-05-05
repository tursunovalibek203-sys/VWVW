import { LucideIcon } from 'lucide-react';
import { latinToCyrillic } from '../../lib/transliterator';
import { formatCurrency } from '../../lib/utils';

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  mainValue: string | number;
  subValue?: string | number;
  variant: 'success' | 'danger' | 'info' | 'warning' | 'neutral';
  currency?: string;
}

const variantStyles = {
  success: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    mainText: 'text-emerald-700',
    subText: 'text-emerald-500',
  },
  danger: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    mainText: 'text-rose-700',
    subText: 'text-rose-500',
  },
  info: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    mainText: 'text-gray-900',
    subText: 'text-gray-500',
  },
  warning: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    mainText: 'text-amber-700',
    subText: 'text-amber-500',
  },
  neutral: {
    bg: 'bg-white',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    mainText: 'text-gray-900',
    subText: 'text-gray-500',
  },
};

export default function DashboardCard({
  icon: Icon,
  title,
  mainValue,
  subValue,
  variant = 'neutral',
  currency,
}: DashboardCardProps) {
  const styles = variantStyles[variant];

  const formatValue = (value: string | number, curr?: string) => {
    if (typeof value === 'number') {
      return formatCurrency(value, curr || 'USD');
    }
    return value;
  };

  return (
    <div className={`${styles.bg} rounded-2xl p-4 shadow-sm border border-gray-100/50`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 ${styles.iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          {latinToCyrillic(title)}
        </span>
      </div>
      <div className="space-y-0.5">
        <p className={`text-2xl font-bold ${styles.mainText}`}>
          {formatValue(mainValue, currency)}
        </p>
        {subValue && (
          <p className={`text-xs ${styles.subText}`}>
            {typeof subValue === 'number' ? subValue.toLocaleString() : subValue}
          </p>
        )}
      </div>
    </div>
  );
}
