import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  const variantClasses = {
    default: 'bg-gray-800 text-gray-400',
    success: 'bg-green-500/10 text-green-400',
    warning: 'bg-orange-500/10 text-orange-400',
    error: 'bg-red-500/10 text-red-400',
    info: 'bg-blue-500/10 text-blue-400'
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  icon: React.ReactNode;
  value: string;
  label?: string;
  color?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  icon,
  value,
  label,
  color = 'text-gray-400'
}) => (
  <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-lg border border-gray-700 whitespace-nowrap">
    {label && <span className="text-xs text-gray-500 mr-1">{label}</span>}
    <span className={color}>{icon}</span>
    <span className="text-sm font-medium text-gray-200">{value}</span>
  </div>
);