import React from 'react';
import {
  Router,
  Thermometer,
  Fan,
  ArrowDown,
  ArrowUp,
  Wifi,
  Activity,
  Plus,
  Phone
} from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { formatSpeed, formatTemperature } from '../../utils/constants';
import type { SystemInfo, ConnectionStatus } from '../../types/api';

interface HeaderProps {
  systemInfo?: SystemInfo | null;
  connectionStatus?: ConnectionStatus | null;
}

// Helper to get CPU temperature (works for both old and new Freebox models)
const getCpuTemp = (info: SystemInfo | null | undefined): number | null => {
  if (!info) return null;
  // Try v9+ temps first (average of available CPUs)
  if (info.temp_cpu0 != null) {
    const temps = [info.temp_cpu0, info.temp_cpu1, info.temp_cpu2, info.temp_cpu3].filter(t => t != null) as number[];
    if (temps.length > 0) {
      return Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    }
  }
  // Fall back to older model temp
  if (info.temp_cpum != null) return info.temp_cpum;
  if (info.temp_cpub != null) return info.temp_cpub;
  return null;
};

export const Header: React.FC<HeaderProps> = ({ systemInfo, connectionStatus }) => {
  // Get CPU temperature (works for all Freebox models)
  const cpuTemp = getCpuTemp(systemInfo);
  const temp = cpuTemp != null ? formatTemperature(cpuTemp) : '--';
  const fan = systemInfo?.fan_rpm != null ? `${systemInfo.fan_rpm}T/min` : '--';
  const downloadSpeed = connectionStatus
    ? formatSpeed(connectionStatus.rate_down).replace(' ', '')
    : '--';
  const uploadSpeed = connectionStatus
    ? formatSpeed(connectionStatus.rate_up).replace(' ', '')
    : '--';
  const wifiStatus = 'OK';
  const phoneStatus = 'OK'; // Phone line status - would need API endpoint to get real status
  const connectionState = connectionStatus?.state === 'up' ? 'UP' : 'DOWN';
  const ipv4 = connectionStatus?.ipv4 || '--';

  // Use box_model_name from api_version if available (e.g. "Freebox v9 (r1)")
  // Otherwise fall back to board_name
  const boxName = systemInfo?.box_model_name || systemInfo?.board_name || 'Freebox';

  return (
    <header className="flex flex-col md:flex-row items-center justify-between p-4 bg-[#111111] border-b border-gray-800 gap-4">
      {/* Box identifier */}
      <div className="flex items-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700">
        <Router className="text-gray-400" size={20} />
        <span className="font-semibold text-gray-200">{boxName}</span>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
        <button className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-gray-700 text-gray-400 transition-colors">
          <Plus size={18} />
        </button>

        <StatusBadge
          icon={<Thermometer size={16} />}
          value={temp}
          color="text-emerald-400"
        />
        <StatusBadge
          icon={<Fan size={16} />}
          value={fan}
          color="text-emerald-400"
        />

        {/* Network speeds */}
        <div className="flex items-center gap-4 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700 mx-2">
          <div className="flex items-center gap-2">
            <ArrowDown size={16} className="text-blue-400" />
            <span className="text-sm font-medium">{downloadSpeed}</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <ArrowUp size={16} className="text-green-400" />
            <span className="text-sm font-medium">{uploadSpeed}</span>
          </div>
        </div>

        <StatusBadge
          icon={<Wifi size={16} />}
          value={wifiStatus}
          color="text-green-400"
        />
        <StatusBadge
          icon={<Phone size={16} />}
          value={phoneStatus}
          color={phoneStatus === 'OK' ? 'text-green-400' : 'text-red-400'}
        />
        <StatusBadge
          icon={<Activity size={16} />}
          value={connectionState}
          color={connectionState === 'UP' ? 'text-green-400' : 'text-red-400'}
        />

        {/* IPv4 */}
        <div className="hidden lg:flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700 ml-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-mono text-gray-400">{ipv4} (IPv4)</span>
        </div>
      </div>
    </header>
  );
};