import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children?: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  onClick,
  variant = 'default',
  size = 'sm',
  disabled = false,
  className = ''
}) => {
  const baseClasses = 'flex items-center gap-1.5 rounded-lg border transition-colors font-medium';

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
  };

  const variantClasses = {
    default: 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white',
    primary: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700',
    danger: 'bg-[#1a1a1a] border-gray-700 text-gray-300 hover:bg-red-900/20 hover:text-red-400',
    ghost: 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : 16} />}
      {children}
    </button>
  );
};

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 text-xs bg-[#1a1a1a] border border-gray-700 hover:bg-gray-800 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
  >
    <Icon size={12} />
    {label}
  </button>
);