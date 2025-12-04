import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  headerColor?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  actions,
  headerColor = 'text-gray-200'
}) => (
  <div className={`bg-[#121212] rounded-xl border border-gray-800 p-5 flex flex-col ${className}`}>
    <div className="flex justify-between items-center mb-4">
      <h3 className={`font-semibold text-lg ${headerColor}`}>{title}</h3>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
    <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
  </div>
);