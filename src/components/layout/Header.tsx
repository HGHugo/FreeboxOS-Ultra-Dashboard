import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Cpu,
  HardDrive,
  Fan,
  ArrowDown,
  ArrowUp,
  Wifi,
  Activity,
  Phone
} from 'lucide-react';
import logoUltra from '../../icons/logo_ultra.svg';
import { StatusBadge } from '../ui/Badge';
import { formatSpeed, formatTemperature } from '../../utils/constants';
import { useCapabilitiesStore } from '../../stores/capabilitiesStore';
import { useFavicon } from '../../hooks/useFavicon';
import type { SystemInfo, ConnectionStatus, SystemSensor, SystemFan } from '../../types/api';

// Map model to display name
const getDisplayName = (model: string): string => {
  switch (model) {
    case 'ultra': return 'Freebox Ultra';
    case 'delta': return 'Freebox Delta';
    case 'pop': return 'Freebox Pop';
    case 'revolution': return 'Freebox Revolution';
    default: return 'Freebox';
  }
};

interface HeaderProps {
  systemInfo?: SystemInfo | null;
  connectionStatus?: ConnectionStatus | null;
}

// Helper to get CPU sensors (sorted alphabetically by id)
const getCpuSensors = (info: SystemInfo | null | undefined): SystemSensor[] => {
  if (!info) return [];

  // API v15+: sensors array format
  if (info.sensors && Array.isArray(info.sensors)) {
    return info.sensors
      .filter(s => s.id.startsWith('temp_cpu'))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  // Legacy format: build sensors array from individual fields
  const sensors: SystemSensor[] = [];
  if (info.temp_cpu0 != null) sensors.push({ id: 'temp_cpu0', name: 'CPU 0', value: info.temp_cpu0 });
  if (info.temp_cpu1 != null) sensors.push({ id: 'temp_cpu1', name: 'CPU 1', value: info.temp_cpu1 });
  if (info.temp_cpu2 != null) sensors.push({ id: 'temp_cpu2', name: 'CPU 2', value: info.temp_cpu2 });
  if (info.temp_cpu3 != null) sensors.push({ id: 'temp_cpu3', name: 'CPU 3', value: info.temp_cpu3 });
  if (info.temp_cpum != null) sensors.push({ id: 'temp_cpum', name: 'CPU Main', value: info.temp_cpum });
  if (info.temp_cpub != null) sensors.push({ id: 'temp_cpub', name: 'CPU Box', value: info.temp_cpub });
  if (info.temp_sw != null) sensors.push({ id: 'temp_sw', name: 'Switch', value: info.temp_sw });

  return sensors.sort((a, b) => a.id.localeCompare(b.id));
};

// Helper to get HDD sensors (sorted alphabetically by id)
const getHddSensors = (info: SystemInfo | null | undefined): SystemSensor[] => {
  if (!info) return [];

  // API v15+: sensors array format
  if (info.sensors && Array.isArray(info.sensors)) {
    return info.sensors
      .filter(s => s.id.startsWith('temp_hdd') || s.id.includes('disk'))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  return [];
};

// Helper to get average temperature from sensors
const getAvgTemp = (sensors: SystemSensor[]): number | null => {
  if (sensors.length === 0) return null;
  const avg = sensors.reduce((sum, s) => sum + s.value, 0) / sensors.length;
  return Math.round(avg);
};

// Helper to get all fans (API v8+)
const getFans = (info: SystemInfo | null | undefined): SystemFan[] => {
  if (!info) return [];

  // API v8+: fans array
  if (info.fans && Array.isArray(info.fans)) {
    return info.fans.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Legacy format: single fan_rpm field
  if (info.fan_rpm != null) {
    return [{ id: 'fan_rpm', name: 'Ventilateur', value: info.fan_rpm }];
  }

  return [];
};

// Helper to get average fan RPM
const getAvgFanRpm = (fans: SystemFan[]): number | null => {
  if (fans.length === 0) return null;
  const avg = fans.reduce((sum, f) => sum + f.value, 0) / fans.length;
  return Math.round(avg);
};

// Generic tooltip item type
interface TooltipItem {
  id: string;
  name: string;
  value: number;
}

// Tooltip component that renders in a portal to avoid overflow issues
const Tooltip: React.FC<{
  show: boolean;
  title: string;
  items: TooltipItem[];
  color: string;
  unit: string;
  parentRef: React.RefObject<HTMLDivElement | null>;
}> = ({ show, title, items, color, unit, parentRef }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (show && parentRef.current) {
      const rect = parentRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    } else {
      setPosition(null);
    }
  }, [show, parentRef]);

  // Don't render until position is calculated
  if (!show || items.length === 0 || !position) return null;

  const tooltipContent = (
    <div
      className="fixed z-[9999] bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px] whitespace-nowrap"
      style={{ top: position.top, left: position.left }}
    >
      <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">{title}</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center text-sm gap-4">
            <span className="text-gray-300">{item.name}</span>
            <span className={`${color} font-medium`}>{item.value}{unit}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Use portal to render tooltip at document body level
  return createPortal(tooltipContent, document.body);
};

export const Header: React.FC<HeaderProps> = ({ systemInfo, connectionStatus }) => {
  // Get capabilities for model name (respects mock mode)
  const { getModel } = useCapabilitiesStore();

  // State for tooltips
  const [showCpuTooltip, setShowCpuTooltip] = useState(false);
  const [showHddTooltip, setShowHddTooltip] = useState(false);
  const [showFanTooltip, setShowFanTooltip] = useState(false);

  // Refs for tooltip positioning
  const cpuRef = React.useRef<HTMLDivElement | null>(null);
  const hddRef = React.useRef<HTMLDivElement | null>(null);
  const fanRef = React.useRef<HTMLDivElement | null>(null);

  // Set favicon dynamically based on Freebox model
  // TODO: Add different logos for other models (delta, pop, revolution)
  // invert=true to make white SVG visible on light browser tab backgrounds
  useFavicon(logoUltra, true);

  // Get CPU and HDD sensors
  const cpuSensors = getCpuSensors(systemInfo);
  const hddSensors = getHddSensors(systemInfo);
  const fans = getFans(systemInfo);

  // Calculate averages
  const cpuAvgTemp = getAvgTemp(cpuSensors);
  const hddAvgTemp = getAvgTemp(hddSensors);
  const fanAvgRpm = getAvgFanRpm(fans);

  // Format for display
  const cpuTemp = cpuAvgTemp != null ? formatTemperature(cpuAvgTemp) : '--';
  const hddTemp = hddAvgTemp != null ? formatTemperature(hddAvgTemp) : '--';
  const fanDisplay = fanAvgRpm != null ? `${fanAvgRpm} T/min` : '--';
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

  // Get simplified display name based on model (e.g., "Freebox Ultra", "Freebox Pop")
  const model = getModel();
  const boxName = getDisplayName(model);

  // Update page title based on model
  useEffect(() => {
    const modelSuffix = model === 'unknown' ? '' : ` ${model.charAt(0).toUpperCase() + model.slice(1)}`;
    document.title = `Freebox OS${modelSuffix}`;
  }, [model]);

  return (
    <header className="flex flex-col md:flex-row items-center justify-between p-4 bg-[#111111] border-b border-gray-800 gap-4">
      {/* Box identifier */}
      <div className="flex items-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700">
        <img src={logoUltra} alt="Freebox Ultra" className="w-7 h-7 flex-shrink-0" />
        <span className="font-semibold text-gray-200 leading-none">{boxName}</span>
      </div>



      {/* Status badges */}
      <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">


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

        {/* CPU Temperature badge with tooltip */}
        <div
          ref={cpuRef}
          className="cursor-pointer"
          onMouseEnter={() => setShowCpuTooltip(true)}
          onMouseLeave={() => setShowCpuTooltip(false)}
        >
          <StatusBadge
            icon={<Cpu size={16} />}
            value={cpuTemp}
            color="text-emerald-400"
          />
        </div>
        <Tooltip
          show={showCpuTooltip}
          title="Températures CPU"
          items={cpuSensors}
          color="text-emerald-400"
          unit="°C"
          parentRef={cpuRef}
        />

        {/* HDD Temperature badge with tooltip */}
        {hddSensors.length > 0 && (
          <>
            <div
              ref={hddRef}
              className="cursor-pointer"
              onMouseEnter={() => setShowHddTooltip(true)}
              onMouseLeave={() => setShowHddTooltip(false)}
            >
              <StatusBadge
                icon={<HardDrive size={16} />}
                value={hddTemp}
                color="text-blue-400"
              />
            </div>
            <Tooltip
              show={showHddTooltip}
              title="Températures Disques"
              items={hddSensors}
              color="text-blue-400"
              unit="°C"
              parentRef={hddRef}
            />
          </>
        )}

        {/* Fan badge with tooltip */}
        <div
          ref={fanRef}
          className="cursor-pointer"
          onMouseEnter={() => setShowFanTooltip(true)}
          onMouseLeave={() => setShowFanTooltip(false)}
        >
          <StatusBadge
            icon={<Fan size={16} />}
            value={fanDisplay}
            color="text-orange-400"
          />
        </div>
        <Tooltip
          show={showFanTooltip}
          title="Ventilateurs"
          items={fans}
          color="text-orange-400"
          unit=" T/min"
          parentRef={fanRef}
        />


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