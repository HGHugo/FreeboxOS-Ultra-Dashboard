import React, { useMemo } from 'react';

interface SparkLineProps {
  data: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export const SparkLine: React.FC<SparkLineProps> = ({
  data,
  color = '#3b82f6',
  height = 24,
  strokeWidth = 1.5,
  className = ''
}) => {
  const path = useMemo(() => {
    if (data.length === 0) return '';

    const width = 100;
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, height]);

  const areaPath = useMemo(() => {
    if (data.length === 0) return '';

    const width = 100;
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });

    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  }, [data, height]);

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className={`w-full ${className}`}
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};