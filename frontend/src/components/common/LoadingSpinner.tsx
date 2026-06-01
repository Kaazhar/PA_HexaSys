interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export default function LoadingSpinner({ size = 'md', color = 'primary' }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const colors = { primary: 'border-primary-500', white: 'border-white' };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizes[size]} border-2 ${colors[color as keyof typeof colors] || 'border-primary-500'} border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );
}
