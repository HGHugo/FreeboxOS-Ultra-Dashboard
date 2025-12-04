import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md'
}) => {
  const sizeClasses = size === 'sm'
    ? 'w-8 h-4'
    : 'w-10 h-5';

  const dotSizeClasses = size === 'sm'
    ? 'w-3 h-3'
    : 'w-4 h-4';

  const translateClass = size === 'sm'
    ? 'translate-x-4'
    : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center rounded-full p-0.5 transition-colors
        ${checked ? 'bg-emerald-500/20' : 'bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${sizeClasses}
      `}
    >
      <span
        className={`
          ${dotSizeClasses} rounded-full shadow-sm transition-transform
          ${checked ? `${translateClass} bg-emerald-500` : 'translate-x-0 bg-gray-500'}
        `}
      />
    </button>
  );
};