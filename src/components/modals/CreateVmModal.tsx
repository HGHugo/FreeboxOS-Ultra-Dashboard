import React, { useState } from 'react';
import { X, Server, Cpu, HardDrive, Loader2, AlertTriangle } from 'lucide-react';
import { useVmStore } from '../../stores';

interface CreateVmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OS_OPTIONS = [
  { value: 'debian', label: 'Debian', icon: '🐧' },
  { value: 'ubuntu', label: 'Ubuntu', icon: '🟠' },
  { value: 'alpine', label: 'Alpine Linux', icon: '🏔️' },
  { value: 'fedora', label: 'Fedora', icon: '🎩' },
  { value: 'centos', label: 'CentOS', icon: '🔴' },
  { value: 'windows', label: 'Windows', icon: '🪟' },
  { value: 'other', label: 'Autre', icon: '💻' }
];

const RAM_OPTIONS = [
  { value: 512, label: '512 Mo' },
  { value: 1024, label: '1 Go' },
  { value: 2048, label: '2 Go' },
  { value: 4096, label: '4 Go' },
  { value: 8192, label: '8 Go' },
  { value: 16384, label: '16 Go' }
];

const CPU_OPTIONS = [
  { value: 1, label: '1 vCPU' },
  { value: 2, label: '2 vCPUs' },
  { value: 4, label: '4 vCPUs' },
  { value: 8, label: '8 vCPUs' }
];

export const CreateVmModal: React.FC<CreateVmModalProps> = ({ isOpen, onClose }) => {
  const { createVm, isLoading, error } = useVmStore();

  const [name, setName] = useState('');
  const [os, setOs] = useState('debian');
  const [memory, setMemory] = useState(2048);
  const [vcpus, setVcpus] = useState(2);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Le nom de la VM est requis');
      return;
    }

    if (name.length < 2 || name.length > 32) {
      setLocalError('Le nom doit contenir entre 2 et 32 caractères');
      return;
    }

    const success = await createVm({
      name: name.trim(),
      os,
      memory,
      vcpus,
      disk_type: 'qcow2',
      enable_screen: true
    });

    if (success) {
      setName('');
      setOs('debian');
      setMemory(2048);
      setVcpus(2);
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151515] w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Server size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Créer une VM</h2>
              <p className="text-sm text-gray-500">Configuration de la machine virtuelle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {displayError && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {displayError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nom de la VM
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ma-vm"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* OS Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Système d'exploitation
            </label>
            <div className="grid grid-cols-4 gap-2">
              {OS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOs(option.value)}
                  className={`p-3 rounded-lg border transition-colors text-center ${
                    os === option.value
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  <span className="text-xl mb-1 block">{option.icon}</span>
                  <span className="text-xs">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RAM */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Cpu size={14} />
              Mémoire RAM
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RAM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMemory(option.value)}
                  className={`py-2 px-3 rounded-lg border transition-colors text-sm ${
                    memory === option.value
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* vCPUs */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <HardDrive size={14} />
              Processeurs virtuels
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CPU_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVcpus(option.value)}
                  className={`py-2 px-3 rounded-lg border transition-colors text-sm ${
                    vcpus === option.value
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-800">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Récapitulatif</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">OS</span>
                <p className="text-white font-medium">{OS_OPTIONS.find(o => o.value === os)?.label}</p>
              </div>
              <div>
                <span className="text-gray-500">RAM</span>
                <p className="text-white font-medium">{RAM_OPTIONS.find(r => r.value === memory)?.label}</p>
              </div>
              <div>
                <span className="text-gray-500">CPU</span>
                <p className="text-white font-medium">{vcpus} vCPU{vcpus > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Server size={18} />
                  Créer la VM
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};