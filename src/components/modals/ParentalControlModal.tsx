import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Clock,
  Globe,
  Ban,
  Wifi,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  Laptop,
  User,
  Power,
  PowerOff
} from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';
import type { Device } from '../../types';

interface ParentalControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices?: Device[];
}

// Network access mode types
type AccessMode = 'allowed' | 'denied' | 'webonly';

// Profile from API
interface Profile {
  id: number;
  name: string;
  url?: string;
}

// Network Control from API
interface NetworkControl {
  profile_id: number;
  next_change: number;
  override: boolean;
  override_mode: AccessMode;
  override_until: number;
  current_mode: AccessMode;
  rule_mode: AccessMode;
  macs: string[];
  hosts: string[];
  resolution: number;
  cdayranges: string[];
}

// Network Control Rule from API
interface NetworkControlRule {
  id: number;
  profile_id: number;
  name: string;
  mode: AccessMode;
  start_time: number;
  end_time: number;
  weekdays: boolean[];
  enabled: boolean;
}

export const ParentalControlModal: React.FC<ParentalControlModalProps> = ({
  isOpen,
  onClose,
  devices = []
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'rules'>('profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [networkControls, setNetworkControls] = useState<NetworkControl[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfileRules, setSelectedProfileRules] = useState<NetworkControlRule[]>([]);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<number>>(new Set());

  // Profile creation form
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Rule creation form
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleMode, setNewRuleMode] = useState<AccessMode>('denied');
  const [newRuleStartTime, setNewRuleStartTime] = useState('00:00');
  const [newRuleEndTime, setNewRuleEndTime] = useState('08:00');
  const [newRuleWeekdays, setNewRuleWeekdays] = useState<boolean[]>([true, true, true, true, true, false, false, false]);

  // Device assignment
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [assigningProfileId, setAssigningProfileId] = useState<number | null>(null);
  const [selectedMacs, setSelectedMacs] = useState<string[]>([]);

  // Override state
  const [overrideMode, setOverrideMode] = useState<AccessMode>('denied');
  const [overrideDuration, setOverrideDuration] = useState<number>(30); // minutes

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch profiles
      const profilesRes = await api.get<Profile[]>(API_ROUTES.PROFILES);
      if (profilesRes.success && profilesRes.result) {
        setProfiles(profilesRes.result);
      } else {
        // Check for permission error
        if (profilesRes.error?.code === 'INSUFFICIENT_RIGHTS') {
          setError('Droits insuffisants. Veuillez ajouter le droit "Gestion des profils utilisateur" à l\'application.');
          setIsLoading(false);
          return;
        }
        setError(profilesRes.error?.message || 'Erreur lors du chargement des profils');
        setIsLoading(false);
        return;
      }

      // Fetch network controls for all profiles
      const networkControlRes = await api.get<NetworkControl[]>(API_ROUTES.NETWORK_CONTROL);
      if (networkControlRes.success && networkControlRes.result) {
        setNetworkControls(networkControlRes.result);
      }
    } catch (err) {
      console.error('Error fetching parental data:', err);
      setError('Erreur lors du chargement du contrôle parental');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Get network control for a profile
  const getNetworkControl = (profileId: number): NetworkControl | null => {
    return networkControls.find(nc => nc.profile_id === profileId) || null;
  };

  // Fetch rules for a profile
  const fetchRulesForProfile = async (profileId: number) => {
    try {
      const response = await api.get<NetworkControlRule[]>(`${API_ROUTES.NETWORK_CONTROL}/${profileId}/rules`);
      if (response.success && response.result) {
        setSelectedProfileRules(response.result);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  };

  // Toggle profile expansion
  const toggleProfileExpand = async (profileId: number) => {
    const newExpanded = new Set(expandedProfiles);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
      // Fetch rules when expanding
      await fetchRulesForProfile(profileId);
    }
    setExpandedProfiles(newExpanded);
    setSelectedProfileId(profileId);
  };

  // Create new profile
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      setError('Veuillez entrer un nom de profil');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ id: number }>(API_ROUTES.PROFILES, {
        name: newProfileName,
        url: '/resources/images/profile/profile_01.png'
      });

      if (response.success && response.result) {
        await fetchData();
        setIsCreatingProfile(false);
        setNewProfileName('');
        showSuccess('Profil créé avec succès');
      } else {
        setError(response.error?.message || 'Erreur lors de la création du profil');
      }
    } catch {
      setError('Erreur lors de la création du profil');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete profile
  const handleDeleteProfile = async (profileId: number) => {
    if (!confirm('Supprimer ce profil ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.PROFILES}/${profileId}`);
      if (response.success) {
        setProfiles(profiles.filter(p => p.id !== profileId));
        showSuccess('Profil supprimé');
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  // Update network control (assign devices)
  const handleAssignDevices = async () => {
    if (assigningProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<NetworkControl>(`${API_ROUTES.NETWORK_CONTROL}/${assigningProfileId}`, {
        macs: selectedMacs
      });

      if (response.success) {
        await fetchData();
        setShowDeviceSelector(false);
        setAssigningProfileId(null);
        setSelectedMacs([]);
        showSuccess('Appareils assignés');
      } else {
        setError(response.error?.message || 'Erreur lors de l\'assignation');
      }
    } catch {
      setError('Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

  // Set override for a profile
  const handleSetOverride = async (profileId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const overrideUntil = Math.floor(Date.now() / 1000) + (overrideDuration * 60);
      const response = await api.put<NetworkControl>(`${API_ROUTES.NETWORK_CONTROL}/${profileId}`, {
        override: true,
        override_mode: overrideMode,
        override_until: overrideUntil
      });

      if (response.success) {
        await fetchData();
        showSuccess(`Mode temporaire activé pour ${overrideDuration} minutes`);
      } else {
        setError(response.error?.message || 'Erreur lors de l\'activation du mode temporaire');
      }
    } catch {
      setError('Erreur lors de l\'activation du mode temporaire');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear override for a profile
  const handleClearOverride = async (profileId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<NetworkControl>(`${API_ROUTES.NETWORK_CONTROL}/${profileId}`, {
        override: false
      });

      if (response.success) {
        await fetchData();
        showSuccess('Mode temporaire désactivé');
      } else {
        setError(response.error?.message || 'Erreur lors de la désactivation');
      }
    } catch {
      setError('Erreur lors de la désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  // Create rule
  const handleCreateRule = async () => {
    if (selectedProfileId === null) return;
    if (!newRuleName.trim()) {
      setError('Veuillez entrer un nom de règle');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert time strings to seconds since midnight
      const [startH, startM] = newRuleStartTime.split(':').map(Number);
      const [endH, endM] = newRuleEndTime.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60;
      const endSeconds = endH * 3600 + endM * 60;

      const response = await api.post<NetworkControlRule>(`${API_ROUTES.NETWORK_CONTROL}/${selectedProfileId}/rules`, {
        name: newRuleName,
        mode: newRuleMode,
        start_time: startSeconds,
        end_time: endSeconds,
        weekdays: newRuleWeekdays,
        enabled: true
      });

      if (response.success) {
        await fetchRulesForProfile(selectedProfileId);
        setIsCreatingRule(false);
        setNewRuleName('');
        showSuccess('Règle créée');
      } else {
        setError(response.error?.message || 'Erreur lors de la création de la règle');
      }
    } catch {
      setError('Erreur lors de la création de la règle');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: number) => {
    if (selectedProfileId === null) return;
    if (!confirm('Supprimer cette règle ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.NETWORK_CONTROL}/${selectedProfileId}/rules/${ruleId}`);
      if (response.success) {
        await fetchRulesForProfile(selectedProfileId);
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

  // Toggle rule enabled
  const handleToggleRule = async (rule: NetworkControlRule) => {
    if (selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<NetworkControlRule>(
        `${API_ROUTES.NETWORK_CONTROL}/${selectedProfileId}/rules/${rule.id}`,
        { enabled: !rule.enabled }
      );

      if (response.success) {
        await fetchRulesForProfile(selectedProfileId);
        showSuccess(rule.enabled ? 'Règle désactivée' : 'Règle activée');
      } else {
        setError(response.error?.message || 'Erreur lors de la modification');
      }
    } catch {
      setError('Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle device MAC in selection
  const toggleDeviceMac = (mac: string) => {
    if (selectedMacs.includes(mac)) {
      setSelectedMacs(selectedMacs.filter(m => m !== mac));
    } else {
      setSelectedMacs([...selectedMacs, mac]);
    }
  };

  // Get mode color
  const getModeColor = (mode: AccessMode) => {
    switch (mode) {
      case 'allowed': return 'text-emerald-400 bg-emerald-500/20';
      case 'denied': return 'text-red-400 bg-red-500/20';
      case 'webonly': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  // Get mode label
  const getModeLabel = (mode: AccessMode) => {
    switch (mode) {
      case 'allowed': return 'Autorisé';
      case 'denied': return 'Bloqué';
      case 'webonly': return 'Web seulement';
      default: return mode;
    }
  };

  // Get mode icon
  const getModeIcon = (mode: AccessMode) => {
    switch (mode) {
      case 'allowed': return <Globe size={14} />;
      case 'denied': return <Ban size={14} />;
      case 'webonly': return <Wifi size={14} />;
      default: return null;
    }
  };

  // Format seconds to time string
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Format remaining override time
  const formatRemainingTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = timestamp - now;
    if (remaining <= 0) return 'Expiré';
    if (remaining < 60) return `${remaining}s`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}min`;
    return `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}min`;
  };

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim', 'Vac'];

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
              <p className="text-xs text-gray-500">Gérer les restrictions d'accès Internet par profil</p>
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
            onClick={() => setActiveTab('profiles')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profiles'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={16} />
            Profils
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rules'
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

          {/* Profiles Tab */}
          {!isLoading && activeTab === 'profiles' && (
            <div className="space-y-4">
              {/* Add new profile button */}
              {!isCreatingProfile && (
                <button
                  onClick={() => setIsCreatingProfile(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Nouveau profil
                </button>
              )}

              {/* New profile form */}
              {isCreatingProfile && (
                <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 space-y-4">
                  <h3 className="text-sm font-medium text-white">Nouveau profil</h3>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Nom du profil (ex: Enfants)"
                    className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProfile}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      Créer
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingProfile(false);
                        setNewProfileName('');
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Profiles list */}
              <div className="space-y-2">
                {profiles.length === 0 && !isCreatingProfile && (
                  <div className="py-8 text-center text-gray-500">
                    <User size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Aucun profil configuré</p>
                    <p className="text-xs mt-1">Créez un profil pour gérer l'accès Internet de certains appareils</p>
                  </div>
                )}

                {profiles.map((profile) => {
                  const nc = getNetworkControl(profile.id);
                  const isExpanded = expandedProfiles.has(profile.id);

                  return (
                    <div
                      key={profile.id}
                      className="bg-[#1a1a1a] rounded-xl border border-gray-700 overflow-hidden"
                    >
                      {/* Profile header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/30"
                        onClick={() => toggleProfileExpand(profile.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                          <div className="p-2 bg-gray-700 rounded-lg">
                            <User size={16} className="text-gray-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-white">{profile.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {nc && (
                                <>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getModeColor(nc.current_mode)}`}>
                                    {getModeIcon(nc.current_mode)}
                                    {getModeLabel(nc.current_mode)}
                                  </span>
                                  {nc.override && (
                                    <span className="text-xs text-orange-400">
                                      (Temporaire: {formatRemainingTime(nc.override_until)})
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {nc.macs.length} appareil(s)
                                  </span>
                                </>
                              )}
                              {!nc && (
                                <span className="text-xs text-gray-500">Aucun appareil assigné</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Profile details */}
                      {isExpanded && (
                        <div className="border-t border-gray-700 p-4 space-y-4">
                          {/* Devices section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-xs font-medium text-gray-400 uppercase">Appareils</h5>
                              <button
                                onClick={() => {
                                  setAssigningProfileId(profile.id);
                                  setSelectedMacs(nc?.macs || []);
                                  setShowDeviceSelector(true);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                Modifier
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {nc?.hosts?.map((host, i) => (
                                <span key={i} className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded flex items-center gap-1">
                                  <Laptop size={12} />
                                  {host}
                                </span>
                              ))}
                              {nc?.macs && nc.macs.length > 0 && (!nc.hosts || nc.hosts.length === 0) && (
                                nc.macs.map((mac, i) => (
                                  <span key={i} className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
                                    {mac}
                                  </span>
                                ))
                              )}
                              {(!nc || nc.macs.length === 0) && (
                                <span className="text-xs text-gray-500">Aucun appareil assigné</span>
                              )}
                            </div>
                          </div>

                          {/* Override section */}
                          {nc && (
                            <div className="p-3 bg-[#252525] rounded-lg">
                              <h5 className="text-xs font-medium text-gray-400 uppercase mb-3">Mode temporaire</h5>
                              {nc.override ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getModeColor(nc.override_mode)}`}>
                                      {getModeIcon(nc.override_mode)}
                                      {getModeLabel(nc.override_mode)}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                      pendant encore {formatRemainingTime(nc.override_until)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleClearOverride(profile.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                                  >
                                    <PowerOff size={14} />
                                    Désactiver
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <select
                                    value={overrideMode}
                                    onChange={(e) => setOverrideMode(e.target.value as AccessMode)}
                                    className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm"
                                  >
                                    <option value="allowed">Autorisé</option>
                                    <option value="denied">Bloqué</option>
                                    <option value="webonly">Web seulement</option>
                                  </select>
                                  <span className="text-gray-400 text-sm">pendant</span>
                                  <select
                                    value={overrideDuration}
                                    onChange={(e) => setOverrideDuration(parseInt(e.target.value))}
                                    className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm"
                                  >
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="60">1 heure</option>
                                    <option value="120">2 heures</option>
                                    <option value="240">4 heures</option>
                                  </select>
                                  <button
                                    onClick={() => handleSetOverride(profile.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
                                  >
                                    <Power size={14} />
                                    Activer
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Device selector modal */}
              {showDeviceSelector && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
                  <div className="bg-[#1a1a1a] rounded-xl border border-gray-700 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-sm font-medium text-white">Assigner des appareils</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {devices.filter(d => d.mac).map((device) => (
                        <label
                          key={device.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700/50 cursor-pointer rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMacs.includes(device.mac!)}
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
                    <div className="p-4 border-t border-gray-700 flex gap-2">
                      <button
                        onClick={handleAssignDevices}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                      >
                        <Save size={16} />
                        Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setShowDeviceSelector(false);
                          setAssigningProfileId(null);
                          setSelectedMacs([]);
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {!isLoading && activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Profile selector */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sélectionner un profil</label>
                <select
                  value={selectedProfileId || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    if (id) {
                      setSelectedProfileId(id);
                      fetchRulesForProfile(id);
                    } else {
                      setSelectedProfileId(null);
                      setSelectedProfileRules([]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner...</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProfileId && (
                <>
                  {/* Add rule button */}
                  {!isCreatingRule && (
                    <button
                      onClick={() => setIsCreatingRule(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Nouvelle règle
                    </button>
                  )}

                  {/* New rule form */}
                  {isCreatingRule && (
                    <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 space-y-4">
                      <h3 className="text-sm font-medium text-white">Nouvelle règle de planification</h3>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nom</label>
                        <input
                          type="text"
                          value={newRuleName}
                          onChange={(e) => setNewRuleName(e.target.value)}
                          placeholder="Ex: Nuit (blocage)"
                          className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Mode</label>
                        <div className="flex gap-2">
                          {(['allowed', 'denied', 'webonly'] as AccessMode[]).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setNewRuleMode(mode)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                newRuleMode === mode
                                  ? getModeColor(mode)
                                  : 'bg-gray-800 text-gray-400 hover:text-white'
                              }`}
                            >
                              {getModeIcon(mode)}
                              {getModeLabel(mode)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">De</label>
                          <input
                            type="time"
                            value={newRuleStartTime}
                            onChange={(e) => setNewRuleStartTime(e.target.value)}
                            className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">À</label>
                          <input
                            type="time"
                            value={newRuleEndTime}
                            onChange={(e) => setNewRuleEndTime(e.target.value)}
                            className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Jours</label>
                        <div className="flex flex-wrap gap-2">
                          {days.map((day, idx) => (
                            <button
                              key={day}
                              onClick={() => {
                                const newWeekdays = [...newRuleWeekdays];
                                newWeekdays[idx] = !newWeekdays[idx];
                                setNewRuleWeekdays(newWeekdays);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                newRuleWeekdays[idx]
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-800 text-gray-400 hover:text-white'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateRule}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Save size={16} />
                          Créer
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingRule(false);
                            setNewRuleName('');
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rules list */}
                  <div className="space-y-2">
                    {selectedProfileRules.length === 0 && !isCreatingRule && (
                      <div className="py-8 text-center text-gray-500">
                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                        <p>Aucune règle de planification</p>
                        <p className="text-xs mt-1">Les règles définissent automatiquement le mode d'accès selon l'heure</p>
                      </div>
                    )}

                    {selectedProfileRules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 ${!rule.enabled ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-medium text-white">{rule.name}</h4>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getModeColor(rule.mode)}`}>
                                {getModeIcon(rule.mode)}
                                {getModeLabel(rule.mode)}
                              </span>
                              {!rule.enabled && (
                                <span className="text-xs text-gray-500">(Désactivé)</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                              <Clock size={12} />
                              {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                              <span className="text-gray-600">|</span>
                              {days.filter((_, idx) => rule.weekdays[idx]).join(', ')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className={`p-2 rounded-lg transition-colors ${
                                rule.enabled
                                  ? 'hover:bg-gray-700 text-emerald-400'
                                  : 'hover:bg-gray-700 text-gray-500'
                              }`}
                              title={rule.enabled ? 'Désactiver' : 'Activer'}
                            >
                              <Power size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!selectedProfileId && (
                <div className="py-8 text-center text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Sélectionnez un profil pour gérer ses règles</p>
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
