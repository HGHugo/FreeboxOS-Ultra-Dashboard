import React, { useEffect, useState } from 'react';
import {
  Server,
  ChevronLeft,
  Plus,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Settings,
  Trash2,
  Cpu,
  HardDrive,
  MemoryStick,
  Loader2,
  AlertCircle,
  Power,
  MonitorPlay,
  ExternalLink
} from 'lucide-react';
import { useVmStore } from '../stores';
import type { VM } from '../types';

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// VM Status badge
const VmStatusBadge: React.FC<{ status: VM['status'] }> = ({ status }) => {
  const statusConfig: Record<VM['status'], { label: string; color: string }> = {
    running: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
    stopped: { label: 'Arrêtée', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
    starting: { label: 'Démarrage', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
    stopping: { label: 'Arrêt', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' }
  };

  const config = statusConfig[status] || statusConfig.stopped;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${config.color}`}>
      {config.label}
    </span>
  );
};

// Resource bar component
const ResourceBar: React.FC<{
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}> = ({ label, value, max, unit, color }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-12">{label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-20 text-right">
        {value}{unit} / {max}{unit}
      </span>
    </div>
  );
};

// VM Card component
const VmCard: React.FC<{
  vm: VM;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onConsole: () => void;
  onSettings: () => void;
  onDelete: () => void;
}> = ({ vm, onStart, onStop, onRestart, onConsole, onSettings, onDelete }) => {
  const isRunning = vm.status === 'running';
  const isTransitioning = vm.status === 'starting' || vm.status === 'stopping';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isRunning ? 'bg-emerald-500/20' : 'bg-gray-700/50'}`}>
              <Server size={24} className={isRunning ? 'text-emerald-400' : 'text-gray-400'} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{vm.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <VmStatusBadge status={vm.status} />
                <span className="text-xs text-gray-500">{vm.os}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isRunning && (
              <button
                onClick={onConsole}
                className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Console"
              >
                <Terminal size={18} />
              </button>
            )}
            <button
              onClick={onSettings}
              className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
              title="Paramètres"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="p-4 space-y-3">
        <ResourceBar
          label="CPU"
          value={vm.vcpus}
          max={vm.vcpus}
          unit=" vCPU"
          color="bg-blue-500"
        />
        <ResourceBar
          label="RAM"
          value={Math.round(vm.memory / (1024 * 1024 * 1024))}
          max={Math.round(vm.memory / (1024 * 1024 * 1024))}
          unit=" Go"
          color="bg-emerald-500"
        />
        <ResourceBar
          label="Disque"
          value={Math.round(vm.disk_size / (1024 * 1024 * 1024))}
          max={Math.round(vm.disk_size / (1024 * 1024 * 1024))}
          unit=" Go"
          color="bg-cyan-500"
        />
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex items-center gap-2">
        {isRunning ? (
          <>
            <button
              onClick={onStop}
              disabled={isTransitioning}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-lg transition-colors text-sm"
            >
              <Square size={16} />
              Arrêter
            </button>
            <button
              onClick={onRestart}
              disabled={isTransitioning}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-orange-400 rounded-lg transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Redémarrer
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStart}
              disabled={isTransitioning}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              <Play size={16} />
              Démarrer
            </button>
            <button
              onClick={handleDelete}
              disabled={isTransitioning}
              className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                showDeleteConfirm
                  ? 'bg-red-600 text-white'
                  : 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
              }`}
              title={showDeleteConfirm ? 'Confirmer la suppression' : 'Supprimer'}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Create VM Modal
const CreateVmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, os: string, vcpus: number, memory: number, diskSize: number) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [os, setOs] = useState('debian');
  const [vcpus, setVcpus] = useState(2);
  const [memory, setMemory] = useState(2);
  const [diskSize, setDiskSize] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(
        name.trim(),
        os,
        vcpus,
        memory * 1024 * 1024 * 1024, // Convert to bytes
        diskSize * 1024 * 1024 * 1024 // Convert to bytes
      );
      setName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold text-white mb-6">Créer une VM</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Nom de la VM</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma VM"
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Système d'exploitation</label>
            <select
              value={os}
              onChange={(e) => setOs(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="debian">Debian</option>
              <option value="ubuntu">Ubuntu</option>
              <option value="alpine">Alpine Linux</option>
              <option value="centos">CentOS</option>
              <option value="windows">Windows</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">vCPUs</label>
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-gray-500" />
                <select
                  value={vcpus}
                  onChange={(e) => setVcpus(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {[1, 2, 4, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">RAM (Go)</label>
              <div className="flex items-center gap-2">
                <MemoryStick size={16} className="text-gray-500" />
                <select
                  value={memory}
                  onChange={(e) => setMemory(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {[1, 2, 4, 8, 16].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Disque (Go)</label>
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-gray-500" />
                <select
                  value={diskSize}
                  onChange={(e) => setDiskSize(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {[10, 20, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Créer la VM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface VmsPageProps {
  onBack: () => void;
}

export const VmsPage: React.FC<VmsPageProps> = ({ onBack }) => {
  const {
    vms,
    isLoading,
    error,
    fetchVms,
    startVm,
    stopVm
  } = useVmStore();

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch VMs on mount
  useEffect(() => {
    fetchVms();
  }, [fetchVms]);

  // VM actions
  const handleStartVm = async (id: string) => {
    await startVm(id);
  };

  const handleStopVm = async (id: string) => {
    await stopVm(id);
  };

  const handleRestartVm = async (id: string) => {
    await stopVm(id);
    // Wait a bit then start
    setTimeout(() => startVm(id), 2000);
  };

  const handleOpenConsole = (vm: VM) => {
    // Open VNC console in new tab
    // The actual URL would depend on Freebox API
    window.open(`https://mafreebox.freebox.fr/#Fbx.os.app.vm.app`, '_blank');
  };

  const handleOpenSettings = (vm: VM) => {
    // Open VM settings in Freebox OS
    window.open(`https://mafreebox.freebox.fr/#Fbx.os.app.vm.app`, '_blank');
  };

  const handleDeleteVm = async (id: string) => {
    // Would need to add delete endpoint to vmStore
    console.log('Delete VM:', id);
  };

  const handleCreateVm = (name: string, os: string, vcpus: number, memory: number, diskSize: number) => {
    // Would need to add create endpoint to vmStore
    console.log('Create VM:', { name, os, vcpus, memory, diskSize });
  };

  // Count running VMs
  const runningVms = vms.filter(vm => vm.status === 'running').length;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Server size={24} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Machines Virtuelles</h1>
                  <p className="text-sm text-gray-500">
                    {vms.length} VM{vms.length !== 1 ? 's' : ''} • {runningVms} active{runningVms !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              Créer une VM
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && vms.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-purple-400 animate-spin" />
          </div>
        )}

        {/* VMs Grid */}
        {vms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vms.map((vm) => (
              <VmCard
                key={vm.id}
                vm={vm}
                onStart={() => handleStartVm(vm.id)}
                onStop={() => handleStopVm(vm.id)}
                onRestart={() => handleRestartVm(vm.id)}
                onConsole={() => handleOpenConsole(vm)}
                onSettings={() => handleOpenSettings(vm)}
                onDelete={() => handleDeleteVm(vm.id)}
              />
            ))}
          </div>
        ) : !isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Server size={64} className="text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Aucune VM</h2>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Vous n'avez pas encore de machine virtuelle. Créez-en une pour commencer à virtualiser vos serveurs.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              Créer ma première VM
            </button>
          </div>
        )}

        {/* Info card */}
        {vms.length > 0 && (
          <div className="mt-8 p-6 bg-[#121212] rounded-xl border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Gestion avancée</h3>
            <p className="text-sm text-gray-400 mb-4">
              Pour des fonctionnalités avancées comme la console VNC, la création d'images ISO,
              ou la configuration réseau détaillée, utilisez l'interface Freebox OS.
            </p>
            <a
              href="https://mafreebox.freebox.fr/#Fbx.os.app.vm.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ouvrir Freebox OS
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </main>

      {/* Create VM Modal */}
      <CreateVmModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateVm}
      />
    </div>
  );
};

export default VmsPage;