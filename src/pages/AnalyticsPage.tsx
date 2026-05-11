import React, { useEffect, useState } from 'react';
import {
  Activity,
  Thermometer,
  Wifi,
  HardDrive,
  Cpu,
  Download,
  Upload,
  Clock,
  Zap,
  Fan,
  Server,
  ChevronLeft,
  BarChart2,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useConnectionStore } from '../stores/connectionStore';
import { useSystemStore } from '../stores/systemStore';
import { useWifiStore } from '../stores/wifiStore';
import { useLanStore } from '../stores/lanStore';
import { useUptimeStore } from '../stores/uptimeStore';
import { useCapabilitiesStore } from '../stores/capabilitiesStore';
import { formatSpeed, formatBitrate } from '../utils/constants';
import type { SystemSensor, SystemFan } from '../types/api';

type TimeRange = '1h' | '6h' | '24h' | '7d';

const COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  cyan: '#06b6d4',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  yellow: '#eab308'
};

const PIE_COLORS = [COLORS.blue, COLORS.green, COLORS.cyan, COLORS.orange, COLORS.purple, COLORS.pink];

interface AnalyticsPageProps {
  onBack: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const { status, history, extendedHistory, temperatureHistory, rrdPermissionDenied, fetchExtendedHistory, fetchTemperatureHistory } = useConnectionStore();
  const { info, temperatureHistory: systemTempHistory } = useSystemStore();
  const { networks } = useWifiStore();
  const { devices } = useLanStore();
  const { getHistoryForDisplay } = useUptimeStore();
  const { capabilities } = useCapabilitiesStore();

  // Sensor name normalization (clean up API names for display)
  const normalizeSensorName = (id: string, name: string): string => {
    // Clean up common prefixes from API
    const cleaned = name
      .replace(/^Température\s+/i, '')
      .replace(/^Temperature\s+/i, '')
      .trim();

    // Map specific IDs to short display names
    const nameMap: Record<string, string> = {
      'temp_cpu0': 'CPU 0',
      'temp_cpu1': 'CPU 1',
      'temp_cpu2': 'CPU 2',
      'temp_cpu3': 'CPU 3',
      'temp_cpum': 'CPU',
      'temp_cpub': 'CPU Box',
      'temp_sw': 'Switch',
      'temp_hdd': 'Disque',
      'temp_hdd0': 'Disque 1',
      'temp_hdd1': 'Disque 2'
    };

    return nameMap[id] || cleaned || id;
  };

  // Helper to get CPU sensors (API v8+ format)
  const getCpuSensors = (): SystemSensor[] => {
    if (!info) return [];

    // API v8+: sensors array format (already normalized by backend)
    if (info.sensors && Array.isArray(info.sensors)) {
      return info.sensors
        .filter(s => s.id.startsWith('temp_cpu') || s.id.startsWith('cpu'))
        .map(s => ({ ...s, name: normalizeSensorName(s.id, s.name) }))
        .sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID for consistent order
    }

    // Legacy format: build sensors array from individual fields
    const sensors: SystemSensor[] = [];
    if (info.temp_cpu0 != null) sensors.push({ id: 'temp_cpu0', name: 'CPU 0', value: info.temp_cpu0 });
    if (info.temp_cpu1 != null) sensors.push({ id: 'temp_cpu1', name: 'CPU 1', value: info.temp_cpu1 });
    if (info.temp_cpu2 != null) sensors.push({ id: 'temp_cpu2', name: 'CPU 2', value: info.temp_cpu2 });
    if (info.temp_cpu3 != null) sensors.push({ id: 'temp_cpu3', name: 'CPU 3', value: info.temp_cpu3 });
    if (info.temp_cpum != null) sensors.push({ id: 'temp_cpum', name: 'CPU', value: info.temp_cpum });
    if (info.temp_cpub != null) sensors.push({ id: 'temp_cpub', name: 'CPU Box', value: info.temp_cpub });

    return sensors.sort((a, b) => a.id.localeCompare(b.id));
  };

