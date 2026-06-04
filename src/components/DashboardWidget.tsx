import { ReactNode } from 'react';
import { Card, CardContent } from './Card';
import { LucideIcon } from 'lucide-react';

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  children?: ReactNode;
}

export default function DashboardWidget({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  children
}: DashboardWidgetProps) {
  return (
    <Card className="hover:shadow-md transition-all active:scale-[0.99]">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xl sm:text-2xl font-bold leading-tight break-words">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
              )}
              {trend && (
                <div className={`flex items-center text-xs font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="mr-1 text-sm">
                    {trend.isPositive ? '↗' : '↘'}
                  </span>
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
          <div className={`p-2 sm:p-3 rounded-full bg-muted ${iconColor} flex-shrink-0`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
        {children && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
