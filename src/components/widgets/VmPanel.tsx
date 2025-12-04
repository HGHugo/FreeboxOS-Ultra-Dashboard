import React from 'react';
import { Monitor, Terminal } from 'lucide-react';
import { Toggle } from '../ui/Toggle';
import { Badge } from '../ui/Badge';
import { ResourceBar } from './ResourceBar';
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

        <div className="grid grid-cols-3 gap-3">
          <ResourceBar
            label="CPU"
            percent={vm.cpuUsage}
            color="bg-emerald-500"
          />
          <ResourceBar
            label="RAM"
            percent={(vm.ramUsage / vm.ramTotal) * 100}
            text={`${vm.ramUsage}Go/${vm.ramTotal}Go`}
            color="bg-emerald-500"
          />
          <ResourceBar
            label="HDD"
            percent={(vm.diskUsage / vm.diskTotal) * 100}
            text={`${vm.diskUsage}To/${vm.diskTotal}To`}
            color="bg-cyan-500"
          />
        </div>
      </div>
    ))}
  </div>
);