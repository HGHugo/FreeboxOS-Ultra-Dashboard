import React, { useEffect, useState, useCallback } from 'react';
import { ArrowDown, ArrowUp, RefreshCw, Info, Wifi, Zap, Clock } from 'lucide-react';
import { SparkLine } from './SparkLine';
import { Tooltip } from '../ui/Tooltip';
import { api } from '../../api/client';

interface BandwidthInfo {
  downloadMax: number; // Gbps
  uploadMax: number;   // Gbps
  downloadRate: number;
  uploadRate: number;
  state: string;
  type: string;
  media: string;
}

interface PingResult {
  latency: number;
  jitter: number;
  packetLoss: number;
}

export const SpeedtestWidget: React.FC = () => {
  const [bandwidthInfo, setBandwidthInfo] = useState<BandwidthInfo | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch bandwidth only (fast, for real-time rate)
  const fetchBandwidth = useCallback(async () => {
    try {
      const bandwidthResponse = await api.get<BandwidthInfo>('/api/speedtest/bandwidth');
      if (bandwidthResponse.success && bandwidthResponse.result) {
        setBandwidthInfo(bandwidthResponse.result);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[Speedtest] Bandwidth error:', err);
    }
  }, []);

  // Fetch all data including ping (slower)
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch bandwidth info
      await fetchBandwidth();

      // Fetch ping (quick 5 pings)
      const pingResponse = await api.get<{ latency: number; jitter: number; packetLoss: number }>(
        '/api/speedtest/ping?count=5'
      );
      console.log('[SpeedtestWidget] Ping response:', pingResponse);
      if (pingResponse.success && pingResponse.result) {
        console.log('[SpeedtestWidget] Setting ping result:', pingResponse.result);
        setPingResult(pingResponse.result);
      } else {
        console.log('[SpeedtestWidget] Ping failed:', pingResponse.error);
      }
    } catch (err) {
      console.error('[Speedtest] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchBandwidth]);

  useEffect(() => {
    // Initial fetch with ping
    fetchAllData();

    // Fast refresh for bandwidth only (every 2 seconds)
    const bandwidthInterval = setInterval(fetchBandwidth, 2000);

    // Slow refresh for ping (every 60 seconds)
    const pingInterval = setInterval(fetchAllData, 60000);

    return () => {
      clearInterval(bandwidthInterval);
      clearInterval(pingInterval);
    };
  }, [fetchAllData, fetchBandwidth]);

  // Format speed for display (speed is in Gbps)
  const formatSpeedValue = (speedGbps: number | undefined): { value: string; unit: string } => {
    if (speedGbps === undefined || speedGbps <= 0) {
      return { value: '--', unit: 'Gbps' };
    }
    if (speedGbps >= 1) {
      return { value: speedGbps.toFixed(2), unit: 'Gbps' };
    }
    const mbps = speedGbps * 1000;
    if (mbps >= 1) {
      return { value: mbps.toFixed(0), unit: 'Mbps' };
    }
    const kbps = mbps * 1000;
    return { value: kbps.toFixed(0), unit: 'Kbps' };
  };

  const downloadMax = formatSpeedValue(bandwidthInfo?.downloadMax);
  const uploadMax = formatSpeedValue(bandwidthInfo?.uploadMax);

  return (
    <div className="flex flex-col gap-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Wifi size={14} className={bandwidthInfo?.state === 'up' ? 'text-emerald-400' : 'text-gray-500'} />
          <span>{bandwidthInfo?.type ?? '--'} {bandwidthInfo?.media ?? ''}</span>
        </div>
        <button
          onClick={fetchAllData}
          disabled={isLoading}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Actualiser"
        >
          <RefreshCw size={14} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Capacity info banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-800/50 rounded-lg">
        <Info size={14} className="text-blue-400 flex-shrink-0" />
        <span className="text-xs text-blue-400">
          Débit synchronisé de votre ligne fibre
        </span>
      </div>

      {/* Speed cards - Max capacity */}
      <div className="grid grid-cols-2 gap-4">
        {/* Download */}
        <div className="bg-[#151515] flex flex-col p-4 rounded-lg border border-gray-800">
          <div className="flex flex-grow items-center justify-center gap-2 text-xs text-gray-500 mb-2">
            <ArrowDown size={14} className="text-blue-500" />
            Débit descendant maximal
            <Tooltip content="Débit théorique maximal">
              <Info size={14} className="text-gray-600 cursor-help" />
            </Tooltip>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold text-white">{downloadMax.value}</span>
            <span className="text-sm text-gray-400">{downloadMax.unit}</span>
          </div>
        </div>

        {/* Upload */}
        <div className="bg-[#151515] flex flex-col p-4 rounded-lg border border-gray-800">
          <div className="flex flex-grow items-center justify-center gap-2 text-xs text-gray-500 mb-2">
            <ArrowUp size={14} className="text-emerald-500" />
            Débit montant maximal
            <Tooltip content="Débit théorique maximal">
              <Info size={14} className="text-gray-600 cursor-help" />
            </Tooltip>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold text-white">{uploadMax.value}</span>
            <span className="text-sm text-gray-400">{uploadMax.unit}</span>
          </div>
        </div>
      </div>

      {/* Network stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#151515] p-3 rounded-lg border border-gray-800 text-center">
          <div className="text-xs text-gray-500 mb-1">Ping</div>
          <div className="text-lg font-bold text-white">
            {pingResult?.latency != null ? `${pingResult.latency.toFixed(1)}` : '--'}
            <span className="text-xs text-gray-500 ml-1">ms</span>
          </div>
        </div>
        <div className="bg-[#151515] p-3 rounded-lg border border-gray-800 text-center">
          <div className="text-xs text-gray-500 mb-1">Gigue</div>
          <div className="text-lg font-bold text-white">
            {pingResult?.jitter != null ? (
              pingResult.jitter === 0 ? (
                <span className="text-sm text-gray-500">N/A</span>
              ) : (
                `${pingResult.jitter.toFixed(1)}`
              )
            ) : '--'}
            {pingResult?.jitter != null && pingResult.jitter !== 0 && (
              <span className="text-xs text-gray-500 ml-1">ms</span>
            )}
          </div>
        </div>
        <div className="bg-[#151515] p-3 rounded-lg border border-gray-800 text-center">
          <div className="text-xs text-gray-500 mb-1">Perte</div>
          <div className="text-lg font-bold text-white">
            {pingResult?.packetLoss != null ? `${pingResult.packetLoss}` : '--'}
            <span className="text-xs text-gray-500 ml-1">%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono border-t border-gray-800 pt-2">
        <div className="flex items-center gap-1">
          <Zap size={10} className={bandwidthInfo?.state === 'up' ? 'text-emerald-400' : 'text-red-400'} />
          {bandwidthInfo?.state === 'up' ? 'Connecté' : bandwidthInfo?.state ?? 'Déconnecté'}
        </div>
        {lastUpdate && (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
};

// Compact speedtest result for history
interface SpeedtestResultCompactProps {
  downloadSpeed: number;
  uploadSpeed: number;
  ping: number;
  jitter: number;
  type: string;
  downloadHistory?: number[];
  uploadHistory?: number[];
}

export const SpeedtestResultCompact: React.FC<SpeedtestResultCompactProps> = ({
  downloadSpeed,
  uploadSpeed,
  ping,
  jitter,
  type,
  downloadHistory = [],
  uploadHistory = []
}) => {
  const formatSpeed = (speed: number): string => {
    if (speed >= 1) {
      return `${speed.toFixed(2)} Gbps`;
    }
    return `${(speed * 1000).toFixed(0)} Mbps`;
  };

  return (
    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-gray-800">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Descendant</div>
          <div className="text-lg font-bold text-white flex items-center gap-1">
            {formatSpeed(downloadSpeed)} <ArrowDown size={14} className="text-blue-500" />
          </div>
          <div className="h-6 mt-1">
            <SparkLine data={downloadHistory.length ? downloadHistory : [downloadSpeed]} color="#3b82f6" height={24} />
          </div>
        </div>
        <div className="w-[1px] bg-gray-800" />
        <div className="flex-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Montant</div>
          <div className="text-lg font-bold text-white flex items-center gap-1">
            {formatSpeed(uploadSpeed)} <ArrowUp size={14} className="text-blue-500" />
          </div>
          <div className="h-6 mt-1">
            <SparkLine data={uploadHistory.length ? uploadHistory : [uploadSpeed]} color="#3b82f6" height={24} />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-3 text-[10px] text-gray-500 font-mono">
        <span>Ping {ping}ms</span>
        <span>Gigue {jitter}ms</span>
        <span>Type {type}</span>
      </div>
    </div>
  );
};
