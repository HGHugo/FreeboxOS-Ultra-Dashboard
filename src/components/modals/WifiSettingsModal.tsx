import React, { useState, useEffect } from 'react';
import { X, Shield, Clock, Wifi, Loader2, Check, AlertTriangle, Save, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';

interface WifiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'filter' | 'planning' | 'wps';
}

type TabType = 'filter' | 'planning' | 'wps';

interface MacFilterRule {
  mac: string;
  comment?: string;
  type?: 'whitelist' | 'blacklist';
}

interface WifiPlanning {
  enabled: boolean;
  // 24x7 grid: each bit represents 1 hour slot
  // planning is a hex string representing 168 bits (21 bytes)
  planning?: string;
}

// Days of the week in French (starting from Monday for display)
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
// Hours for display
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Convert hex string to boolean grid (7 days x 24 hours)
const hexToGrid = (hexString: string | undefined): boolean[][] => {
  const grid: boolean[][] = Array.from({ length: 7 }, () => Array(24).fill(true));

  if (!hexString) return grid;

  try {
    // Convert hex to binary string
    let binary = '';
    for (let i = 0; i < hexString.length; i++) {
      const byte = parseInt(hexString[i], 16);
      binary += byte.toString(2).padStart(4, '0');
    }

    // Fill grid from binary (168 bits = 7 days * 24 hours)
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const bitIndex = day * 24 + hour;
        if (bitIndex < binary.length) {
          grid[day][hour] = binary[bitIndex] === '1';
        }
      }
    }
  } catch {
    // Return default grid on error
  }

  return grid;
};

// Convert boolean grid back to hex string
const gridToHex = (grid: boolean[][]): string => {
  let binary = '';

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      binary += grid[day]?.[hour] ? '1' : '0';
    }
  }

  // Pad to 168 bits (42 hex chars)
  while (binary.length < 168) {
    binary += '1';
  }

  // Convert binary to hex
  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    const nibble = binary.substring(i, i + 4);
    hex += parseInt(nibble, 2).toString(16);
  }

  return hex;
};

