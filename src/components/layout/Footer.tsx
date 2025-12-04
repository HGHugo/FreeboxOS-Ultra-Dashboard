import React from 'react';
import {
  Settings,
  Tv,
  Phone,
  BarChart2,
  Folder,
  Server,
  Power,
  LogOut,
  Home
} from 'lucide-react';

export type PageType = 'dashboard' | 'tv' | 'phone' | 'files' | 'vms' | 'analytics' | 'settings';

interface FooterProps {
  currentPage?: PageType;
  onPageChange?: (page: PageType) => void;
  onReboot?: () => void;
  onLogout?: () => void;
}

// Internal pages (handled within the dashboard)
const internalTabs: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Accueil', icon: Home },
  { id: 'tv', label: 'Télévision', icon: Tv },
  { id: 'phone', label: 'Téléphone', icon: Phone },
  { id: 'files', label: 'Fichiers', icon: Folder },
  { id: 'vms', label: 'VMs', icon: Server },
  { id: 'analytics', label: 'Analytique', icon: BarChart2 },
  { id: 'settings', label: 'Paramètres', icon: Settings }
];

export const Footer: React.FC<FooterProps> = ({
  currentPage = 'dashboard',
  onPageChange,
  onReboot,
  onLogout
}) => {
  const handleTabClick = (tabId: PageType) => {
    onPageChange?.(tabId);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-gray-800 p-3 z-50">
      <div className="flex items-center justify-between max-w-[1920px] mx-auto px-2">
        {/* Navigation tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {internalTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-[#151515] border-transparent text-gray-400 hover:bg-[#202020] hover:text-gray-200'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-4">
          <button
            onClick={onReboot}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-red-900/20 text-gray-300 hover:text-red-400 rounded-lg border border-gray-700 transition-colors"
          >
            <Power size={18} />
            <span className="hidden sm:inline text-sm font-medium">Reboot</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-700 transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </div>
    </footer>
  );
};