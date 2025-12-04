import React, { useState, useEffect } from 'react';
import { Header, Footer } from './components/LayoutComponents';
import { StatusChart, TrafficHistoryModal } from './components/Charts';
import { 
  WifiPanel, 
  VmPanel, 
  Card, 
  FilePanel, 
  DevicesList, 
  UptimeGrid, 
  HistoryLog,
  SpeedtestWidget
} from './components/Widgets';
import { 
  NetworkStat, 
  WifiNetwork, 
  VirtualMachine, 
  DownloadTask, 
  Device, 
  LogEntry 
} from './types';
import { ChevronDown, Plus, MoreHorizontal, Calendar, Sliders, Filter, Download, ArrowDown } from 'lucide-react';

const App: React.FC = () => {
  // --- State & Mock Data ---
  const [networkStats, setNetworkStats] = useState<NetworkStat[]>([]);
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);
  
  // Mock Real-time data update
  useEffect(() => {
    const initialData = Array.from({ length: 20 }).map((_, i) => ({
      time: i.toString(),
      download: Math.floor(Math.random() * 50) + 10,
      upload: Math.floor(Math.random() * 20) + 5
    }));
    setNetworkStats(initialData);

    const interval = setInterval(() => {
      setNetworkStats(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: Date.now().toString(),
          download: Math.floor(Math.random() * 80) + 10, // Fluctuating
          upload: Math.floor(Math.random() * 100) + 20
        });
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const wifiNetworks: WifiNetwork[] = [
    { ssid: 'POWL1', band: '6GHz', channelWidth: 80, active: true, connectedDevices: 12, load: 18 },
    { ssid: 'POWL2', band: '5GHz', channelWidth: 40, active: true, connectedDevices: 8, load: 45 },
    { ssid: 'POWL3', band: '2.4GHz', channelWidth: 20, active: true, connectedDevices: 12, load: 72 },
  ];

  const vms: VirtualMachine[] = [
    { id: '1', name: 'VM Plex', os: 'DEBIAN', status: 'active', cpuUsage: 10, ramUsage: 1, ramTotal: 4, diskUsage: 2, diskTotal: 4 },
    { id: '2', name: 'VM Home Assistant', os: 'DEBIAN', status: 'active', cpuUsage: 10, ramUsage: 1, ramTotal: 4, diskUsage: 2, diskTotal: 4 },
  ];

  const files: DownloadTask[] = [
    { id: '1', name: 'Fichier_Legal_Utorrent.mp4', size: '1.02Go sur 3.12Go', progress: 32, speed: '32mo/sec', seeds: 238, status: 'downloading' },
    { id: '2', name: 'vacation_video_4k.mov', size: '3.32Go', progress: 100, speed: '0kb/s', seeds: 0, status: 'seeding' },
    { id: '3', name: 'linux_distro.iso', size: '4.5Go', progress: 100, speed: '0kb/s', seeds: 0, status: 'seeding' },
  ];

  const devices: Device[] = [
    { id: '1', name: 'Iphone de Paul', type: 'phone', connection: 'wifi', speedDown: 23, speedUp: 23, active: true },
    { id: '2', name: 'Repeteur WIFI Freebox', type: 'iot', connection: 'wifi', speedDown: 23, speedUp: 23, active: true },
    { id: '3', name: 'Ipad Air de Paul', type: 'phone', connection: 'wifi', speedDown: 23, speedUp: 23, active: true },
    { id: '4', name: 'Macbook Pro de Paul', type: 'laptop', connection: 'wifi', speedDown: 23, speedUp: 23, active: true },
    { id: '5', name: 'Devialet', type: 'tv', connection: 'ethernet', speedDown: 23, speedUp: 43, active: true },
  ];

  const historyLogs: LogEntry[] = [
    { id: '1', timestamp: '2 Février 2024', message: 'Admin a désactivé le WIFI Guest', type: 'warning' },
    { id: '2', timestamp: '2 Février 2024', message: 'Admin a reboot la box', type: 'info' },
    { id: '3', timestamp: '1 Février 2024', message: 'Admin a reboot la box', type: 'info' },
    { id: '4', timestamp: '22 Janvier 2024', message: 'Admin a créé une VM', type: 'success' },
    { id: '5', timestamp: '20 Janvier 2024', message: 'Admin a reboot la box', type: 'info' },
    { id: '6', timestamp: '12 Janvier 2024', message: 'Admin a modifié le mot de passe du WIFI', type: 'warning' },
    { id: '7', timestamp: '7 Janvier 2024', message: 'Admin a reboot la box', type: 'info' },
    { id: '8', timestamp: '2 Janvier 2024', message: 'Admin a reboot la box', type: 'info' },
  ];

  const ActionButton = ({label, icon: Icon, onClick}: {label: string, icon: any, onClick?: () => void}) => (
      <button 
        onClick={onClick}
        className="flex items-center gap-1 text-xs bg-[#1a1a1a] border border-gray-700 hover:bg-gray-800 px-2 py-1 rounded text-gray-400 hover:text-white transition-colors"
      >
          <Icon size={12} /> {label}
      </button>
  );

  return (
    <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
      <Header />
      
      <main className="p-4 md:p-6 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-6">
            <Card 
                title="État de la Freebox" 
                actions={<ActionButton label="Voir plus" icon={MoreHorizontal} onClick={() => setIsTrafficModalOpen(true)} />}
            >
              <div className="flex flex-col gap-4">
                <div className="h-40">
                  <StatusChart 
                    data={networkStats} 
                    color="#3b82f6" 
                    dataKey="download" 
                    title="Descendant en temps réel" 
                    currentValue="20.6"
                    unit="kb/s"
                    trend="down"
                  />
                </div>
                <div className="h-40">
                  <StatusChart 
                    data={networkStats} 
                    color="#10b981" 
                    dataKey="upload" 
                    title="Montant en temps réel" 
                    currentValue="100.3"
                    unit="mb/s"
                    trend="up"
                  />
                </div>
              </div>
            </Card>

            <Card title="Test de débits">
               <SpeedtestWidget />
            </Card>

            <Card title="Uptime" actions={<button className="text-xs bg-[#1a1a1a] border border-gray-700 px-2 py-1 rounded flex items-center gap-1"><Calendar size={12}/> 30J</button>}>
                <UptimeGrid />
            </Card>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-6">
            <Card 
                title="Wifi" 
                actions={
                    <div className="flex gap-2">
                        <ActionButton label="Filtrage" icon={Sliders} />
                        <ActionButton label="Planification" icon={Calendar} />
                    </div>
                }
            >
              <WifiPanel networks={wifiNetworks} />
            </Card>

            <Card 
                title="Local" 
                actions={
                    <div className="flex gap-2">
                        <ActionButton label="Switch" icon={Filter} />
                        <ActionButton label="DHCP" icon={Sliders} />
                        <ActionButton label="Mode" icon={MoreHorizontal} />
                    </div>
                }
                className="flex-grow"
            >
              <DevicesList devices={devices} />
            </Card>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-6">
            <Card title="VMs" actions={<ActionButton label="Créer" icon={Plus} />}>
                <VmPanel vms={vms} />
            </Card>

            <Card 
                title="Fichiers" 
                actions={
                    <div className="flex gap-2">
                        <ActionButton label="Tous" icon={Filter} />
                        <ActionButton label="Plus récent" icon={ChevronDown} />
                    </div>
                }
                className="flex-grow"
            >
                <FilePanel tasks={files} />
            </Card>
          </div>

          {/* Column 4 */}
          <div className="flex flex-col gap-6">
            <Card 
                title="Historique" 
                actions={
                    <div className="flex gap-2">
                        <ActionButton label="Toutes" icon={Filter} />
                        <ActionButton label="30J" icon={Calendar} />
                    </div>
                }
                className="h-full"
            >
                <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-[#1a1a1a] p-2 rounded border border-gray-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Une mise à jour est disponible
                    <span className="ml-auto text-gray-600">A venir</span>
                </div>
                
                <div className="mb-6 p-3 bg-gradient-to-r from-blue-900/20 to-transparent rounded border border-blue-900/30">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Micro-logiciel 384.784</span>
                        <ActionButton label="Installer" icon={Download} />
                    </div>
                </div>

                <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-4 h-4 rounded bg-[#1a1a1a] border border-gray-700 flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    </div>
                    Admin a lancé un speed test
                    <span className="ml-auto text-gray-600">4 Février 2024</span>
                </div>

                <div className="p-4 bg-[#0a0a0a] rounded-lg border border-gray-800 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Descendant</div>
                             <div className="text-lg font-bold text-white flex items-center gap-1">
                                6.48Gbs <ArrowDown size={14} className="text-blue-500" />
                             </div>
                             <div className="h-6 mt-1">
                                 {/* Mini Sparkline simulated */}
                                 <svg viewBox="0 0 100 20" className="w-full h-full stroke-blue-500 fill-none stroke-2">
                                     <path d="M0 10 Q 25 15, 50 5 T 100 10" />
                                 </svg>
                             </div>
                        </div>
                        <div className="w-[1px] bg-gray-800"></div>
                        <div className="flex-1">
                             <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Montant</div>
                             <div className="text-lg font-bold text-white flex items-center gap-1">
                                6.48Gbs <ArrowDown size={14} className="text-blue-500 rotate-180" />
                             </div>
                              <div className="h-6 mt-1">
                                 {/* Mini Sparkline simulated */}
                                 <svg viewBox="0 0 100 20" className="w-full h-full stroke-blue-500 fill-none stroke-2">
                                     <path d="M0 12 Q 25 8, 50 15 T 100 5" />
                                 </svg>
                             </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] text-gray-500 font-mono">
                        <span>Ping 21.30ms</span>
                        <span>Gigue 3.8ms</span>
                        <span>Type Multi</span>
                    </div>
                </div>

                <HistoryLog logs={historyLogs} />
            </Card>
          </div>

        </div>

        {isTrafficModalOpen && (
            <TrafficHistoryModal onClose={() => setIsTrafficModalOpen(false)} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;