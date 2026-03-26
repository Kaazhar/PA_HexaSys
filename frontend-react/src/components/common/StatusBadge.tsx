import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  config: Record<string, { label: string; class: string }>;
}

export default function StatusBadge({ status, config }: StatusBadgeProps) {
  const cfg = config[status];
  return (
    <span className={clsx('badge', cfg?.class || 'badge-gray')}>
      {cfg?.label || status}
    </span>
  );
}