  // Helper to get HDD sensors (API v8+ format)
  const getHddSensors = (): SystemSensor[] => {
    if (!info) return [];

    // API v8+: sensors array format
    if (info.sensors && Array.isArray(info.sensors)) {
      return info.sensors
        .filter(s => s.id.startsWith('temp_hdd') || s.id.includes('disk'))
        .map(s => ({ ...s, name: normalizeSensorName(s.id, s.name) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    return [];
  };

  // Helper to get other temperature sensors (switch, etc.)
  const getOtherSensors = (): SystemSensor[] => {
    if (!info) return [];

    // API v8+: sensors array format
    if (info.sensors && Array.isArray(info.sensors)) {
      return info.sensors
        .filter(s => !s.id.startsWith('temp_cpu') && !s.id.startsWith('cpu') && !s.id.startsWith('temp_hdd') && !s.id.includes('disk'))
        .map(s => ({ ...s, name: normalizeSensorName(s.id, s.name) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    // Legacy format
    const sensors: SystemSensor[] = [];
    if (info.temp_sw != null) sensors.push({ id: 'temp_sw', name: 'Switch', value: info.temp_sw });

    return sensors;
  };

  // Fan name normalization
  const normalizeFanName = (id: string, name: string): string => {
    const nameMap: Record<string, string> = {
      'fan0_speed': 'Ventilateur 1',
      'fan1_speed': 'Ventilateur 2',
      'fan0': 'Ventilateur 1',
      'fan1': 'Ventilateur 2',
      'main': 'Ventilateur',
      'fan': 'Ventilateur',
      'fan_rpm': 'Ventilateur'
    };

    return nameMap[id] || name || id;
  };

  // Helper to get fans (API v8+ format)
  const getFans = (): SystemFan[] => {
    if (!info) return [];

    // API v8+: fans array (normalize names)
    if (info.fans && Array.isArray(info.fans)) {
      return info.fans
        .map(f => ({ ...f, name: normalizeFanName(f.id, f.name) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    // Legacy format: single fan_rpm field
    if (info.fan_rpm != null) {
      return [{ id: 'fan_rpm', name: 'Ventilateur', value: info.fan_rpm }];
    }

    return [];
  };

  // Helper to get average temperature from sensors
  const getAvgTemp = (sensors: SystemSensor[]): number | null => {
    if (sensors.length === 0) return null;
    const avg = sensors.reduce((sum, s) => sum + s.value, 0) / sensors.length;
    return Math.round(avg);
  };

  // Helper to get average fan RPM
  const getAvgFanRpm = (fans: SystemFan[]): number | null => {
    if (fans.length === 0) return null;
    const avg = fans.reduce((sum, f) => sum + f.value, 0) / fans.length;
    return Math.round(avg);
  };

  // Get all sensor data
  const cpuSensors = getCpuSensors();
  const hddSensors = getHddSensors();
  const otherSensors = getOtherSensors();
  const fans = getFans();
  const cpuAvgTemp = getAvgTemp(cpuSensors);
  const hddAvgTemp = getAvgTemp(hddSensors);
  const fanAvgRpm = getAvgFanRpm(fans);

  // Get uptime data from store
  const uptimeHistory = getHistoryForDisplay();
  const uptimePercentage = React.useMemo(() => {
    if (!uptimeHistory.length) return 100;
    const upDays = uptimeHistory.filter(d => d.status === 'up').length;
    return Math.round((upDays / uptimeHistory.length) * 100);
  }, [uptimeHistory]);

  const [activeTab, setActiveTab] = useState<'bandwidth' | 'temperature' | 'wifi' | 'system'>('bandwidth');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  // Fetch extended history on mount and when time range changes
  useEffect(() => {
    const durations: Record<TimeRange, number> = {
      '1h': 3600,
      '6h': 21600,
      '24h': 86400,
      '7d': 604800
    };

    // Initial fetch
    fetchExtendedHistory(durations[timeRange]);
    fetchTemperatureHistory(durations[timeRange]);

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchExtendedHistory(durations[timeRange]);
      fetchTemperatureHistory(durations[timeRange]);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [timeRange, fetchExtendedHistory, fetchTemperatureHistory]);

  // Calculate bandwidth stats
  const bandwidthStats = React.useMemo(() => {
    if (!extendedHistory.length) return { avgDown: 0, avgUp: 0, maxDown: 0, maxUp: 0, totalDown: 0, totalUp: 0 };

    const totalDown = extendedHistory.reduce((sum, p) => sum + p.download, 0);
    const totalUp = extendedHistory.reduce((sum, p) => sum + p.upload, 0);
    const maxDown = Math.max(...extendedHistory.map(p => p.download));
    const maxUp = Math.max(...extendedHistory.map(p => p.upload));

    return {
      avgDown: Math.round(totalDown / extendedHistory.length),
      avgUp: Math.round(totalUp / extendedHistory.length),
      maxDown,
      maxUp,
      totalDown,
      totalUp
    };
  }, [extendedHistory]);

  // Calculate temperature stats
  const tempStats = React.useMemo(() => {
    const history = temperatureHistory.length ? temperatureHistory : systemTempHistory;
    if (!history.length) return { avgCpu: 0, maxCpu: 0, avgSw: 0, maxSw: 0 };

    const cpuTemps = history.map(p => p.cpuM || 0).filter(t => t > 0);
    const swTemps = history.map(p => p.sw || 0).filter(t => t > 0);

    return {
      avgCpu: cpuTemps.length ? Math.round(cpuTemps.reduce((a, b) => a + b, 0) / cpuTemps.length) : 0,
      maxCpu: cpuTemps.length ? Math.max(...cpuTemps) : 0,
      avgSw: swTemps.length ? Math.round(swTemps.reduce((a, b) => a + b, 0) / swTemps.length) : 0,
      maxSw: swTemps.length ? Math.max(...swTemps) : 0
    };
  }, [temperatureHistory, systemTempHistory]);

  // Device type distribution for pie chart
  const deviceDistribution = React.useMemo(() => {
    const typeCount: Record<string, number> = {};
    devices.forEach(device => {
      const type = device.type || 'other';
      // Map device type to French label
      const typeLabels: Record<string, string> = {
        phone: 'Téléphone',
        tablet: 'Tablette',
        laptop: 'Ordinateur portable',
        desktop: 'Ordinateur',
        tv: 'TV/Multimédia',
        car: 'Voiture',
        repeater: 'Répéteur',
        iot: 'IoT',
        other: 'Autre'
      };
      const label = typeLabels[type] || 'Autre';
      typeCount[label] = (typeCount[label] || 0) + 1;
    });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [devices]);

  // WiFi band distribution
  const wifiBandDistribution = React.useMemo(() => {
    return networks.map(network => ({
      name: network.band,
      value: network.connectedDevices,
      ssid: network.ssid
    }));
  }, [networks]);

  // Uptime data for chart
  const uptimeData = React.useMemo(() => {
    return uptimeHistory.slice(-30).map((day, index) => ({
      day: index + 1,
      uptime: day.status === 'up' ? 100 : day.status === 'down' ? 0 : 50,
      status: day.status
    }));
  }, [uptimeHistory]);

  // Format KB/s to Freebox-style speed units (kb/s, Mb/s, Gb/s)
  // Input is in KB/s (kilobytes), we convert to bits for display
  const formatKBSpeed = (kbPerSec: number): string => {
    // Convert KB/s to kb/s (kilobits): KB * 8 = kb
    const kbitsPerSec = kbPerSec * 8;

    if (kbitsPerSec === 0) return '0 kb/s';

    const k = 1000;
    const sizes = ['kb/s', 'Mb/s', 'Gb/s'];

    // Start at kb/s level since input is already in KB
    if (kbitsPerSec < k) return `${Math.round(kbitsPerSec)} kb/s`;

    const i = Math.floor(Math.log(kbitsPerSec) / Math.log(k));
    const value = kbitsPerSec / Math.pow(k, i);
    const decimals = value < 10 ? 1 : 0;
    return `${value.toFixed(decimals)} ${sizes[Math.min(i, sizes.length - 1)]}`;
  };

  const tabs = [
    { id: 'bandwidth' as const, label: 'Bande passante', icon: Activity },
    { id: 'temperature' as const, label: 'Température', icon: Thermometer },
    { id: 'wifi' as const, label: 'WiFi', icon: Wifi },
    { id: 'system' as const, label: 'Système', icon: Server }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BarChart2 size={24} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Analytique</h1>
                  <p className="text-sm text-gray-500">Statistiques et graphiques détaillés</p>
                </div>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-1">
              {(['1h', '6h', '24h', '7d'] as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1a1a1a] text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bandwidth Tab */}
      {activeTab === 'bandwidth' && (
        <div className="space-y-6">
          {/* Permission Warning */}
          {rrdPermissionDenied && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-orange-500 font-semibold">Permission insuffisante</h4>
                <p className="text-gray-400 text-sm mt-1">
                  La permission <span className="text-white font-medium">"Modification des réglages de la Freebox"</span> est
                  nécessaire pour afficher les statistiques moyennes et maximales des débits.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Allez dans Freebox OS → Paramètres → Gestion des accès → Applications → Sélectionnez cette application et activez la permission.
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`bg-[#121212] rounded-xl p-4 border border-gray-800 ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Download className="w-4 h-4 text-blue-500" />
                Débit moyen ↓
              </div>
              <div className="text-2xl font-bold text-white">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.avgDown * 1024)}
              </div>
            </div>
            <div className={`bg-[#121212] rounded-xl p-4 border border-gray-800 ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Upload className="w-4 h-4 text-green-500" />
                Débit moyen ↑
              </div>
              <div className="text-2xl font-bold text-white">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.avgUp * 1024)}
              </div>
            </div>
            <div className={`bg-[#121212] rounded-xl p-4 border border-gray-800 ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Zap className="w-4 h-4 text-blue-500" />
                Débit max ↓
              </div>
              <div className="text-2xl font-bold text-white">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.maxDown * 1024)}
              </div>
            </div>
            <div className={`bg-[#121212] rounded-xl p-4 border border-gray-800 ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Zap className="w-4 h-4 text-green-500" />
                Débit max ↑
              </div>
              <div className="text-2xl font-bold text-white">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.maxUp * 1024)}
              </div>
            </div>
          </div>

          {/* Current Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Débit actuel descendant</span>
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-4xl font-bold text-blue-500">
                {status ? formatSpeed(status.rate_down) : '0 bps'}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Bande passante: {status ? formatBitrate(status.bandwidth_down) : 'N/A'}
              </div>
            </div>
            <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Débit actuel montant</span>
                <Upload className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-4xl font-bold text-green-500">
                {status ? formatSpeed(status.rate_up) : '0 bps'}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Bande passante: {status ? formatBitrate(status.bandwidth_up) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Bandwidth Chart */}
          <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {extendedHistory.length > 0 ? 'Historique bande passante' : 'Bande passante temps réel'}
              </h3>
              <span className="text-xs text-gray-500">
                {extendedHistory.length > 0
                  ? `${extendedHistory.length} points (RRD)`
                  : `${history.length} points (live)`}
              </span>
            </div>
            <div className="h-80">
              {(extendedHistory.length > 0 || history.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={extendedHistory.length > 0 ? extendedHistory : history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="time"
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#6b7280"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(value) => formatKBSpeed(value).split(' ')[0]}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value: number, _name: string, props: { dataKey: string }) => {
                        const label = props.dataKey === 'download' ? 'Descendant' : 'Montant';
                        const color = props.dataKey === 'download' ? COLORS.blue : COLORS.green;
                        return [
                          <span style={{ color }}>{formatKBSpeed(value)}</span>,
                          label
                        ];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="download"
                      stackId="1"
                      stroke={COLORS.blue}
                      fill={COLORS.blue}
                      fillOpacity={0.3}
                      name="Descendant"
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      stackId="2"
                      stroke={COLORS.green}
                      fill={COLORS.green}
                      fillOpacity={0.3}
                      name="Montant"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Activity className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Collecte des données en cours...</p>
                  <p className="text-xs mt-1">Le graphique se remplira automatiquement</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Temperature Tab */}
      {activeTab === 'temperature' && (
        <div className="space-y-6">
          {/* Stats summary cards - always 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Temperature */}
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Cpu className="w-4 h-4 text-orange-500" />
                CPU {cpuSensors.length > 1 ? '(Moyenne)' : ''}
              </div>
              <div className="text-2xl font-bold text-white">
                {cpuAvgTemp != null ? `${cpuAvgTemp}°C` : 'N/A'}
              </div>
              {cpuSensors.length > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {cpuSensors.length} capteurs
                </div>
              )}
            </div>

            {/* Max CPU Temp */}
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                CPU Max
              </div>
              <div className="text-2xl font-bold text-white">
                {cpuSensors.length > 0 ? `${Math.max(...cpuSensors.map(s => s.value))}°C` : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pic actuel
              </div>
            </div>

            {/* Fan Speed */}
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Fan className="w-4 h-4 text-cyan-500" />
                Ventilateur {fans.length > 1 ? '(Moyenne)' : ''}
              </div>
              <div className="text-2xl font-bold text-white">
                {fanAvgRpm != null ? `${fanAvgRpm} T/min` : 'N/A'}
              </div>
              {fans.length > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {fans.length} ventilateurs
                </div>
              )}
            </div>

            {/* HDD Temperature or placeholder */}
            {hddSensors.length > 0 ? (
              <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <HardDrive className="w-4 h-4 text-blue-500" />
                  Disque {hddSensors.length > 1 ? '(Moyenne)' : ''}
                </div>
                <div className="text-2xl font-bold text-white">
                  {hddAvgTemp != null ? `${hddAvgTemp}°C` : 'N/A'}
                </div>
                {hddSensors.length > 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {hddSensors.length} disques
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Thermometer className="w-4 h-4 text-purple-500" />
                  T° Max historique
                </div>
                <div className="text-2xl font-bold text-white">
                  {tempStats.maxCpu > 0 ? `${tempStats.maxCpu}°C` : 'N/A'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Sur la période
                </div>
              </div>
            )}
          </div>

          {/* Detailed Sensors - 2 columns layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CPU Sensors Detail */}
            {cpuSensors.length > 0 && (
              <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-orange-500" />
                  Températures CPU
                </h3>
                <div className="space-y-3">
                  {cpuSensors.map((sensor) => (
                    <div key={sensor.id} className="flex justify-between items-center">
                      <span className="text-gray-400">{sensor.name}</span>
                      <span className={`font-semibold ${
                        sensor.value > 70 ? 'text-red-500' : sensor.value > 50 ? 'text-orange-500' : 'text-green-500'
                      }`}>
                        {sensor.value}°C
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Moyenne</span>
                      <span className="text-white font-semibold">{cpuAvgTemp}°C</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (cpuAvgTemp || 0) > 70 ? 'bg-red-500' : (cpuAvgTemp || 0) > 50 ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, ((cpuAvgTemp || 0) / 100) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fans Detail */}
            {fans.length > 0 && (
              <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Fan className="w-5 h-5 text-cyan-500" />
                  Ventilateurs
                </h3>
                <div className="space-y-3">
                  {fans.map((fan) => (
                    <div key={fan.id} className="flex justify-between items-center">
                      <span className="text-gray-400">{fan.name}</span>
                      <span className="text-cyan-500 font-semibold">{fan.value} T/min</span>
                    </div>
                  ))}
                  {fans.length > 1 && (
                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Moyenne</span>
                        <span className="text-white font-semibold">{fanAvgRpm} T/min</span>
                      </div>
                    </div>
                  )}
                  {/* Add some padding to match CPU card height when there's only 1 fan */}
                  {fans.length === 1 && cpuSensors.length > 2 && (
                    <div className="pt-4" />
                  )}
                </div>
              </div>
            )}

            {/* HDD Sensors Detail */}
            {hddSensors.length > 0 && (
              <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-500" />
                  Températures Disques
                </h3>
                <div className="space-y-3">
                  {hddSensors.map((sensor) => (
                    <div key={sensor.id} className="flex justify-between items-center">
                      <span className="text-gray-400">{sensor.name}</span>
                      <span className={`font-semibold ${
                        sensor.value > 50 ? 'text-red-500' : sensor.value > 40 ? 'text-orange-500' : 'text-blue-500'
                      }`}>
                        {sensor.value}°C
                      </span>
                    </div>
                  ))}
                  {hddSensors.length > 1 && (
                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Moyenne</span>
                        <span className="text-white font-semibold">{hddAvgTemp}°C</span>
                      </div>
                    </div>
                  )}
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, ((hddAvgTemp || 0) / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Other Sensors (if any) */}
            {otherSensors.length > 0 && (
              <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-purple-500" />
                  Autres capteurs
                </h3>
                <div className="space-y-3">
                  {otherSensors.map((sensor) => (
                    <div key={sensor.id} className="flex justify-between items-center">
                      <span className="text-gray-400">{sensor.name}</span>
                      <span className="text-purple-500 font-semibold">{sensor.value}°C</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Temperature Chart */}
          <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Historique température</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temperatureHistory.length ? temperatureHistory : systemTempHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    domain={[20, 80]}
                    tickFormatter={(value) => `${value}°`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        cpuM: 'CPU (Moyenne)',
                        sw: 'Switch',
                        hdd: 'Disque'
                      };
                      return [`${value}°C`, labels[name] || name];
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cpuM" stroke={COLORS.orange} name="CPU (Moyenne)" dot={false} />
                  {tempStats.avgSw > 0 && <Line type="monotone" dataKey="sw" stroke={COLORS.cyan} name="Switch" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* WiFi Tab */}
      {activeTab === 'wifi' && (
        <div className="space-y-6">
          {/* WiFi Overview - Appareils par bande */}
          <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-500" />
              Appareils par bande WiFi
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Always show 2.4GHz (all models support it) */}
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-400">2.4 GHz</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {networks.find(n => n.band === '2.4GHz')?.connectedDevices || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">appareils</div>
              </div>

              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-400">5 GHz</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {networks.find(n => n.band === '5GHz')?.connectedDevices || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">appareils</div>
              </div>

              {/* Show 6GHz only if supported (Ultra v9, Delta v7) */}
              {capabilities?.wifi6ghz && (
                <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium text-gray-400">6 GHz</span>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {networks.find(n => n.band === '6GHz')?.connectedDevices || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">appareils</div>
                </div>
              )}
            </div>
          </div>

          {/* WiFi Networks Detail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {networks.map((network, index) => (
              <div key={network.id} className="bg-[#121212] rounded-xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      network.band === '6GHz' ? 'bg-cyan-500/20' :
                      network.band === '5GHz' ? 'bg-blue-500/20' :
                      'bg-green-500/20'
                    }`}>
                      <Wifi className={`w-5 h-5 ${
                        network.band === '6GHz' ? 'text-cyan-500' :
                        network.band === '5GHz' ? 'text-blue-500' :
                        'text-green-500'
                      }`} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{network.ssid}</div>
                      <div className="text-sm text-gray-500">{network.band}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    network.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {network.active ? 'Actif' : 'Inactif'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Canal</span>
                    <div className="text-white font-medium">{network.channel || 'Auto'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Largeur</span>
                    <div className="text-white font-medium">{network.channelWidth} MHz</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Appareils</span>
                    <div className="text-white font-medium">{network.connectedDevices}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Charge</span>
                    <div className="text-white font-medium">{network.load || 0}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* WiFi Distribution Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Appareils par bande</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wifiBandDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {wifiBandDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Types d'appareils</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceDistribution.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#6b7280"
                      width={80}
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Server className="w-4 h-4 text-blue-500" />
                Modèle
              </div>
              <div className="text-lg font-bold text-white truncate">
                {info?.board_name || 'Freebox'}
              </div>
            </div>
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <HardDrive className="w-4 h-4 text-green-500" />
                Firmware
              </div>
              <div className="text-lg font-bold text-white">
                {info?.firmware_version || 'N/A'}
              </div>
            </div>
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                Uptime
              </div>
              <div className="text-lg font-bold text-white">
                {info?.uptime || 'N/A'}
              </div>
            </div>
            <div className="bg-[#121212] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Disponibilité
              </div>
              <div className="text-lg font-bold text-white">
                {uptimePercentage}%
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Informations système</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Numéro de série</span>
                  <span className="text-white font-mono">{info?.serial || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Adresse MAC</span>
                  <span className="text-white font-mono">{info?.mac || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Disques</span>
                  <span className="text-white">{info?.disk_status || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Authentifié</span>
                  <span className={info?.box_authenticated ? 'text-green-500' : 'text-red-500'}>
                    {info?.box_authenticated ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">État du réseau</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">État connexion</span>
                  <span className={`font-semibold ${
                    status?.state === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {status?.state === 'up' ? 'Connecté' : status?.state || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-white">{status?.type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IPv4</span>
                  <span className="text-white font-mono">{status?.ipv4 || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IPv6</span>
                  <span className="text-white font-mono text-sm truncate max-w-48">
                    {status?.ipv6 || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Uptime Chart */}
          <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Historique disponibilité (30 jours)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uptimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#ffffff' }}
                    formatter={(value: number) => [`${value}%`, 'Disponibilité']}
                  />
                  <Bar
                    dataKey="uptime"
                    radius={[2, 2, 0, 0]}
                  >
                    {uptimeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status === 'up' ? COLORS.green : entry.status === 'down' ? COLORS.red : COLORS.orange}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Connected Devices Summary */}
          <div className="bg-[#121212] rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Appareils connectés</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
                <div className="text-3xl font-bold text-white">{devices.length}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
                <div className="text-3xl font-bold text-green-500">
                  {devices.filter(d => d.active).length}
                </div>
                <div className="text-sm text-gray-500">En ligne</div>
              </div>
              <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
                <div className="text-3xl font-bold text-gray-500">
                  {devices.filter(d => !d.active).length}
                </div>
                <div className="text-sm text-gray-500">Hors ligne</div>
              </div>
              <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
                <div className="text-3xl font-bold text-blue-500">
                  {networks.reduce((sum, n) => sum + n.connectedDevices, 0)}
                </div>
                <div className="text-sm text-gray-500">WiFi</div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};