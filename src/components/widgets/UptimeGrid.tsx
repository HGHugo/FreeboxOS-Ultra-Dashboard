import React, { useEffect, useMemo } from 'react';
import { Clock, RefreshCw, HelpCircle } from 'lucide-react';
import { useUptimeStore } from '../../stores';

interface UptimeGridProps {
  uptimeSeconds?: number;
}

// Format uptime in human readable format
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}j ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Format date for tooltip
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

export const UptimeGrid: React.FC<UptimeGridProps> = ({
  uptimeSeconds
}) => {
  const { recordUptime, getHistoryForDisplay } = useUptimeStore();

  // Record uptime when it changes
  useEffect(() => {
    if (uptimeSeconds !== undefined) {
      recordUptime(uptimeSeconds);
    }
  }, [uptimeSeconds, recordUptime]);

  // Get history for display
  const historyData = useMemo(() => getHistoryForDisplay(), [getHistoryForDisplay]);

  // Calculate uptime percentage from history (only count known days)
  const uptimePercentage = useMemo(() => {
    const knownDays = historyData.filter(d => d.status !== 'unknown');
    if (knownDays.length === 0) return 100; // No data = assume up

    const upDays = knownDays.filter(d => d.status === 'up').length;
    const partialDays = knownDays.filter(d => d.status === 'partial').length;
    // Partial days count as 0.5
    return Math.round(((upDays + partialDays * 0.5) / knownDays.length) * 100 * 10) / 10;
  }, [historyData]);

  // Count days with data
  const daysWithData = useMemo(() => {
    return historyData.filter(d => d.status !== 'unknown').length;
  }, [historyData]);

  // If no uptime data, show placeholder
  if (uptimeSeconds === undefined) {
    return (
      <div className="text-center py-4 text-gray-500">
        Données non disponibles
      </div>
    );
  }

  const uptimeFormatted = formatUptime(uptimeSeconds);

  return (
    <div className="flex flex-col gap-2">
      {/* Header with percentage and status */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-200">{uptimePercentage}%</span>
          {daysWithData < 30 && (
            <span className="text-xs text-gray-500">({daysWithData}j de données)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400">Opérationnel</span>
        </div>
      </div>

      {/* Uptime grid */}
      <div className="grid grid-cols-10 gap-1.5">
        {historyData.map((day, i) => (
          <div
            key={i}
            className={`h-7 rounded transition-all hover:scale-110 cursor-help flex items-center justify-center ${
              day.status === 'up'
                ? 'bg-emerald-500/80 hover:bg-emerald-400'
                : day.status === 'partial'
                ? 'bg-orange-500/80 hover:bg-orange-400'
                : day.status === 'down'
                ? 'bg-red-500/80 hover:bg-red-400'
                : 'bg-gray-700/30 hover:bg-gray-600/50'
            }`}
            title={`${formatDate(day.date)}: ${
              day.status === 'up' ? 'Opérationnel' :
              day.status === 'partial' ? 'Redémarrage détecté' :
              day.status === 'down' ? 'Hors ligne' :
              'Pas de données'
            }`}
          >
            {day.status === 'partial' && (
              <RefreshCw size={10} className="text-white/70" />
            )}
            {day.status === 'unknown' && (
              <HelpCircle size={10} className="text-white/30" />
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
        <span>30 jours</span>
        <span>Aujourd'hui</span>
      </div>

      {/* Current uptime */}
      <div className="flex items-center justify-center gap-2 mt-2 py-2 bg-[#1a1a1a] rounded-lg">
        <Clock size={14} className="text-emerald-500" />
        <span className="text-sm text-gray-300">Uptime actuel: <span className="font-semibold text-white">{uptimeFormatted}</span></span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 mt-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500/80" />
          <span>OK</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500/80" />
          <span>Reboot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-700/30" />
          <span>Inconnu</span>
        </div>
      </div>
    </div>
  );
};