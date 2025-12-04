import React from 'react';
import { 
    QrCode, 
    MoreHorizontal, 
    Smartphone, 
    Laptop, 
    Globe, 
    Monitor,
    HardDrive,
    Cpu,
    Play,
    Terminal,
    Download,
    Upload,
    CheckCircle,
    AlertCircle,
    Info,
    RefreshCw,
    Folder
} from 'lucide-react';
import { WifiNetwork, VirtualMachine, DownloadTask, Device, LogEntry } from '../types';

/* --- Generic Card --- */
export const Card: React.FC<{ 
    title: string; 
    children: React.ReactNode; 
    className?: string; 
    actions?: React.ReactNode;
    headerColor?: string;
}> = ({ title, children, className = "", actions, headerColor = "text-gray-200" }) => (
  <div className={`bg-[#121212] rounded-xl border border-gray-800 p-5 flex flex-col ${className}`}>
    <div className="flex justify-between items-center mb-4">
      <h3 className={`font-semibold text-lg ${headerColor}`}>{title}</h3>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
    <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
  </div>
);

/* --- Wifi Widget --- */
export const WifiPanel: React.FC<{ networks: WifiNetwork[] }> = ({ networks }) => (
    <div className="space-y-4">
        {networks.map((net, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="text-sm font-medium text-gray-300">SSID {net.ssid}</div>
                        <div className="text-xs text-gray-500">WIFI {net.band} / {net.channelWidth} MHz</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-4 rounded-full p-0.5 ${net.active ? 'bg-emerald-500/20' : 'bg-gray-700'}`}>
                            <div className={`w-3 h-3 rounded-full shadow-sm transition-transform ${net.active ? 'translate-x-4 bg-emerald-500' : 'translate-x-0 bg-gray-500'}`}></div>
                        </div>
                        <QrCode size={20} className="text-gray-400 cursor-pointer hover:text-white" />
                    </div>
                </div>
                
                <div className="flex items-end gap-1 h-8 mt-2 space-x-[2px]">
                   {Array.from({ length: 20 }).map((_, idx) => (
                       <div 
                        key={idx} 
                        className={`w-1 rounded-t-sm transition-all duration-500 ${idx < (net.load / 5) ? 'bg-emerald-500' : 'bg-gray-800'}`}
                        style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
                       ></div>
                   ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
                    <span>Taux d'occupation {net.load}%</span>
                    <span>Appareils {net.connectedDevices}</span>
                </div>
            </div>
        ))}
    </div>
);

/* --- VM Widget --- */
export const VmPanel: React.FC<{ vms: VirtualMachine[] }> = ({ vms }) => (
    <div className="space-y-4">
        {vms.map((vm) => (
            <div key={vm.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-700/50">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Monitor size={16} className="text-purple-400" />
                        <span className="text-sm font-medium text-gray-200">{vm.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${vm.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {vm.status === 'active' ? 'Active' : 'Stopped'}
                        </span>
                         <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer ${vm.status === 'active' ? 'bg-emerald-500/20' : 'bg-gray-700'}`}>
                            <div className={`w-3 h-3 rounded-full shadow-sm transition-transform ${vm.status === 'active' ? 'translate-x-4 bg-emerald-500' : 'translate-x-0 bg-gray-500'}`}></div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>OS {vm.os}</span>
                    <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                        <Terminal size={12} /> Console
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                    <ResourceBar label="CPU" percent={vm.cpuUsage} color="bg-emerald-500" />
                    <ResourceBar label="RAM" percent={(vm.ramUsage / vm.ramTotal) * 100} text={`${vm.ramUsage}Go/${vm.ramTotal}Go`} color="bg-emerald-500" />
                    <ResourceBar label="HDD" percent={(vm.diskUsage / vm.diskTotal) * 100} text={`${vm.diskUsage}To/${vm.diskTotal}To`} color="bg-cyan-500" />
                </div>
            </div>
        ))}
    </div>
);

