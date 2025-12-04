import React, { useState, useEffect, useRef } from 'react';
import { QrCode, X, Copy, Check, Wifi } from 'lucide-react';
import { Toggle } from '../ui/Toggle';
import type { WifiNetwork } from '../../types';

interface WifiPanelProps {
  networks: WifiNetwork[];
  totalDevices?: number;
  onToggle?: (id: string, enabled: boolean) => void;
}

// QR Code Modal component
const QrCodeModal: React.FC<{
  network: WifiNetwork;
  password?: string;
  onClose: () => void;
}> = ({ network, password, onClose }) => {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple QR code generation using canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Create a simple placeholder QR pattern (in production, use a library like qrcode)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#000000';
    const moduleSize = 8;
    const qrSize = Math.floor(size / moduleSize);

    // Generate pseudo-random pattern based on SSID (visual placeholder)
    const seed = network.ssid.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        // Corner patterns (finder patterns)
        const isCorner = (x < 7 && y < 7) ||
                        (x >= qrSize - 7 && y < 7) ||
                        (x < 7 && y >= qrSize - 7);

        if (isCorner) {
          const inBorder = x === 0 || x === 6 || y === 0 || y === 6 ||
                          x === qrSize - 1 || x === qrSize - 7 ||
                          y === qrSize - 1 || y === qrSize - 7;
          const inCenter = (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                          (x >= qrSize - 5 && x <= qrSize - 3 && y >= 2 && y <= 4) ||
                          (x >= 2 && x <= 4 && y >= qrSize - 5 && y <= qrSize - 3);
          if (inBorder || inCenter) {
            ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
          }
        } else {
          // Data pattern
          const val = ((seed * (x + 1) * (y + 1)) % 100);
          if (val > 50) {
            ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
          }
        }
      }
    }

    // Add WiFi icon in center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size/2 - 20, size/2 - 20, 40, 40);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(size/2, size/2 + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    // Signal arcs
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(size/2, size/2 + 5, 8 + i * 6, Math.PI * 1.25, Math.PI * 1.75);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [network.ssid]);

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
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-4">
            <canvas ref={canvasRef} className="w-[200px] h-[200px]" />
          </div>

          {/* Network info */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-white">{network.ssid}</h3>
            <p className="text-sm text-gray-500">{network.band} - Canal {network.channel}</p>
          </div>

          {/* Password display */}
          {password ? (
            <div className="w-full">
              <p className="text-xs text-gray-500 mb-1">Mot de passe</p>
              <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
                <code className="flex-1 text-sm text-white font-mono">{password}</code>
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
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Scannez ce QR code avec votre appareil pour vous connecter
            </p>
          )}

          <p className="text-xs text-gray-600 mt-4 text-center">
            Note: Pour un QR code fonctionnel, le mot de passe WiFi doit être configuré dans les paramètres.
          </p>
        </div>
      </div>
    </div>
  );
};

export const WifiPanel: React.FC<WifiPanelProps> = ({ networks, onToggle }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);

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
                    onChange={(checked) => onToggle?.(net.id, checked)}
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