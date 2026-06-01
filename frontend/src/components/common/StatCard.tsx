import { ReactNode } from 'react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; positive: boolean };
  color?: 'green' | 'blue' | 'coral' | 'purple';
  subtitle?: string;
}

export default function StatCard({ title, value, icon, trend, color = 'green', subtitle }: StatCardProps) {
  const colorClasses = {
    green: 'bg-primary-50 text-primary-500',
    blue: 'bg-blue-50 text-blue-500',
    coral: 'bg-coral-400/10 text-coral-500',
    purple: 'bg-purple-50 text-purple-500',
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          {icon}
        </div>
        {trend && (
          <span className={clsx(
            'text-sm font-medium px-2 py-1 rounded-full',
            trend.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
