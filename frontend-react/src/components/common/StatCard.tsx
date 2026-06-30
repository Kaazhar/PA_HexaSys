import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: never;
  trend?: { value: number; positive: boolean };
  color?: 'green' | 'blue' | 'coral' | 'purple';
  subtitle?: string;
}

export default function StatCard({ title, value, trend, color = 'green', subtitle }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    green: 'text-primary-600',
    blue: 'text-blue-600',
    coral: 'text-coral-500',
    purple: 'text-purple-600',
  };

  return (
    <div className="card">
      {trend && (
        <div className="flex justify-end mb-2">
          <span className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
      <p className={clsx('text-2xl font-bold', colorClasses[color])}>{value}</p>
      <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
