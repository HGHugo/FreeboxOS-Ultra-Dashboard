import React from 'react';

interface ResourceBarProps {
  label: string;
  percent: number;
  text?: string;
  color?: string;
  segments?: number;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  label,
  percent,
  text,
  color = 'bg-emerald-500',
  segments = 20
}) => {
  const filledSegments = Math.round((percent / 100) * segments);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-[2px] h-6">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-all duration-300 ${
              i < filledSegments ? color : 'bg-gray-800'
            }`}
            style={{ height: '100%' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
        <span>{label}</span>
        <span>{text || `${Math.round(percent)}%`}</span>
      </div>
    </div>
  );
};

// Horizontal progress bar with segments (for downloads)
interface SegmentedProgressProps {
  percent: number;
  color?: string;
  segments?: number;
  height?: number;
}

export const SegmentedProgress: React.FC<SegmentedProgressProps> = ({
  percent,
  color = 'bg-blue-500',
  segments = 30,
  height = 24
}) => {
  const filledSegments = Math.round((percent / 100) * segments);

  return (
    <div className="flex gap-[2px]" style={{ height }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-[1px] ${
            i < filledSegments ? color : 'bg-gray-800'
          }`}
        />
      ))}
    </div>
  );
};