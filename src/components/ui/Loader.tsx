import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`animate-spin text-gray-400 ${sizeClasses[size]} ${className}`} />
  );
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message }) => (
  <div className="absolute inset-0 bg-[#121212]/80 flex items-center justify-center z-10 rounded-xl">
    <div className="flex flex-col items-center gap-2">
      <Loader size="lg" />
      {message && <span className="text-sm text-gray-400">{message}</span>}
    </div>
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-800 rounded ${className}`} />
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-[#121212] rounded-xl border border-gray-800 p-5">
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-20" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);