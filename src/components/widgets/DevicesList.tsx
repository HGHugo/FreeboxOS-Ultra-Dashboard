import React from 'react';
import {
  Smartphone,
  Laptop,
  Monitor,
  Tv,
  Globe,
  Tablet,
  Car,
  Wifi,
  Cable,
  Signal,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import type { Device } from '../../types';

interface DevicesListProps {
  devices: Device[];
  onDeviceClick?: (device: Device) => void;
}

const DeviceIcon: React.FC<{ type: Device['type']; active?: boolean }> = ({
  type,
  active = true
}) => {
  const iconProps = { size: 18, className: active ? 'text-gray-300' : 'text-gray-600' };

  switch (type) {
    case 'phone':
      return <Smartphone {...iconProps} />;
    case 'tablet':
      return <Tablet {...iconProps} />;
    case 'laptop':
      return <Laptop {...iconProps} />;
    case 'desktop':
      return <Monitor {...iconProps} />;
    case 'tv':
      return <Tv {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'repeater':
      return <Wifi {...iconProps} />;
    case 'iot':
    default:
      return <Globe {...iconProps} />;
  }
};

export const DevicesList: React.FC<DevicesListProps> = ({ devices, onDeviceClick }) => {
  const activeDevices = devices.filter(d => d.active);
  const inactiveDevices = devices.filter(d => !d.active);
  const allDevices = [...activeDevices, ...inactiveDevices];

  const wifiCount = activeDevices.filter(d => d.connection === 'wifi').length;
  const ethernetCount = activeDevices.filter(d => d.connection === 'ethernet').length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between text-xs px-1 mb-3">
        <span className="text-emerald-400 font-medium">
          Appareils {activeDevices.length}/{devices.length}
        </span>
        <span className="text-gray-500 text-[10px] flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Signal size={10} className="text-blue-400" />
            {wifiCount}
          </span>
          <span className="flex items-center gap-1">
            <Cable size={10} className="text-emerald-400" />
            {ethernetCount}
          </span>
        </span>
      </div>

      {/* Device Grid - Small Cards Style */}
      <div className="grid grid-cols-1 gap-2">
        {allDevices.map((dev) => (
          <div
            key={dev.id}
            onClick={() => onDeviceClick?.(dev)}
            className={`
              flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
              ${dev.active
                ? 'bg-[#1a1a1a] border-gray-800 hover:bg-[#202020] hover:border-gray-700'
                : 'bg-[#0f0f0f] border-gray-800/50 opacity-60 hover:opacity-80'
              }
            `}
          >
            {/* Left: Icon + Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`
                p-2 rounded-lg
                ${dev.active ? 'bg-[#252525]' : 'bg-[#1a1a1a]'}
              `}>
                <DeviceIcon type={dev.type} active={dev.active} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-medium truncate ${dev.active ? 'text-gray-200' : 'text-gray-500'}`}>
                  {dev.name}
                </span>
                <div className="flex items-center gap-2">
                  {dev.ip && (
                    <span className="text-[10px] text-gray-600 font-mono">{dev.ip}</span>
                  )}
                  {dev.vendor && (
                    <span className="text-[10px] text-gray-700 truncate max-w-24">{dev.vendor}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Speed + Connection type or Offline */}
            {dev.active ? (
              <div className="flex items-center gap-2">
                {/* Speed indicators (only show if there's traffic) */}
                {(dev.speedDown > 0 || dev.speedUp > 0) && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <ArrowDown size={10} className="text-blue-400" />
                      {dev.speedDown.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ArrowUp size={10} className="text-emerald-400" />
                      {dev.speedUp.toFixed(1)}
                    </span>
                  </div>
                )}
                {/* Connection type badge */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  dev.connection === 'wifi'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {dev.connection === 'wifi' ? (
                    <Signal size={12} />
                  ) : (
                    <Cable size={12} />
                  )}
                  <span>{dev.connection === 'wifi' ? 'WiFi' : 'Eth'}</span>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-gray-600 bg-gray-800/50 px-2 py-1 rounded">
                Hors-ligne
              </span>
            )}
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Aucun appareil connecté
        </div>
      )}
    </div>
  );
};