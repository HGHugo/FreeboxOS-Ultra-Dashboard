import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
  AlertCircle,
  Clock,
  Globe,
  Ban,
  Wifi,
  Check,
  ChevronDown,
  Users,
  Laptop
} from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';
import type { Device } from '../../types';

interface ParentalControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices?: Device[];
}

// Filter state types
type FilterState = 'allowed' | 'denied' | 'webonly';

// Filter rule from API
interface ParentalFilter {
  id: number;
  macs: string[];
  hosts?: Array<{ primary_name: string }>;
  desc: string;
  forced: boolean;
  forced_mode: FilterState;
  tmp_mode?: FilterState;
  tmp_mode_expire?: number;
  scheduling_mode: 'forced' | 'temporary' | 'planning';
  filter_state: FilterState;
  next_change?: number;
}

// Planning structure
interface ParentalPlanning {
  resolution: number;
  cdayranges: string[];
  mapping: FilterState[];
}

// Parental config
interface ParentalConfig {
  default_filter_mode: FilterState;
}

export const ParentalControlModal: React.FC<ParentalControlModalProps> = ({
  isOpen,
  onClose,
  devices = []
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'config' | 'planning'>('filters');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<ParentalFilter[]>([]);
  const [editingFilter, setEditingFilter] = useState<ParentalFilter | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New filter form
  const [newFilterDesc, setNewFilterDesc] = useState('');
  const [newFilterMacs, setNewFilterMacs] = useState<string[]>([]);
  const [newFilterForced, setNewFilterForced] = useState(true);
  const [newFilterMode, setNewFilterMode] = useState<FilterState>('allowed');

  // Config state
  const [config, setConfig] = useState<ParentalConfig | null>(null);

  // Planning state
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  const [planning, setPlanning] = useState<ParentalPlanning | null>(null);
  const [planningGrid, setPlanningGrid] = useState<FilterState[][]>([]);

  // Device selection
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch filters
      const filtersRes = await api.get<ParentalFilter[]>(API_ROUTES.PARENTAL_FILTERS);
      if (filtersRes.success && filtersRes.result) {
        setFilters(filtersRes.result);
      }

      // Fetch config
      const configRes = await api.get<ParentalConfig>(API_ROUTES.PARENTAL_CONFIG);
      if (configRes.success && configRes.result) {
        setConfig(configRes.result);
      }
    } catch (err) {
      const errorCode = (err as { error_code?: string })?.error_code;
      if (errorCode === 'insufficient_rights') {
        setError('Droits insuffisants. Veuillez réenregistrer l\'application avec les droits "Contrôle parental".');
      } else {
        setError('Erreur lors du chargement du contrôle parental');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Create new filter
  const handleCreateFilter = async () => {
    if (!newFilterDesc.trim()) {
      setError('Veuillez entrer une description');
      return;
    }
    if (newFilterMacs.length === 0) {
      setError('Veuillez sélectionner au moins un appareil');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<ParentalFilter>(API_ROUTES.PARENTAL_FILTERS, {
        desc: newFilterDesc,
        macs: newFilterMacs,
        forced: newFilterForced,
        forced_mode: newFilterMode
      });

      if (response.success && response.result) {
        setFilters([...filters, response.result]);
        setIsCreating(false);
        setNewFilterDesc('');
        setNewFilterMacs([]);
        showSuccess('Règle créée avec succès');
      } else {
        setError(response.error?.message || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur lors de la création de la règle');
    } finally {
      setIsLoading(false);
    }
  };

  // Update filter
  const handleUpdateFilter = async (filter: ParentalFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<ParentalFilter>(`${API_ROUTES.PARENTAL_FILTERS}/${filter.id}`, {
        desc: filter.desc,
        forced: filter.forced,
        forced_mode: filter.forced_mode
      });

      if (response.success && response.result) {
        setFilters(filters.map(f => f.id === filter.id ? response.result! : f));
        setEditingFilter(null);
        showSuccess('Règle mise à jour');
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete filter
  const handleDeleteFilter = async (id: number) => {
    if (!confirm('Supprimer cette règle de contrôle parental ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.PARENTAL_FILTERS}/${id}`);
      if (response.success) {
        setFilters(filters.filter(f => f.id !== id));
        showSuccess('Règle supprimée');
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  // Update config
  const handleUpdateConfig = async () => {
    if (!config) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<ParentalConfig>(API_ROUTES.PARENTAL_CONFIG, config);
      if (response.success) {
        showSuccess('Configuration mise à jour');
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch planning for a filter
  const fetchPlanning = async (filterId: number) => {
    setIsLoading(true);
    try {
      const response = await api.get<ParentalPlanning>(`${API_ROUTES.PARENTAL_FILTERS}/${filterId}/planning`);
      if (response.success && response.result) {
        setPlanning(response.result);
        setSelectedFilterId(filterId);
        // Convert mapping to grid (7 days x resolution slots per day)
        const resolution = response.result.resolution || 48;
        const grid: FilterState[][] = [];
        for (let day = 0; day < 7; day++) {
          const daySlots: FilterState[] = [];
          for (let slot = 0; slot < resolution; slot++) {
            const idx = day * resolution + slot;
            daySlots.push(response.result.mapping[idx] || 'allowed');
          }
          grid.push(daySlots);
        }
        setPlanningGrid(grid);
      }
    } catch {
      setError('Erreur lors du chargement du planning');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle device MAC in selection
  const toggleDeviceMac = (mac: string) => {
    if (newFilterMacs.includes(mac)) {
      setNewFilterMacs(newFilterMacs.filter(m => m !== mac));
    } else {
      setNewFilterMacs([...newFilterMacs, mac]);
    }
  };

  // Get filter state color
  const getStateColor = (state: FilterState) => {
    switch (state) {
      case 'allowed': return 'text-emerald-400 bg-emerald-500/20';
      case 'denied': return 'text-red-400 bg-red-500/20';
      case 'webonly': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  // Get filter state label
  const getStateLabel = (state: FilterState) => {
    switch (state) {
      case 'allowed': return 'Autorisé';
      case 'denied': return 'Bloqué';
      case 'webonly': return 'Web seulement';
      default: return state;
    }
  };

  // Get filter state icon
  const getStateIcon = (state: FilterState) => {
    switch (state) {
      case 'allowed': return <Globe size={14} />;
      case 'denied': return <Ban size={14} />;
      case 'webonly': return <Wifi size={14} />;
      default: return null;
    }
  };

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121212] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Contrôle Parental</h2>
              <p className="text-xs text-gray-500">Gérer les restrictions d'accès Internet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#0f0f0f]">
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'filters'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={16} />
            Règles
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'config'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield size={16} />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'planning'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={16} />
            Planification
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400">{success}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-gray-400 animate-spin" />
            </div>
          )}

          {/* Filters Tab */}
          {!isLoading && activeTab === 'filters' && (
            <div className="space-y-4">
              {/* Add new filter button */}
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Nouvelle règle
                </button>
              )}

              {/* New filter form */}
              {isCreating && (
                <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 space-y-4">
                  <h3 className="text-sm font-medium text-white">Nouvelle règle de contrôle parental</h3>

                  {/* Description */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={newFilterDesc}
                      onChange={(e) => setNewFilterDesc(e.target.value)}
                      placeholder="Ex: Tablette enfants"
                      className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Device selector */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Appareils concernés</label>
                    <button
                      onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                    >
                      <span className={newFilterMacs.length > 0 ? 'text-white' : 'text-gray-500'}>
                        {newFilterMacs.length > 0
                          ? `${newFilterMacs.length} appareil(s) sélectionné(s)`
                          : 'Sélectionner des appareils'
                        }
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${showDeviceSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {showDeviceSelector && (
                      <div className="mt-2 max-h-48 overflow-y-auto bg-[#252525] border border-gray-700 rounded-lg">
                        {devices.filter(d => d.mac).map((device) => (
                          <label
                            key={device.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={newFilterMacs.includes(device.mac!)}
                              onChange={() => toggleDeviceMac(device.mac!)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                            />
                            <Laptop size={14} className="text-gray-400" />
                            <span className="text-sm text-white">{device.name}</span>
                            <span className="text-xs text-gray-500 font-mono">{device.mac}</span>
                          </label>
                        ))}
                        {devices.filter(d => d.mac).length === 0 && (
                          <p className="px-3 py-4 text-sm text-gray-500 text-center">
                            Aucun appareil disponible
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mode de filtrage</label>
                    <div className="flex gap-2">
                      {(['allowed', 'denied', 'webonly'] as FilterState[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setNewFilterMode(mode)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            newFilterMode === mode
                              ? getStateColor(mode)
                              : 'bg-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          {getStateIcon(mode)}
                          {getStateLabel(mode)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Forced mode toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFilterForced}
                      onChange={(e) => setNewFilterForced(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">Forcer ce mode (ignorer la planification)</span>
                  </label>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateFilter}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      Créer
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewFilterDesc('');
                        setNewFilterMacs([]);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Filters list */}
              <div className="space-y-2">
                {filters.length === 0 && !isCreating && (
                  <div className="py-8 text-center text-gray-500">
                    <Shield size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Aucune règle de contrôle parental</p>
                    <p className="text-xs mt-1">Créez une règle pour limiter l'accès Internet de certains appareils</p>
                  </div>
                )}

                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 group"
                  >
                    {editingFilter?.id === filter.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingFilter.desc}
                          onChange={(e) => setEditingFilter({ ...editingFilter, desc: e.target.value })}
                          className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                        />
                        <div className="flex gap-2">
                          {(['allowed', 'denied', 'webonly'] as FilterState[]).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setEditingFilter({ ...editingFilter, forced_mode: mode })}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                editingFilter.forced_mode === mode
                                  ? getStateColor(mode)
                                  : 'bg-gray-800 text-gray-400 hover:text-white'
                              }`}
                            >
                              {getStateIcon(mode)}
                              {getStateLabel(mode)}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateFilter(editingFilter)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm"
                          >
                            <Save size={14} />
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingFilter(null)}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-medium text-white">{filter.desc || `Règle #${filter.id}`}</h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getStateColor(filter.filter_state)}`}>
                              {getStateIcon(filter.filter_state)}
                              {getStateLabel(filter.filter_state)}
                            </span>
                            {filter.scheduling_mode !== 'forced' && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={12} />
                                Planifié
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {filter.hosts?.map((host, i) => (
                              <span key={i} className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                                {host.primary_name}
                              </span>
                            ))}
                            {filter.macs.length > 0 && (!filter.hosts || filter.hosts.length === 0) && (
                              filter.macs.map((mac, i) => (
                                <span key={i} className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-0.5 rounded">
                                  {mac}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingFilter(filter)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={14} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteFilter(filter.id)}
                            className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config Tab */}
          {!isLoading && activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700">
                <h3 className="text-sm font-medium text-white mb-4">Mode par défaut</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Ce mode s'applique aux appareils sans règle spécifique
                </p>

                <div className="flex gap-2">
                  {(['allowed', 'denied', 'webonly'] as FilterState[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setConfig(config ? { ...config, default_filter_mode: mode } : null)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm transition-colors ${
                        config?.default_filter_mode === mode
                          ? getStateColor(mode)
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {getStateIcon(mode)}
                      <div className="text-left">
                        <div className="font-medium">{getStateLabel(mode)}</div>
                        <div className="text-xs opacity-75">
                          {mode === 'allowed' && 'Accès complet à Internet'}
                          {mode === 'denied' && 'Aucun accès Internet'}
                          {mode === 'webonly' && 'HTTP/HTTPS uniquement'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleUpdateConfig}
                  disabled={isLoading}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  Enregistrer
                </button>
              </div>

              <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700">
                <h3 className="text-sm font-medium text-white mb-2">Informations</h3>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-2">
                    <Globe size={12} className="text-emerald-400" />
                    <strong>Autorisé :</strong> Accès complet à Internet
                  </li>
                  <li className="flex items-center gap-2">
                    <Ban size={12} className="text-red-400" />
                    <strong>Bloqué :</strong> Aucun accès Internet
                  </li>
                  <li className="flex items-center gap-2">
                    <Wifi size={12} className="text-blue-400" />
                    <strong>Web seulement :</strong> Uniquement HTTP/HTTPS (ports 80/443)
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Planning Tab */}
          {!isLoading && activeTab === 'planning' && (
            <div className="space-y-4">
              {/* Filter selector */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sélectionner une règle</label>
                <select
                  value={selectedFilterId || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    if (id) fetchPlanning(id);
                  }}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner...</option>
                  {filters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.desc || `Règle #${filter.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Planning grid */}
              {planning && planningGrid.length > 0 && (
                <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">Planning hebdomadaire</h3>
                    <span className="text-xs text-gray-500">
                      Résolution : {60 / (planning.resolution / 24)} minutes par créneau
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left text-gray-500">Jour</th>
                          {Array.from({ length: 24 }).map((_, h) => (
                            <th key={h} className="px-1 py-1 text-center text-gray-500">{h}h</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day, dayIdx) => (
                          <tr key={day}>
                            <td className="px-2 py-1 text-gray-400">{day.slice(0, 3)}</td>
                            {Array.from({ length: 24 }).map((_, hour) => {
                              // Get the state for this hour (simplified - shows first slot of each hour)
                              const slotsPerHour = planning.resolution / 24;
                              const slotIdx = Math.floor(hour * slotsPerHour);
                              const state = planningGrid[dayIdx]?.[slotIdx] || 'allowed';

                              return (
                                <td key={hour} className="px-0.5 py-1">
                                  <div
                                    className={`w-4 h-4 rounded-sm ${
                                      state === 'allowed' ? 'bg-emerald-500/50' :
                                      state === 'denied' ? 'bg-red-500/50' :
                                      'bg-blue-500/50'
                                    }`}
                                    title={`${day} ${hour}h - ${getStateLabel(state)}`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500/50" />
                      <span className="text-gray-400">Autorisé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-red-500/50" />
                      <span className="text-gray-400">Bloqué</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-blue-500/50" />
                      <span className="text-gray-400">Web seulement</span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-gray-600">
                    Note : La modification du planning nécessite l'utilisation de l'interface Freebox OS.
                  </p>
                </div>
              )}

              {!planning && selectedFilterId && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-gray-400 animate-spin" />
                </div>
              )}

              {!selectedFilterId && (
                <div className="py-8 text-center text-gray-500">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Sélectionnez une règle pour voir son planning</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentalControlModal;