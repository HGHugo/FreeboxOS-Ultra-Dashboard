import React, { useMemo, useEffect, useState } from 'react';
import { X, Wifi, WifiOff, Globe, Thermometer, Activity, Clock, HardDrive, Cpu } from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { NetworkStat, SystemInfo, ConnectionStatus } from '../../types';
import { formatSpeed } from '../../utils/constants';

interface TemperatureStat {
  time: string;
  cpuM?: number;  // temp_cpum - CPU main
  cpuB?: number;  // temp_cpub - CPU box
  sw?: number;    // temp_sw - Switch
}

interface TrafficHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: NetworkStat[];
  temperatureData?: TemperatureStat[];
  systemInfo?: SystemInfo | null;
  connectionStatus?: ConnectionStatus | null;
  onFetchHistory?: () => void;
}

type TabType = 'traffic' | 'temperature' | 'diagnostic';

export const TrafficHistoryModal: React.FC<TrafficHistoryModalProps> = ({
  isOpen,
  onClose,
  data,
  temperatureData,
  systemInfo,
  connectionStatus,
  onFetchHistory
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('traffic');

  // Fetch traffic history when modal opens
  useEffect(() => {
    if (isOpen) {
      onFetchHistory?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only trigger on isOpen change, not onFetchHistory

  // Generate mock data if not provided
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;

    const now = new Date();
    return Array.from({ length: 60 }).map((_, i) => {
      const time = new Date(now.getTime() - (59 - i) * 60000);
      return {
        time: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        download: Math.floor(Math.random() * 500) + 100 + Math.sin(i / 5) * 50,
        upload: Math.floor(Math.random() * 200) + 50 + Math.cos(i / 5) * 30
      };
    });
  }, [data]);

  // Format temperature data for chart
  const tempChartData = useMemo(() => {
    if (temperatureData && temperatureData.length > 0) {
      return temperatureData.map(t => ({
        time: t.time,
        cpuM: t.cpuM ?? 0,       // CPU average (all cores)
        sw: t.sw ?? undefined     // Switch (if available)
      }));
    }
    return [];
  }, [temperatureData]);

  // Get CPU temperature (works for all Freebox models)
  // Ultra v9: Uses temp_cpu0-3 (4 CPU cores), returns average
  // Other models: Use temp_cpum, temp_cpub, temp_sw (legacy fields)
  const getCpuTemp = (): number | null => {
    if (!systemInfo) return null;

    // Ultra v9: average of 4 CPU cores
    if (systemInfo.temp_cpu0 != null) {
      const temps = [systemInfo.temp_cpu0, systemInfo.temp_cpu1, systemInfo.temp_cpu2, systemInfo.temp_cpu3]
        .filter(t => t != null) as number[];
      if (temps.length > 0) {
        return Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
      }
    }

    // Other models: legacy fields
    if (systemInfo.temp_cpum != null && systemInfo.temp_cpum !== 0) return systemInfo.temp_cpum;
    if (systemInfo.temp_cpub != null && systemInfo.temp_cpub !== 0) return systemInfo.temp_cpub;
    if (systemInfo.temp_sw != null && systemInfo.temp_sw !== 0) return systemInfo.temp_sw;
    return null;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Format bytes to French units (o, Ko, Mo, Go, To)
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 o';
    const k = 1000; // Decimal system (network convention) to match Freebox OS
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatBitrate = (bps: number): string => {
    if (bps === 0) return '0 bps';
    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  const cpuTemp = getCpuTemp();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151515] w-full max-w-6xl rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              État de la Freebox
              <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                {systemInfo?.box_model_name || 'Freebox'}
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Diagnostic complet et historique des performances
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#1a1a1a]">
          <button
            onClick={() => setActiveTab('traffic')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'traffic'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity size={16} className="inline mr-2" />
            Trafic Réseau
          </button>
          <button
            onClick={() => setActiveTab('temperature')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'temperature'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Thermometer size={16} className="inline mr-2" />
            Température
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'diagnostic'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu size={16} className="inline mr-2" />
            Diagnostic
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'traffic' && (
            <div className="space-y-6">
              {/* Current Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Débit descendant</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {connectionStatus ? formatSpeed(connectionStatus.rate_down) : '--'}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Débit montant</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {connectionStatus ? formatSpeed(connectionStatus.rate_up) : '--'}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Total émis</div>
                  <div className="text-2xl font-bold text-white">
                    {connectionStatus ? formatBytes(connectionStatus.bytes_up) : '--'}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Total reçu</div>
                  <div className="text-2xl font-bold text-white">
                    {connectionStatus ? formatBytes(connectionStatus.bytes_down) : '--'}
                  </div>
                </div>
              </div>

              {/* Traffic Chart */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-medium text-white mb-4">Historique du trafic (dernière heure)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDownloadHistory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorUploadHistory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        stroke="#4b5563"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        stroke="#4b5563"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          // Convert KB/s to kb/s (kilobits): KB * 8 = kb
                          const kbits = value * 8;
                          if (kbits >= 1000000) return `${(kbits / 1000000).toFixed(1)} Gb/s`;
                          if (kbits >= 1000) return `${(kbits / 1000).toFixed(1)} Mb/s`;
                          return `${Math.round(kbits)} kb/s`;
                        }}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.4} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          borderColor: '#374151',
                          color: '#fff',
                          borderRadius: '0.5rem'
                        }}
                        formatter={(value: number, _name: string, props: { dataKey: string }) => {
                          const label = props.dataKey === 'download' ? 'Descendant' : 'Montant';
                          const color = props.dataKey === 'download' ? '#3b82f6' : '#10b981';
                          // Convert KB/s to kb/s
                          const kbits = value * 8;
                          let formatted: string;
                          if (kbits >= 1000000) formatted = `${(kbits / 1000000).toFixed(2)} Gb/s`;
                          else if (kbits >= 1000) formatted = `${(kbits / 1000).toFixed(2)} Mb/s`;
                          else formatted = `${Math.round(kbits)} kb/s`;
                          return [
                            <span style={{ color }}>{formatted}</span>,
                            label
                          ];
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Area
                        type="monotone"
                        dataKey="download"
                        name="Descendant"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDownloadHistory)"
                      />
                      <Area
                        type="monotone"
                        dataKey="upload"
                        name="Montant"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUploadHistory)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'temperature' && (
            <div className="space-y-6">
              {/* Current Temps */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">
                    {systemInfo?.temp_cpu0 != null ? 'CPU (Moyenne)' : 'CPU Principal'}
                  </div>
                  <div className={`text-2xl font-bold ${cpuTemp && cpuTemp > 70 ? 'text-red-400' : cpuTemp && cpuTemp > 50 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {cpuTemp ? `${cpuTemp}°C` : '--'}
                  </div>
                </div>
                {systemInfo?.temp_sw != null && systemInfo.temp_sw > 0 && (
                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Switch</div>
                    <div className={`text-2xl font-bold ${systemInfo.temp_sw > 70 ? 'text-red-400' : systemInfo.temp_sw > 50 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {systemInfo.temp_sw}°C
                    </div>
                  </div>
                )}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Ventilateur</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {systemInfo?.fan_rpm ? `${systemInfo.fan_rpm} RPM` : '--'}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Statut refroidissement</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {systemInfo?.fan_rpm && systemInfo.fan_rpm > 0 ? 'Actif' : 'Passif'}
                  </div>
                </div>
              </div>

              {/* Temperature Chart */}
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-medium text-white mb-4">Historique des températures (dernière heure)</h3>
                <div className="h-[300px]">
                  {tempChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tempChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis
                          dataKey="time"
                          stroke="#4b5563"
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={30}
                        />
                        <YAxis
                          stroke="#4b5563"
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          domain={[20, 80]}
                          tickFormatter={(value) => `${value}°C`}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.4} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            borderColor: '#374151',
                            color: '#fff',
                            borderRadius: '0.5rem'
                          }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line
                          type="monotone"
                          dataKey="cpuM"
                          name={systemInfo?.temp_cpu0 != null ? 'CPU (Moyenne)' : 'CPU Principal'}
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                        />
                        {tempChartData.some(d => d.sw && d.sw > 0) && (
                          <Line type="monotone" dataKey="sw" name="Switch" stroke="#06b6d4" strokeWidth={2} dot={false} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <p>Collecte des données en cours...</p>
                      <p className="text-xs mt-2">L'historique se construit au fil du temps (polling système)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostic' && (
            <div className="space-y-6">
              {/* Connection Status */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Globe size={20} />
                  État de la connexion Internet
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">État</div>
                    <div className={`text-lg font-bold flex items-center gap-2 ${
                      connectionStatus?.state === 'up' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {connectionStatus?.state === 'up' ? <Wifi size={18} /> : <WifiOff size={18} />}
                      {connectionStatus?.state === 'up' ? 'Connecté' : connectionStatus?.state || 'Inconnu'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Type de connexion</div>
                    <div className="text-lg font-bold text-white">
                      {connectionStatus?.media || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">IPv4</div>
                    <div className="text-lg font-bold text-white font-mono">
                      {connectionStatus?.ipv4 || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">IPv6</div>
                    <div className="text-sm font-bold text-white font-mono truncate">
                      {connectionStatus?.ipv6 || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bande passante (Down)</div>
                    <div className="text-lg font-bold text-blue-400">
                      {connectionStatus ? formatBitrate(connectionStatus.bandwidth_down) : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bande passante (Up)</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {connectionStatus ? formatBitrate(connectionStatus.bandwidth_up) : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Cpu size={20} />
                  Informations système
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Modèle</div>
                    <div className="text-lg font-bold text-white">
                      {systemInfo?.box_model_name || systemInfo?.board_name || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Firmware</div>
                    <div className="text-lg font-bold text-white font-mono">
                      {systemInfo?.firmware_version || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Clock size={12} /> Uptime
                    </div>
                    <div className="text-lg font-bold text-cyan-400">
                      {systemInfo?.uptime_val ? formatUptime(systemInfo.uptime_val) : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Adresse MAC</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {systemInfo?.mac || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Numéro de série</div>
                    <div className="text-sm font-bold text-white font-mono">
                      {systemInfo?.serial || '--'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <HardDrive size={12} /> Stockage
                    </div>
                    <div className={`text-lg font-bold ${
                      systemInfo?.disk_status === 'active' ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      {systemInfo?.disk_status === 'active' ? 'Actif' : 'Non connecté'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Backup Internet Status */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Wifi size={20} />
                  Connexion de secours (4G)
                </h3>
                <div className="text-gray-500 text-sm">
                  La connexion 4G de secours n'est pas configurée ou n'est pas disponible sur ce modèle.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};