import React from 'react';
import type { NetworkStat } from '../../types';

interface BarChartProps {
  data: NetworkStat[];
  dataKey: 'download' | 'upload';
  color: string;
  title: string;
  currentValue: string;
  unit: string;
  trend: 'up' | 'down';
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  color,
  title,
  currentValue,
  unit,
  trend
}) => {
  // Get values for sparkline
  const values = data.slice(-60).map(d => d[dataKey]);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  // Generate SVG path for smooth curve
  const generatePath = () => {
    if (values.length < 2) return '';

    const width = 100;
    const height = 100;
    const padding = 2;

    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return { x, y };
    });

    // Create smooth curve using quadratic bezier
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x + (curr.x - prev.x) / 4} ${prev.y}, ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${curr.x - (curr.x - prev.x) / 4} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Generate area fill path
  const generateAreaPath = () => {
    const linePath = generatePath();
    if (!linePath) return '';
    return `${linePath} L 100 100 L 0 100 Z`;
  };

  return (
    <div className="flex flex-col h-full bg-[#151515] rounded-xl p-4 border border-gray-800/50 relative overflow-hidden group">
      {/* Header */}
      <div className="flex justify-between items-start z-10 relative mb-2">
        <span className="text-xs text-gray-400 font-medium">{title}</span>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-white">{currentValue}</span>
          <span className="text-sm text-gray-500">{unit}</span>
          {trend === 'down' ? (
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-blue-500">
              <path d="M6 2v8M2 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-emerald-500">
              <path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Sparkline Curve - compact */}
      <div className="h-6 mt-1">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient fill */}
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={generateAreaPath()}
            fill={`url(#gradient-${dataKey})`}
          />

          {/* Line */}
          <path
            d={generatePath()}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
};

// Simple inline bar chart for smaller displays
interface MiniBarChartProps {
  data: number[];
  color: string;
  height?: number;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  color,
  height = 24
}) => {
  const maxValue = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-[1px]" style={{ height }}>
      {data.map((value, idx) => {
        const barHeight = (value / maxValue) * 100;
        return (
          <div
            key={idx}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${Math.max(barHeight, 5)}%`,
              backgroundColor: color
            }}
          />
        );
      })}
    </div>
  );
};