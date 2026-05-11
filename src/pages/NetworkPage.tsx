import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  ChevronLeft,
  Smartphone,
  Laptop,
  Monitor,
  Tv,
  Globe,
  Tablet,
  Car,
  Wifi,
  Cable,
  Router,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';
import { useLanStore } from '../stores/lanStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useCapabilitiesStore } from '../stores/capabilitiesStore';
import { formatSpeed } from '../utils/constants';
import type { Device } from '../types';

interface NetworkPageProps {
  onBack: () => void;
}

// ──── Pan & Zoom constants ────
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;
const ZOOM_WHEEL_FACTOR = 0.001;

// ──── logo.dev integration ────
const LOGO_DEV_PUBLIC_KEY = import.meta.env.VITE_LOGO_DEV_TOKEN || '';
const logoUrl = (domain: string, light = false) =>
  LOGO_DEV_PUBLIC_KEY
    ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}&format=png${light ? '&theme=dark' : ''}`
    : '';

// Domains that look better with theme=light (dark logos on dark bg)
const LIGHT_THEME_DOMAINS = new Set(['apple.com', 'samsung.com']);

// Map device name / vendor / type to a logo.dev domain
function getLogoDomain(name: string, vendor?: string, type?: string): string | null {
  const lower = `${name} ${vendor || ''}`.toLowerCase();

  // ── Vendor / brand keywords → domain ──
  const BRAND_MAP: [RegExp, string][] = [
    [/apple|iphone|ipad|macbook|mac-?mini|mac-?pro|mac-?studio|imac|airpods|homepod|apple\s?tv/, 'apple.com'],
    [/samsung|galaxy/,       'samsung.com'],
    [/google|pixel|nest|chromecast/, 'google.com'],
    [/huawei/,               'huawei.com'],
    [/xiaomi|redmi|poco/,    'xiaomi.com'],
    [/oneplus/,              'oneplus.com'],
    [/sony|playstation|ps[45]/, 'sony.com'],
    [/microsoft|xbox|surface/, 'microsoft.com'],
    [/nintendo|switch/,      'nintendo.com'],
    [/raspberry|pi[0-9]/,    'raspberrypi.com'],
    [/docker/,               'docker.com'],
    [/proxmox/,              'proxmox.com'],
    [/synology/,             'synology.com'],
    [/qnap/,                 'qnap.com'],
    [/ubiquiti|unifi|usw|uap/, 'ui.com'],
    [/tp-?link|archer|deco/, 'tp-link.com'],
    [/netgear/,              'netgear.com'],
    [/asus/,                 'asus.com'],
    [/dell/,                 'dell.com'],
    [/hp\b|hewlett/,         'hp.com'],
    [/lenovo|thinkpad/,      'lenovo.com'],
    [/fujitsu/,              'fujitsu.com'],
    [/nvidia|shield/,        'nvidia.com'],
    [/amazon|alexa|echo|kindle|fire\s?tv/, 'amazon.com'],
    [/sonos/,                'sonos.com'],
    [/philips|hue/,          'philips.com'],
    [/lg\b/,                 'lg.com'],
    [/bose/,                 'bose.com'],
    [/roku/,                 'roku.com'],
    [/tesla/,                'tesla.com'],
    [/immich/,               'immich.app'],
    [/tailscale/,            'tailscale.com'],
    [/plex/,                 'plex.tv'],
    [/jellyfin/,             'jellyfin.org'],
    [/home-?assistant|hass/, 'home-assistant.io'],
    [/freebox|free\.fr/,     'free.fr'],
  ];

  for (const [re, domain] of BRAND_MAP) {
    if (re.test(lower)) return domain;
  }

  // Fallback by device type
  if (type === 'tv') return 'samsung.com';
  if (type === 'car') return 'tesla.com';

  return null;
}

// ──── Fallback Lucide icon ────
const DeviceNodeIcon: React.FC<{ type: Device['type']; className?: string }> = ({ type, className = '' }) => {
  const cn = `w-7 h-7 ${className}`;
  switch (type) {
    case 'phone':      return <Smartphone className={cn} />;
    case 'tablet':     return <Tablet className={cn} />;
    case 'laptop':     return <Laptop className={cn} />;
    case 'desktop':    return <Monitor className={cn} />;
    case 'tv':         return <Tv className={cn} />;
    case 'car':        return <Car className={cn} />;
    case 'repeater':   return <Wifi className={cn} />;
    case 'iot':
    default:           return <Globe className={cn} />;
  }
};

// ──── Logo image with Lucide fallback ────
const LogoImage: React.FC<{
  domain: string | null;
  fallbackType: Device['type'];
  alt: string;
  size?: string;
}> = ({ domain, fallbackType, alt, size = 'w-7 h-7' }) => {
  const [failed, setFailed] = useState(false);
  const url = domain ? logoUrl(domain, LIGHT_THEME_DOMAINS.has(domain)) : '';

  if (!domain || !url || failed) {
    return <DeviceNodeIcon type={fallbackType} />;
  }

  return (
    <img
      src={url}
      alt={`${alt} logo in PNG format`}
      className={`${size} object-contain rounded-sm`}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
};

// ──── Animated SVG flow line ────
const FlowLine: React.FC<{
  x1: number; y1: number;
  x2: number; y2: number;
  isWifi: boolean;
  active: boolean;
  index: number;
}> = ({ x1, y1, x2, y2, isWifi, active, index }) => {
  const color = active ? (isWifi ? '#3b82f6' : '#10b981') : '#374151';
  const id = `flow-${index}`;

  // Compute a cubic bézier with a smooth curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.4;
  const cy1 = y1;
  const cx2 = x1 + dx * 0.6;
  const cy2 = y2;
  const pathD = `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;

  // Compute path length estimate for animation
  const dist = Math.sqrt(dx * dx + dy * dy);

  // WiFi: multiple accelerating particles stream; Ethernet: single dot on solid line
  const PARTICLE_COUNT = 14;
  // Stagger offsets so particles are evenly spaced along the path
  const baseDur = 1.8 + (index % 3) * 0.3;

  return (
    <g>
      {/* Background path */}
      {isWifi && active ? (
        // WiFi: dashed faint trail
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.12}
          strokeLinecap="round"
          strokeDasharray="6 10"
        />
      ) : (
        // Ethernet / inactive: solid line
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={active ? 2.5 : 1.5}
          strokeOpacity={active ? 0.25 : 0.15}
          strokeLinecap="round"
        />
      )}

      {/* Animated particles (only for active devices) */}
      {active && isWifi && (
        <>
          {/* Stream of accelerating dots along the curve */}
          {Array.from({ length: PARTICLE_COUNT }).map((_, pi) => {
            // Each particle has a slightly different duration (accelerating feel)
            // Earlier particles are faster, later ones slower — creates a burst effect
            const dur = baseDur + pi * 0.15;
            // Stagger start using negative begin offset (SVG trick)
            const delay = (pi / PARTICLE_COUNT) * baseDur;
            // Particle size: leading particles are bigger
            const r = 3.2 - pi * 0.3;
            const opacity = 0.95 - pi * 0.1;

            return (
              <g key={pi}>
                {/* Colored dot */}
                <circle r={Math.max(r, 1.2)} fill={color} opacity={opacity}>
                  <animateMotion
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                    begin={`-${delay}s`}
                    path={pathD}
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.4 0 0.2 1"
                  />
                </circle>
                {/* White core on the first 2 particles for extra glow */}
                {pi < 2 && (
                  <circle r={Math.max(r * 0.5, 0.8)} fill="white" opacity={0.7}>
                    <animateMotion
                      dur={`${dur}s`}
                      repeatCount="indefinite"
                      begin={`-${delay}s`}
                      path={pathD}
                      calcMode="spline"
                      keyTimes="0;1"
                      keySplines="0.4 0 0.2 1"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </>
      )}

      {/* Ethernet active: gradient sweep + single dot */}
      {active && !isWifi && (
        <>
          <path
            d={pathD}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="50%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values={`-${dist},0; ${dist},0`}
                dur={`${2 + (index % 3) * 0.5}s`}
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>
          <circle r="3.5" fill={color} opacity="0.9">
            <animateMotion
              dur={`${2.5 + (index % 4) * 0.4}s`}
              repeatCount="indefinite"
              path={pathD}
            />
          </circle>
          <circle r="2" fill="white" opacity="0.7">
            <animateMotion
              dur={`${2.5 + (index % 4) * 0.4}s`}
              repeatCount="indefinite"
              path={pathD}
            />
          </circle>
        </>
      )}
    </g>
  );
};

// ──── Device node card ────
const DeviceNode: React.FC<{
  device: Device;
  x: number;
  y: number;
}> = ({ device, x, y }) => {
  const speedDown = device.active ? formatSpeed(device.speedDown * 1_000_000 / 8) : '0 bps';
  const speedUp = device.active ? formatSpeed(device.speedUp * 1_000_000 / 8) : '0 bps';

  return (
    <foreignObject x={x - 70} y={y - 40} width="140" height="100" overflow="visible">
      <div className="flex flex-col items-center gap-1 select-none">
        <div className="w-12 h-12 flex items-center justify-center">
          <LogoImage
            domain={getLogoDomain(device.name, device.vendor, device.type)}
            fallbackType={device.type}
            alt={device.name}
          />
        </div>
        <span className={`text-[11px] font-semibold text-center leading-tight max-w-[130px] truncate ${
          device.active ? 'text-white' : 'text-gray-500'
        }`}>
          {device.name}
        </span>
        {device.ip && (
          <span className="text-[9px] text-gray-500 font-mono">{device.ip}</span>
        )}
        <div className="flex items-center gap-1.5 text-[9px]">
          {device.connection === 'wifi' ? (
            <Wifi size={8} className={device.active ? 'text-blue-400' : 'text-gray-600'} />
          ) : (
            <Cable size={8} className={device.active ? 'text-emerald-400' : 'text-gray-600'} />
          )}
          <span className={device.active ? 'text-gray-400' : 'text-gray-600'}>
            ↓ {speedDown}
          </span>
          <span className={device.active ? 'text-gray-400' : 'text-gray-600'}>
            ↑ {speedUp}
          </span>
        </div>
      </div>
    </foreignObject>
  );
};

// ──── Freebox router icons by model (from homarr-labs CDN) ────
const FREEBOX_ICONS: Record<string, string> = {
  ultra: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/freebox-pop.png',
  delta: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/freebox-pop.png',
  pop:   'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/freebox-pop.png',
};
const DEFAULT_FREEBOX_ICON = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/freebox-pop.png';

// ──── Freebox central hub node ────
const FreeboxHub: React.FC<{
  x: number;
  y: number;
  modelName: string;
  model: string;
  connectionStatus: { rate_down: number; rate_up: number; state: string } | null;
}> = ({ x, y, modelName, model, connectionStatus }) => {
  const speedDown = connectionStatus ? formatSpeed(connectionStatus.rate_down) : '--';
  const speedUp = connectionStatus ? formatSpeed(connectionStatus.rate_up) : '--';
  const isUp = connectionStatus?.state === 'up';
  const [imgFailed, setImgFailed] = useState(false);

  const iconSrc = FREEBOX_ICONS[model] || DEFAULT_FREEBOX_ICON;

  return (
    <foreignObject x={x - 60} y={y - 50} width="120" height="110" overflow="visible">
      <div className="flex flex-col items-center gap-1 select-none">
        <div className="w-14 h-14 flex items-center justify-center">
          {imgFailed ? (
            <Router className={`w-8 h-8 ${isUp ? 'text-blue-400' : 'text-gray-500'}`} />
          ) : (
            <img
              src={iconSrc}
              alt={`${modelName} icon`}
              className="w-11 h-11 object-contain"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
        <span className="text-xs font-bold text-white">{modelName}</span>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="text-blue-400">↓ {speedDown}</span>
          <span className="text-emerald-400">↑ {speedUp}</span>
        </div>
      </div>
    </foreignObject>
  );
};

// ──── ISP node ────
const IspNode: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const url = logoUrl('free.fr');

  return (
    <foreignObject x={x - 45} y={y - 35} width="90" height="80" overflow="visible">
      <div className="flex flex-col items-center gap-1 select-none">
        <div className="w-11 h-11 flex items-center justify-center">
          {(!url || imgFailed) ? (
            <Globe className="w-6 h-6 text-red-400" />
          ) : (
            <img
              src={url}
              alt="Free ISP logo in PNG format"
              className="w-9 h-9 object-contain"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
        <span className="text-[10px] font-semibold text-red-400">ISP</span>
      </div>
    </foreignObject>
  );
};

// ──── Layout helpers ────
function computeLayout(
  devices: Device[],
  containerWidth: number,
  containerHeight: number,
) {
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  // ISP on the far left
  const ispX = 60;
  const ispY = centerY;

  // Freebox hub slightly left of center
  const hubX = centerX * 0.42;
  const hubY = centerY;

  // Separate devices by connection type
  const wifiDevices = devices.filter(d => d.connection === 'wifi');
  const ethernetDevices = devices.filter(d => d.connection === 'ethernet');

  // Place devices in an arc on the right side
  const devicePositions: { device: Device; x: number; y: number }[] = [];

  const rightZoneStart = centerX * 0.75;
  const rightZoneEnd = containerWidth - 80;
  const usableHeight = containerHeight - 120;

  // Ethernet devices: closer to hub, stacked vertically
  const ethStartX = rightZoneStart;
  const ethSpacingY = Math.min(110, usableHeight / Math.max(ethernetDevices.length, 1));
  const ethStartY = centerY - ((ethernetDevices.length - 1) * ethSpacingY) / 2;
  ethernetDevices.forEach((device, i) => {
    devicePositions.push({
      device,
      x: ethStartX + (i % 2) * 60,
      y: ethStartY + i * ethSpacingY,
    });
  });

  // Wifi devices: spread in an arc further right
  const wifiRadius = Math.min(
    (rightZoneEnd - rightZoneStart) * 0.7,
    usableHeight * 0.42,
  );
  const arcCenter = { x: rightZoneStart + 30, y: centerY };
  const totalWifi = wifiDevices.length;
  const arcSpan = Math.min(Math.PI * 0.85, totalWifi * 0.35);
  const arcStart = -arcSpan / 2;

  wifiDevices.forEach((device, i) => {
    const angle = totalWifi === 1
      ? 0
      : arcStart + (i / (totalWifi - 1)) * arcSpan;
    devicePositions.push({
      device,
      x: arcCenter.x + Math.cos(angle) * wifiRadius,
      y: arcCenter.y + Math.sin(angle) * wifiRadius,
    });
  });

  return { ispX, ispY, hubX, hubY, devicePositions };
}

// ──── Main page ────
export const NetworkPage: React.FC<NetworkPageProps> = ({ onBack }) => {
  const { devices, fetchDevices } = useLanStore();
  const { status } = useConnectionStore();
  const { capabilities } = useCapabilitiesStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [filter, setFilter] = useState<'all' | 'active'>('active');

  // ──── Pan & Zoom state ────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  // Clamp zoom value
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  // Reset view to center
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom toward a screen point (for wheel zoom)
  const zoomAtPoint = useCallback((newZoom: number, screenX: number, screenY: number) => {
    const clamped = clampZoom(newZoom);
    if (!containerRef.current) { setZoom(clamped); return; }
    const rect = containerRef.current.getBoundingClientRect();
    // Point in container coords
    const cx = screenX - rect.left;
    const cy = screenY - rect.top;
    // Adjust pan so the point under cursor stays fixed
    const ratio = clamped / zoom;
    setPan(p => ({
      x: cx - ratio * (cx - p.x),
      y: cy - ratio * (cy - p.y),
    }));
    setZoom(clamped);
  }, [zoom]);

  // ──── Mouse pan handlers ────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan with left mouse or single touch
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ──── Wheel zoom ────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_WHEEL_FACTOR;
    const newZoom = clampZoom(zoom * (1 + delta));
    zoomAtPoint(newZoom, e.clientX, e.clientY);
  }, [zoom, zoomAtPoint]);

  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width, 600),
          height: Math.max(rect.height, 500),
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Prevent default wheel on the container (passive: false required)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const modelName = capabilities?.modelName || 'Freebox';

  const filteredDevices = useMemo(() => {
    if (filter === 'active') return devices.filter(d => d.active);
    return devices;
  }, [devices, filter]);

  const { ispX, ispY, hubX, hubY, devicePositions } = useMemo(
    () => computeLayout(filteredDevices, dimensions.width, dimensions.height),
    [filteredDevices, dimensions],
  );

  const activeCount = devices.filter(d => d.active).length;
  const wifiCount = devices.filter(d => d.active && d.connection === 'wifi').length;
  const ethCount = devices.filter(d => d.active && d.connection === 'ethernet').length;

  // Zoom percentage for display
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-white">Réseau</h1>
            <div className="flex items-center gap-3 ml-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {activeCount} actifs
              </span>
              <span className="flex items-center gap-1">
                <Wifi size={10} className="text-blue-400" />
                {wifiCount}
              </span>
              <span className="flex items-center gap-1">
                <Cable size={10} className="text-emerald-400" />
                {ethCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(f => f === 'all' ? 'active' : 'all')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === 'active'
                  ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400'
                  : 'bg-[#151515] border-gray-700 text-gray-400'
              }`}
            >
              {filter === 'active' ? 'Actifs uniquement' : 'Tous les appareils'}
            </button>
            <button
              onClick={() => fetchDevices()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Rafraîchir"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Network topology canvas — pannable & zoomable */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{
          height: 'calc(100vh - 130px)',
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Background glow around the hub */}
          <defs>
            <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={hubX} cy={hubY} r="160" fill="url(#hub-glow)" />

          {/* ISP → Freebox flow line */}
          <FlowLine
            x1={ispX} y1={ispY}
            x2={hubX} y2={hubY}
            isWifi={false}
            active={status?.state === 'up'}
            index={9999}
          />

          {/* Freebox → Device flow lines */}
          {devicePositions.map(({ device, x, y }, i) => (
            <FlowLine
              key={device.id}
              x1={hubX} y1={hubY}
              x2={x} y2={y}
              isWifi={device.connection === 'wifi'}
              active={device.active}
              index={i}
            />
          ))}

          {/* ISP node */}
          <IspNode x={ispX} y={ispY} />

          {/* Freebox hub */}
          <FreeboxHub
            x={hubX}
            y={hubY}
            modelName={modelName}
            model={capabilities?.model || 'unknown'}
            connectionStatus={status}
          />

          {/* Device nodes */}
          {devicePositions.map(({ device, x, y }) => (
            <DeviceNode key={device.id} device={device} x={x} y={y} />
          ))}
        </svg>

        {/* Zoom controls (bottom-right, above legend) */}
        <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 bg-[#121212]/90 backdrop-blur-sm border border-gray-800 rounded-xl p-1.5 z-20">
          <button
            onClick={() => zoomAtPoint(clampZoom(zoom + ZOOM_STEP), dimensions.width / 2, dimensions.height / 2)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Zoom +"
          >
            <ZoomIn size={16} />
          </button>
          <span className="text-[10px] text-gray-500 font-mono tabular-nums w-10 text-center">
            {zoomPercent}%
          </span>
          <button
            onClick={() => zoomAtPoint(clampZoom(zoom - ZOOM_STEP), dimensions.width / 2, dimensions.height / 2)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Zoom −"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-6 border-t border-gray-700 my-0.5" />
          <button
            onClick={resetView}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Recentrer"
          >
            <Maximize size={16} />
          </button>
        </div>

        {/* Legend (bottom-left) */}
        <div className="absolute bottom-4 left-4 bg-[#121212]/90 backdrop-blur-sm border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-5 text-[10px] z-20">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-blue-500 rounded-full inline-block" />
            <span className="text-gray-400">WiFi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-emerald-500 rounded-full inline-block" />
            <span className="text-gray-400">Ethernet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-gray-600 rounded-full inline-block" />
            <span className="text-gray-400">Hors-ligne</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
            <span className="text-gray-400">Flux actif</span>
          </div>
        </div>
      </div>
    </div>
  );
};