const ResourceBar: React.FC<{ label: string; percent: number; text?: string; color: string }> = ({ label, percent, text, color }) => (
    <div className="flex flex-col gap-1">
        <div className="flex items-end gap-[1px] h-6">
            {Array.from({ length: 10 }).map((_, i) => (
                <div 
                    key={i} 
                    className={`flex-1 rounded-sm transition-all duration-300 ${i < (percent / 10) ? color : 'bg-gray-800'}`}
                    style={{ height: '100%' }}
                ></div>
            ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>{label}</span>
            <span>{text || `${Math.round(percent)}%`}</span>
        </div>
    </div>
);

/* --- File/Torrent Widget --- */
export const FilePanel: React.FC<{ tasks: DownloadTask[] }> = ({ tasks }) => (
    <div className="space-y-4">
        {tasks.map(task => (
            <div key={task.id} className="group relative bg-[#1a1a1a] rounded-lg p-3 border border-gray-700/50 overflow-hidden">
                 <div className="flex justify-between items-center mb-1 relative z-10">
                    <div className="flex items-center gap-2">
                        <Folder size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-300 truncate max-w-[150px]">{task.name}</span>
                    </div>
                    {task.status === 'downloading' ? 
                        <span className="text-xs text-blue-400 flex items-center gap-1"><Download size={10} /> {task.speed}</span> :
                        <span className="text-xs text-green-400 flex items-center gap-1"><Upload size={10} /> {task.speed}</span>
                    }
                </div>

                {/* Custom Progress Bar with segments */}
                <div className="flex h-6 gap-[1px] relative z-10 mt-2">
                     {Array.from({ length: 40 }).map((_, i) => (
                        <div 
                            key={i} 
                            className={`flex-1 rounded-[1px] ${i < (task.progress / 2.5) ? 'bg-blue-500' : 'bg-gray-800'}`}
                        />
                     ))}
                </div>

                <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono relative z-10">
                    <span>{task.size}</span>
                    <span className="text-blue-400">{Math.round(task.progress)}%</span>
                    <span>{task.seeds} Seeds</span>
                </div>
            </div>
        ))}
        <div className="flex justify-end">
            <button className="text-xs text-blue-400 flex items-center gap-1 hover:underline">
                Voir tout <MoreHorizontal size={12} />
            </button>
        </div>
    </div>
);

/* --- Local Devices Widget --- */
export const DevicesList: React.FC<{ devices: Device[] }> = ({ devices }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500 px-2 mb-1">
            <span>Appareils {devices.length}</span>
            <span>Trier par utilisation</span>
        </div>
        {devices.map(dev => (
            <div key={dev.id} className="flex items-center justify-between p-2 hover:bg-[#1f1f1f] rounded transition-colors group cursor-default">
                <div className="flex items-center gap-3">
                    {dev.type === 'phone' && <Smartphone size={16} className="text-gray-400" />}
                    {dev.type === 'laptop' && <Laptop size={16} className="text-gray-400" />}
                    {dev.type === 'desktop' && <Monitor size={16} className="text-gray-400" />}
                    {dev.type === 'iot' && <Globe size={16} className="text-gray-400" />}
                    
                    <span className="text-xs font-medium text-gray-300">{dev.name}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                    <span className="flex items-center gap-1 text-blue-400/80">
                        <Download size={10} /> {dev.speedDown}MBs
                    </span>
                    <span className="flex items-center gap-1 text-green-400/80">
                        <Upload size={10} /> {dev.speedUp}MBs
                    </span>
                </div>
            </div>
        ))}
    </div>
);

/* --- Uptime Widget --- */
export const UptimeGrid: React.FC = () => {
    // Generate random uptime data
    const days = 30;
    const uptime = Array.from({ length: days }).map(() => Math.random() > 0.05);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold text-gray-200">98.4%</span>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-emerald-400">Opérationnel</span>
                </div>
            </div>
            <div className="grid grid-cols-10 gap-2">
                {uptime.map((up, i) => (
                    <div 
                        key={i} 
                        className={`h-8 rounded-md transition-all hover:scale-105 cursor-help ${
                            up ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-red-500/80 hover:bg-red-400 flex items-center justify-center'
                        }`}
                        title={up ? 'Opérationnel' : 'Erreur détectée'}
                    >
                        {!up && <AlertCircle size={12} className="text-white" />}
                    </div>
                ))}
            </div>
             <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>30 jours</span>
                <span>Aujourd'hui</span>
            </div>
        </div>
    );
};

/* --- History Widget --- */
export const HistoryLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => (
    <div className="space-y-0 relative">
        <div className="absolute top-0 bottom-0 left-[7px] w-[1px] bg-gray-800"></div>
        {logs.map((log) => (
            <div key={log.id} className="pl-6 py-3 relative group">
                <div className={`absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 border-[#121212] z-10 ${
                    log.type === 'success' ? 'bg-green-500' :
                    log.type === 'warning' ? 'bg-orange-500' :
                    log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <div className="text-xs text-gray-500 mb-0.5">{log.timestamp}</div>
                <div className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
                    {log.message}
                </div>
            </div>
        ))}
    </div>
);

/* --- Speedtest Widget --- */
export const SpeedtestWidget: React.FC = () => (
    <div className="flex flex-col gap-4">
        <div className="flex gap-2">
            <button className="flex-1 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded py-1 px-3 text-xs text-gray-300 transition-colors flex items-center justify-center gap-2">
                <RefreshCw size={12} /> Test Local
            </button>
            <button className="flex-1 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded py-1 px-3 text-xs text-gray-300 transition-colors flex items-center justify-center gap-2">
                <Play size={12} /> Lancer un test
            </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#151515] p-3 rounded-lg border border-gray-800 relative overflow-hidden">
                <div className="text-xs text-gray-500 mb-1">Descendant</div>
                <div className="text-xl font-bold text-white flex items-center gap-1">
                    6.48Gbs <ArrowDownIcon className="text-blue-500" />
                </div>
                 <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20">
                     <div className="h-full bg-blue-500 w-[80%]"></div>
                 </div>
            </div>
             <div className="bg-[#151515] p-3 rounded-lg border border-gray-800 relative overflow-hidden">
                <div className="text-xs text-gray-500 mb-1">Montant</div>
                <div className="text-xl font-bold text-white flex items-center gap-1">
                    6.48Gbs <ArrowUpIcon className="text-blue-500" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20">
                     <div className="h-full bg-blue-500 w-[80%]"></div>
                 </div>
            </div>
        </div>

        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 border-t border-gray-800 pt-2">
            <span>Ping 21.30ms</span>
            <span>Gigue 3.8ms</span>
            <span>Type Multi</span>
        </div>
    </div>
);

const ArrowDownIcon = ({className}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
)
const ArrowUpIcon = ({className}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
)