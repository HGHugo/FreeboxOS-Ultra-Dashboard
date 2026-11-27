import React, { useState, useEffect } from 'react';
import { QrCode, X, Copy, Check, Wifi, Eye, EyeOff } from 'lucide-react';
import QRCode from 'qrcode';
import { Toggle } from '../ui/Toggle';
import type { WifiNetwork } from '../../types';

interface WifiPanelProps {
  networks: WifiNetwork[];
  totalDevices?: number;
  onToggle?: (id: string, enabled: boolean) => void;
}

// Generate WiFi connection string for QR code (standard format)
const generateWifiString = (ssid: string, password: string, security: string = 'WPA'): string => {
  // Escape special characters in SSID and password
  const escapeString = (str: string) => str.replace(/([\\;,:"'])/g, '\\$1');
  return `WIFI:T:${security};S:${escapeString(ssid)};P:${escapeString(password)};;`;
};

// QR Code Modal component
const QrCodeModal: React.FC<{
  network: WifiNetwork;
  onClose: () => void;
}> = ({ network, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Generate QR code URL when password changes
  useEffect(() => {
    if (password.length >= 8) {
      const wifiString = generateWifiString(network.ssid, password);
      // SECURITY: generate the QR code locally. Upstream sent the SSID and the
      // Wi-Fi password to api.qrserver.com (third party) in the URL.
      let cancelled = false;
      QRCode.toDataURL(wifiString, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then((url) => { if (!cancelled) setQrUrl(url); })
        .catch(() => { if (!cancelled) setQrUrl(null); });
      return () => { cancelled = true; };
    } else {
      setQrUrl(null);
    }
  }, [password, network.ssid]);

  const handleCopyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#151515] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden max-w-sm w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <Wifi size={20} className="text-blue-400" />
            <span className="font-medium text-white">Connexion WiFi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Network info */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-white">{network.ssid}</h3>
            <p className="text-sm text-gray-500">{network.band} - Canal {network.channel}</p>
          </div>

          {/* Password input */}
          <div className="w-full mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Mot de passe WiFi</label>
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                className="flex-1 bg-transparent text-sm text-white font-mono focus:outline-none placeholder:text-gray-600"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? (
                  <EyeOff size={16} className="text-gray-400" />
                ) : (
                  <Eye size={16} className="text-gray-400" />
                )}
              </button>
              {password && (
                <button
                  onClick={handleCopyPassword}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="Copier"
                >
                  {copied ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} className="text-gray-400" />
                  )}
                </button>
              )}
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-orange-400 mt-1">Le mot de passe doit contenir au moins 8 caractères</p>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-4 min-h-[232px] min-w-[232px] flex items-center justify-center">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code WiFi"
                className="w-[200px] h-[200px]"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center text-gray-400">
                  <QrCode size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Entrez le mot de passe<br />pour générer le QR code</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            {qrUrl
              ? 'Scannez ce QR code avec votre appareil pour vous connecter automatiquement'
              : 'L\'API Freebox ne retourne pas les mots de passe WiFi pour des raisons de sécurité'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const WifiPanel: React.FC<WifiPanelProps> = ({ networks, onToggle }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);

  // Handle WiFi toggle with confirmation - warns that it may restart WiFi module
  const handleToggle = (net: WifiNetwork, enabled: boolean) => {
    const action = enabled ? 'activer' : 'désactiver';
    const confirmed = window.confirm(
      `⚠️ Attention !\n\nVous allez ${action} le réseau WiFi "${net.ssid}" (${net.band}).\n\nCette action peut redémarrer le module WiFi de la Freebox et couper temporairement toutes les connexions WiFi.\n\nContinuer ?`
    );
    if (!confirmed) return;
    onToggle?.(net.id, enabled);
  };

  return (
    <>
      <div className="space-y-4">
        {networks.map((net) => {
          // Use device count and load from network (computed in store)
          const deviceCount = net.connectedDevices;
          const estimatedLoad = net.load;

          return (
            <div key={net.id} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700/50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-medium text-gray-300">
                    SSID <span className="text-white">{net.ssid}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    WIFI {net.band} / {net.channelWidth} MHz / Canal {net.channel || 'Auto'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={net.active}
                    onChange={(checked) => handleToggle(net, checked)}
                    size="sm"
                  />
                  <button
                    onClick={() => setSelectedNetwork(net)}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Afficher QR code"
                  >
                    <QrCode size={18} className="text-gray-400 hover:text-white transition-colors" />
                  </button>
                </div>
              </div>

              {/* Signal bars */}
              <div className="flex items-end gap-[2px] h-8 mt-2">
                {Array.from({ length: 40 }).map((_, idx) => {
                  const isActive = idx < (estimatedLoad / 100) * 40;
                  const baseHeight = 20 + Math.sin(idx * 0.3) * 15 + Math.random() * 10;

                  return (
                    <div
                      key={idx}
                      className={`w-[2px] rounded-t-sm transition-all duration-500 ${
                        isActive ? 'bg-emerald-500' : 'bg-gray-800'
                      }`}
                      style={{ height: `${Math.max(baseHeight, 20)}%` }}
                    />
                  );
                })}
              </div>

              <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
                <span>Taux d'occupation {estimatedLoad}%</span>
                <span className="text-emerald-400">Appareils {deviceCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Modal */}
      {selectedNetwork && (
        <QrCodeModal
          network={selectedNetwork}
          onClose={() => setSelectedNetwork(null)}
        />
      )}
    </>
  );
};