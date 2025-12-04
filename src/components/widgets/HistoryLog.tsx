import React from 'react';
import {
  RefreshCw,
  WifiOff,
  Plus,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Zap,
  Key
} from 'lucide-react';
import type { LogEntry } from '../../types';

interface HistoryLogProps {
  logs: LogEntry[];
}

const getLogIcon = (type: LogEntry['type'], icon?: string) => {
  // Map icon names to components
  if (icon) {
    switch (icon) {
      case 'wifi-off':
        return <WifiOff size={12} />;
      case 'refresh':
        return <RefreshCw size={12} />;
      case 'plus':
        return <Plus size={12} />;
      case 'settings':
        return <Settings size={12} />;
      case 'key':
        return <Key size={12} />;
      case 'zap':
        return <Zap size={12} />;
    }
  }

  // Default icons by type
  switch (type) {
    case 'success':
      return <CheckCircle size={12} />;
    case 'warning':
      return <AlertCircle size={12} />;
    case 'error':
      return <AlertCircle size={12} />;
    default:
      return <Info size={12} />;
  }
};

const getTypeColor = (type: LogEntry['type']) => {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-orange-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};

export const HistoryLog: React.FC<HistoryLogProps> = ({ logs }) => (
  <div className="space-y-0 relative">
    {/* Timeline line */}
    <div className="absolute top-0 bottom-0 left-[7px] w-[1px] bg-gray-800" />

    {logs.map((log) => (
      <div key={log.id} className="pl-6 py-3 relative group">
        {/* Dot */}
        <div
          className={`absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 border-[#121212] z-10 ${getTypeColor(log.type)}`}
        />

        {/* Content */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">{getLogIcon(log.type, log.icon)}</span>
            <span className="font-medium">
              <span className="text-blue-400">Admin</span>
              <span className="text-gray-300 group-hover:text-white transition-colors ml-1">
                {log.message}
              </span>
            </span>
          </div>
          <span className="text-xs text-gray-600 whitespace-nowrap ml-2">
            {log.timestamp}
          </span>
        </div>
      </div>
    ))}
  </div>
);

// Update notification component
interface UpdateNotificationProps {
  version: string;
  onInstall?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  version,
  onInstall
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#1a1a1a] p-2 rounded border border-gray-800">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Une mise à jour est disponible
      <span className="ml-auto text-gray-600">A venir</span>
    </div>

    <div className="p-3 bg-gradient-to-r from-blue-900/20 to-transparent rounded border border-blue-900/30">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Micro-logiciel {version}</span>
        <button
          onClick={onInstall}
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Zap size={12} /> Installer
        </button>
      </div>
    </div>
  </div>
);