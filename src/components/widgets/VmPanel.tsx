import React from 'react';
import { Monitor, Terminal, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { Toggle } from '../ui/Toggle';
import { Badge } from '../ui/Badge';
import type { VM } from '../../types';

interface VmPanelProps {
  vms: VM[];
  onToggle?: (id: string, start: boolean) => void;
  onConsole?: (id: string) => void;
}

export const VmPanel: React.FC<VmPanelProps> = ({ vms, onToggle, onConsole }) => (
  <div className="space-y-4">
    {vms.map((vm) => (
      <div key={vm.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-700/50">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-gray-200">{vm.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={vm.status === 'running' ? 'success' : vm.status === 'starting' || vm.status === 'stopping' ? 'warning' : 'error'}>
              {vm.status === 'running' ? 'Active' : vm.status === 'starting' ? 'Démarrage...' : vm.status === 'stopping' ? 'Arrêt...' : 'Arrêtée'}
            </Badge>
            <Toggle
              checked={vm.status === 'running'}
              onChange={(checked) => onToggle?.(vm.id, checked)}
              disabled={vm.status === 'starting' || vm.status === 'stopping'}
              size="sm"
            />
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mb-3">
          <span>OS <span className="text-gray-400">{vm.os}</span></span>
          <button
            onClick={() => onConsole?.(vm.id)}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Terminal size={12} /> Console
          </button>
        </div>

        {/* Resources allocated - Note: Per-VM usage stats NOT available in Freebox API */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Cpu size={14} className="text-blue-400" />
            <span className="text-gray-400">{vm.vcpus} vCPU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MemoryStick size={14} className="text-emerald-400" />
            <span className="text-gray-400">{Math.round(vm.ramTotal * 10) / 10} Go</span>
          </div>
          {vm.diskTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <HardDrive size={14} className="text-cyan-400" />
              <span className="text-gray-400">{Math.round(vm.diskTotal)} Go</span>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);