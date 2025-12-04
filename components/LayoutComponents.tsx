import React from 'react';
import { 
  Router, 
  Thermometer, 
  Fan, 
  ArrowDown, 
  ArrowUp, 
  Wifi, 
  Activity, 
  Settings, 
  Tv, 
  Phone, 
  BarChart2, 
  Folder, 
  Server, 
  Power, 
  LogOut,
  Plus
} from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="flex flex-col md:flex-row items-center justify-between p-4 bg-[#111111] border-b border-gray-800 gap-4">
      <div className="flex items-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700">
        <Router className="text-gray-400" size={20} />
        <span className="font-semibold text-gray-200">Freebox Ultra v9 (r1)</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
        <button className="p-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg border border-gray-700 text-gray-400 transition-colors">
            <Plus size={18} />
        </button>

        <StatusBadge icon={<Activity size={16} />} value="22w" color="text-orange-400" />
        <StatusBadge icon={<Thermometer size={16} />} value="32°C" color="text-emerald-400" />
        <StatusBadge icon={<Fan size={16} />} value="1560T/min" color="text-emerald-400" />
        
        <div className="flex items-center gap-4 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700 mx-2">
           <div className="flex items-center gap-2">
             <ArrowDown size={16} className="text-blue-400" />
             <span className="text-sm font-medium">38Mbs</span>
           </div>
           <div className="w-px h-4 bg-gray-700"></div>
           <div className="flex items-center gap-2">
             <ArrowUp size={16} className="text-green-400" />
             <span className="text-sm font-medium">2Mbs</span>
           </div>
        </div>

        <StatusBadge icon={<Wifi size={16} />} value="OK" label="" color="text-green-400" />
        <StatusBadge icon={<Activity size={16} />} value="OK" label="UP" color="text-green-400" />
        
        <div className="hidden lg:flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-gray-700 ml-2">
           <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
           <span className="text-sm font-mono text-gray-400">88.132.22.39 (IPv4)</span>
        </div>
      </div>
    </header>
  );
};

const StatusBadge = ({ icon, value, label, color }: { icon: React.ReactNode, value: string, label?: string, color: string }) => (
  <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-lg border border-gray-700 whitespace-nowrap">
    {label && <span className="text-xs text-gray-500 mr-1">{label}</span>}
    <span className={color}>{icon}</span>
    <span className="text-sm font-medium text-gray-200">{value}</span>
  </div>
);

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-gray-800 p-3 z-50">
      <div className="flex items-center justify-between max-w-[1920px] mx-auto px-2">
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <FooterButton icon={<Settings size={18} />} label="Paramètres" active />
          <FooterButton icon={<Tv size={18} />} label="Télévision" />
          <FooterButton icon={<Phone size={18} />} label="Téléphone" />
          <FooterButton icon={<BarChart2 size={18} />} label="Analytique" />
          <FooterButton icon={<Folder size={18} />} label="Fichiers" />
          <FooterButton icon={<Server size={18} />} label="VMs" />
        </div>

        <div className="flex items-center gap-2 pl-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-red-900/20 text-gray-300 hover:text-red-400 rounded-lg border border-gray-700 transition-colors">
                <Power size={18} />
                <span className="hidden sm:inline text-sm font-medium">Reboot</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-700 transition-colors">
                <LogOut size={18} />
                <span className="hidden sm:inline text-sm font-medium">Déconnexion</span>
            </button>
        </div>
      </div>
    </footer>
  );
};

const FooterButton = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <button className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${active ? 'bg-gray-800 border-gray-600 text-white' : 'bg-[#151515] border-transparent text-gray-400 hover:bg-[#202020] hover:text-gray-200'}`}>
    {icon}
    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
  </button>
);
