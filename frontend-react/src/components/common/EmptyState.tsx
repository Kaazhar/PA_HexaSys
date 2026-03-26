import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
}

export default function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="w-10 h-10 mx-auto mb-3 opacity-30">{icon}</div>
      <p>{message}</p>
    </div>
  );
}
