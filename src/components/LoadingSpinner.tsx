import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <Loader2
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn('animate-spin text-primary', className)}
    />
  );
}

export function FullPageLoading() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center">
      <LoadingSpinner size={48} />
    </div>
  );
}