export const WifiSettingsModal: React.FC<WifiSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'filter'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MAC Filter state
  const [macFilterRules, setMacFilterRules] = useState<MacFilterRule[]>([]);
  const [macFilterEnabled, setMacFilterEnabled] = useState(false);
  const [macFilterMode, setMacFilterMode] = useState<'whitelist' | 'blacklist'>('blacklist');
  const [newMacAddress, setNewMacAddress] = useState('');
  const [newMacComment, setNewMacComment] = useState('');
  const [savingMacFilter, setSavingMacFilter] = useState(false);

  // Planning state
  const [planning, setPlanning] = useState<WifiPlanning | null>(null);
  const [planningGrid, setPlanningGrid] = useState<boolean[][]>(() =>
    Array.from({ length: 7 }, () => Array(24).fill(true))
  );
  const [planningModified, setPlanningModified] = useState(false);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'filter') fetchMacFilter();
      if (activeTab === 'planning') fetchPlanning();
    }
  }, [isOpen, activeTab]);

  const fetchMacFilter = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ enabled: boolean; rules?: MacFilterRule[] }>(API_ROUTES.WIFI_MAC_FILTER);
      if (response.success && response.result) {
        setMacFilterEnabled(response.result.enabled);
        setMacFilterRules(response.result.rules || []);
      } else {
        // Silently fail - may not be available
        setMacFilterEnabled(false);
        setMacFilterRules([]);
      }
    } catch {
      // Silently fail
      setMacFilterEnabled(false);
      setMacFilterRules([]);
    }
    setLoading(false);
  };

  const fetchPlanning = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WifiPlanning>(API_ROUTES.WIFI_PLANNING);
      if (response.success && response.result) {
        setPlanning(response.result);
        // Parse planning string to grid
        if (response.result.planning) {
          setPlanningGrid(hexToGrid(response.result.planning));
        }
        setPlanningModified(false);
      } else {
        setPlanning({ enabled: false });
      }
    } catch {
      setPlanning({ enabled: false });
    }
    setLoading(false);
  };

  const togglePlanningEnabled = async (enabled: boolean) => {
    if (!planning) return;
    setSavingPlanning(true);
    setError(null);
    try {
      const response = await api.put<WifiPlanning>(API_ROUTES.WIFI_PLANNING, {
        ...planning,
        enabled
      });
      if (response.success && response.result) {
        setPlanning(response.result);
        setSuccessMessage('Planification ' + (enabled ? 'activée' : 'désactivée'));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    }
    setSavingPlanning(false);
  };

  const toggleGridCell = (day: number, hour: number) => {
    setPlanningGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[day][hour] = !newGrid[day][hour];
      return newGrid;
    });
    setPlanningModified(true);
  };

  const toggleRow = (day: number) => {
    setPlanningGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      const allEnabled = newGrid[day].every(v => v);
      newGrid[day] = newGrid[day].map(() => !allEnabled);
      return newGrid;
    });
    setPlanningModified(true);
  };

  const toggleColumn = (hour: number) => {
    setPlanningGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      const allEnabled = newGrid.every(row => row[hour]);
      for (let d = 0; d < 7; d++) {
        newGrid[d][hour] = !allEnabled;
      }
      return newGrid;
    });
    setPlanningModified(true);
  };

  const savePlanning = async () => {
    if (!planning) return;
    setSavingPlanning(true);
    setError(null);
    try {
      const planningHex = gridToHex(planningGrid);
      const response = await api.put<WifiPlanning>(API_ROUTES.WIFI_PLANNING, {
        ...planning,
        planning: planningHex
      });
      if (response.success && response.result) {
        setPlanning(response.result);
        setPlanningModified(false);
        setSuccessMessage('Planification enregistrée');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    }
    setSavingPlanning(false);
  };

  const setAllGrid = (enabled: boolean) => {
    setPlanningGrid(Array.from({ length: 7 }, () => Array(24).fill(enabled)));
    setPlanningModified(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151515] w-full max-w-2xl rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white">Paramètres WiFi</h2>
            <p className="text-sm text-gray-500 mt-1">Configuration avancée du réseau sans fil</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#1a1a1a]">
          <button
            onClick={() => setActiveTab('filter')}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'filter'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield size={16} />
            Filtrage MAC
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'planning'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={16} />
            Planification
          </button>
          <button
            onClick={() => setActiveTab('wps')}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'wps'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wifi size={16} />
            WPS
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-blue-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* MAC Filter Tab */}
              {activeTab === 'filter' && (
                <div className="space-y-4">
                  {/* Header with toggle */}
                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                    <div>
                      <h3 className="text-white font-medium">Filtrage MAC</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Autoriser ou bloquer des appareils spécifiques
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      macFilterEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {macFilterEnabled ? 'Activé' : 'Désactivé'}
                    </div>
                  </div>

                  {/* Filter Mode */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMacFilterMode('whitelist')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        macFilterMode === 'whitelist'
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-600'
                          : 'bg-[#1a1a1a] text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      Liste blanche (autoriser)
                    </button>
                    <button
                      onClick={() => setMacFilterMode('blacklist')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                        macFilterMode === 'blacklist'
                          ? 'bg-red-600/30 text-red-400 border border-red-600'
                          : 'bg-[#1a1a1a] text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      Liste noire (bloquer)
                    </button>
                  </div>

                  {/* Add new rule form */}
                  <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-800 space-y-3">
                    <h4 className="text-sm font-medium text-white">Ajouter une règle</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Adresse MAC (ex: AA:BB:CC:DD:EE:FF)"
                        value={newMacAddress}
                        onChange={(e) => setNewMacAddress(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Commentaire (optionnel)"
                        value={newMacComment}
                        onChange={(e) => setNewMacComment(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          if (newMacAddress.match(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/)) {
                            setMacFilterRules(prev => [...prev, { mac: newMacAddress, comment: newMacComment || undefined, type: macFilterMode }]);
                            setNewMacAddress('');
                            setNewMacComment('');
                            setSuccessMessage('Règle ajoutée (non sauvegardée)');
                            setTimeout(() => setSuccessMessage(null), 2000);
                          } else {
                            setError('Format MAC invalide. Utilisez AA:BB:CC:DD:EE:FF');
                          }
                        }}
                        disabled={!newMacAddress || savingMacFilter}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Success message */}
                  {successMessage && activeTab === 'filter' && (
                    <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                      <Check size={16} />
                      {successMessage}
                    </div>
                  )}

                  {/* Rules list */}
                  {macFilterRules.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm text-gray-400">Règles ({macFilterRules.length})</h4>
                      {macFilterRules.map((rule, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-gray-800 group">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              rule.type === 'whitelist' ? 'bg-emerald-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <span className="font-mono text-sm text-white">{rule.mac}</span>
                              {rule.comment && (
                                <p className="text-xs text-gray-500 mt-0.5">{rule.comment}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setMacFilterRules(prev => prev.filter((_, idx) => idx !== i));
                              setSuccessMessage('Règle supprimée (non sauvegardée)');
                              setTimeout(() => setSuccessMessage(null), 2000);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Shield size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucune règle de filtrage configurée</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <p className="text-xs text-blue-400">
                      <strong>Note :</strong> Le filtrage MAC permet de contrôler quels appareils
                      peuvent se connecter au WiFi. En mode liste blanche, seuls les appareils
                      listés peuvent se connecter. En mode liste noire, les appareils listés sont bloqués.
                    </p>
                  </div>
                </div>
              )}

              {/* Planning Tab */}
              {activeTab === 'planning' && (
                <div className="space-y-4">
                  {/* Header with toggle */}
                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                    <div>
                      <h3 className="text-white font-medium">Planification WiFi</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Programmer l'activation/désactivation du WiFi
                      </p>
                    </div>
                    <button
                      onClick={() => togglePlanningEnabled(!planning?.enabled)}
                      disabled={savingPlanning}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        planning?.enabled ? 'bg-emerald-500' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        planning?.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Success message */}
                  {successMessage && (
                    <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                      <Check size={16} />
                      {successMessage}
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllGrid(true)}
                      className="flex-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-sm transition-colors"
                    >
                      Tout activer
                    </button>
                    <button
                      onClick={() => setAllGrid(false)}
                      className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                    >
                      Tout désactiver
                    </button>
                  </div>

                  {/* Planning Grid */}
                  <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4 overflow-x-auto">
                    <div className="min-w-[600px]">
                      {/* Hours header */}
                      <div className="flex mb-1">
                        <div className="w-12 flex-shrink-0" />
                        {HOURS.map(hour => (
                          <button
                            key={hour}
                            onClick={() => toggleColumn(hour)}
                            className="flex-1 text-center text-[10px] text-gray-500 hover:text-white transition-colors py-1"
                            title={`Basculer ${hour}h`}
                          >
                            {hour}
                          </button>
                        ))}
                      </div>

                      {/* Grid rows */}
                      {DAYS_FR.map((day, dayIndex) => (
                        <div key={day} className="flex items-center mb-0.5">
                          <button
                            onClick={() => toggleRow(dayIndex)}
                            className="w-12 flex-shrink-0 text-xs text-gray-400 hover:text-white transition-colors text-left pr-2"
                            title={`Basculer ${day}`}
                          >
                            {day}
                          </button>
                          <div className="flex-1 flex gap-0.5">
                            {HOURS.map(hour => (
                              <button
                                key={hour}
                                onClick={() => toggleGridCell(dayIndex, hour)}
                                className={`flex-1 h-5 rounded-sm transition-all ${
                                  planningGrid[dayIndex]?.[hour]
                                    ? 'bg-emerald-500 hover:bg-emerald-400'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                                title={`${day} ${hour}h-${hour + 1}h: ${planningGrid[dayIndex]?.[hour] ? 'WiFi actif' : 'WiFi inactif'}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Legend */}
                      <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-gray-800">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                          <span>WiFi actif</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-3 h-3 rounded-sm bg-gray-700" />
                          <span>WiFi inactif</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  {planningModified && (
                    <button
                      onClick={savePlanning}
                      disabled={savingPlanning}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {savingPlanning ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      Enregistrer les modifications
                    </button>
                  )}

                  {/* Info */}
                  <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <p className="text-xs text-blue-400">
                      <strong>Astuce :</strong> Cliquez sur un créneau pour basculer son état.
                      Cliquez sur un jour ou une heure pour basculer toute la ligne/colonne.
                    </p>
                  </div>
                </div>
              )}

              {/* WPS Tab */}
              {activeTab === 'wps' && (
                <div className="space-y-4">
                  <div className="p-6 bg-[#1a1a1a] rounded-xl border border-gray-800 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-gray-800">
                      <Wifi size={40} className="text-gray-400" />
                    </div>

                    <h3 className="text-lg font-medium text-white mb-2">
                      Wi-Fi Protected Setup
                    </h3>

                    <p className="text-sm text-gray-500 mb-6">
                      Connectez rapidement un appareil sans mot de passe
                    </p>

                    <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-left mb-4">
                      <p className="text-sm text-blue-400 mb-3">
                        <strong>Comment activer le WPS :</strong>
                      </p>
                      <ol className="text-xs text-blue-300 space-y-2 list-decimal list-inside">
                        <li>Sur l'écran LCD de votre Freebox Ultra, naviguez vers <strong>Paramètres &gt; WiFi &gt; WPS</strong></li>
                        <li>Ou utilisez l'application <strong>Freebox Connect</strong> sur votre téléphone</li>
                        <li>Ou accédez à <strong>mafreebox.freebox.fr</strong> &gt; Paramètres &gt; WiFi &gt; WPS</li>
                      </ol>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      <strong>Note :</strong> L'API WPS n'est pas disponible via l'API Freebox OS.
                      Le WPS doit être activé directement depuis l'interface de la Freebox.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};