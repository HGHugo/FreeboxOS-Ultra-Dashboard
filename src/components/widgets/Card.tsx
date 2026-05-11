import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  headerColor?: string;
  onTitleClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  actions,
  headerColor = 'text-gray-200',
  onTitleClick
}) => (
  <div className={`bg-[#121212] rounded-xl border border-gray-800 p-4 sm:p-5 flex flex-col ${className}`}>
    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
      {onTitleClick ? (
        <h3
          className={`font-semibold text-base sm:text-lg ${headerColor} cursor-pointer hover:text-blue-400 transition-colors`}
          onClick={onTitleClick}
        >
          {title}
        </h3>
      ) : (
        <h3 className={`font-semibold text-base sm:text-lg ${headerColor}`}>{title}</h3>
      )}
      {actions && <div>{actions}</div>}
    </div>
    <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
  </div>
);