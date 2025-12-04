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
  Check,
  Globe,
  Server,
  Power
} from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';
import type { Device } from '../../types';

interface PortForwardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices?: Device[];
}

// Port forwarding rule
interface PortForwardingRule {
  id: number;
  enabled: boolean;
  comment?: string;
  lan_port: number;
  wan_port_start: number;
  wan_port_end?: number;
  lan_ip: string;
  ip_proto: 'tcp' | 'udp' | 'tcp_udp';
  src_ip?: string;
}

// DMZ config
interface DmzConfig {
  enabled: boolean;
  ip: string;
}

export const PortForwardingModal: React.FC<PortForwardingModalProps> = ({
  isOpen,
  onClose,
  devices = []
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'dmz'>('rules');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Rules state
  const [rules, setRules] = useState<PortForwardingRule[]>([]);
  const [editingRule, setEditingRule] = useState<PortForwardingRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New rule form
  const [newRule, setNewRule] = useState<Partial<PortForwardingRule>>({
    enabled: true,
    ip_proto: 'tcp',
    wan_port_start: 0,
    lan_port: 0,
    lan_ip: '',
    comment: ''
  });

  // DMZ config
  const [dmzConfig, setDmzConfig] = useState<DmzConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch port forwarding rules
      const rulesRes = await api.get<PortForwardingRule[]>(`${API_ROUTES.SETTINGS_NAT}/redirections`);
      if (rulesRes.success && rulesRes.result) {
        setRules(rulesRes.result);
      }

      // Fetch DMZ config
      const dmzRes = await api.get<DmzConfig>(`${API_ROUTES.SETTINGS_NAT}/dmz`);
      if (dmzRes.success && dmzRes.result) {
        setDmzConfig(dmzRes.result);
      }
    } catch (err) {
      const errorCode = (err as { error_code?: string })?.error_code;
      if (errorCode === 'insufficient_rights') {
        setError('Droits insuffisants. Veuillez réenregistrer l\'application avec les droits "Modification des réglages".');
      } else {
        setError('Erreur lors du chargement des règles de pare-feu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Create new rule
  const handleCreateRule = async () => {
    if (!newRule.lan_ip || !newRule.wan_port_start || !newRule.lan_port) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<PortForwardingRule>(`${API_ROUTES.SETTINGS_NAT}/redirections`, {
        enabled: newRule.enabled,
        ip_proto: newRule.ip_proto,
        wan_port_start: newRule.wan_port_start,
        wan_port_end: newRule.wan_port_end || newRule.wan_port_start,
        lan_port: newRule.lan_port,
        lan_ip: newRule.lan_ip,
        comment: newRule.comment || '',
        src_ip: newRule.src_ip || ''
      });

      if (response.success && response.result) {
        setRules([...rules, response.result]);
        setIsCreating(false);
        setNewRule({
          enabled: true,
          ip_proto: 'tcp',
          wan_port_start: 0,
          lan_port: 0,
          lan_ip: '',
          comment: ''
        });
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

  // Update rule
  const handleUpdateRule = async (rule: PortForwardingRule) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<PortForwardingRule>(`${API_ROUTES.SETTINGS_NAT}/redirections/${rule.id}`, {
        enabled: rule.enabled,
        ip_proto: rule.ip_proto,
        wan_port_start: rule.wan_port_start,
        wan_port_end: rule.wan_port_end || rule.wan_port_start,
        lan_port: rule.lan_port,
        lan_ip: rule.lan_ip,
        comment: rule.comment || ''
      });

      if (response.success && response.result) {
        setRules(rules.map(r => r.id === rule.id ? response.result! : r));
        setEditingRule(null);
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

  // Toggle rule enabled
  const handleToggleRule = async (rule: PortForwardingRule) => {
    await handleUpdateRule({ ...rule, enabled: !rule.enabled });
  };

  // Delete rule
  const handleDeleteRule = async (id: number) => {
    if (!confirm('Supprimer cette règle de redirection ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.SETTINGS_NAT}/redirections/${id}`);
      if (response.success) {
        setRules(rules.filter(r => r.id !== id));
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

  // Update DMZ config
  const handleUpdateDmz = async () => {
    if (!dmzConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<DmzConfig>(`${API_ROUTES.SETTINGS_NAT}/dmz`, dmzConfig);
      if (response.success) {
        showSuccess('Configuration DMZ mise à jour');
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Get protocol label
  const getProtoLabel = (proto: string) => {
    switch (proto) {
      case 'tcp': return 'TCP';
      case 'udp': return 'UDP';
      case 'tcp_udp': return 'TCP+UDP';
      default: return proto.toUpperCase();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#121212] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Shield size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Pare-feu</h2>
              <p className="text-xs text-gray-500">Redirection de ports et DMZ</p>
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
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Server size={16} />
            Redirections
          </button>
          <button
            onClick={() => setActiveTab('dmz')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dmz'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe size={16} />
            DMZ
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

          {/* Rules Tab */}
          {!isLoading && activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Add new rule button */}
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Nouvelle redirection
                </button>
              )}

              {/* New rule form */}
              {isCreating && (
                <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 space-y-4">
                  <h3 className="text-sm font-medium text-white">Nouvelle redirection de port</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Protocol */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Protocole</label>
                      <select
                        value={newRule.ip_proto}
                        onChange={(e) => setNewRule({ ...newRule, ip_proto: e.target.value as 'tcp' | 'udp' | 'tcp_udp' })}
                        className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                        <option value="tcp_udp">TCP + UDP</option>
                      </select>
                    </div>

                    {/* WAN Port */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Port externe (WAN)</label>
                      <input
                        type="number"
                        value={newRule.wan_port_start || ''}
                        onChange={(e) => setNewRule({ ...newRule, wan_port_start: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 8080"
                        min="1"
                        max="65535"
                        className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* LAN IP */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">IP destination (LAN)</label>
                      <select
                        value={newRule.lan_ip}
                        onChange={(e) => setNewRule({ ...newRule, lan_ip: e.target.value })}
                        className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Sélectionner un appareil...</option>
                        {devices.filter(d => d.ip).map((device) => (
                          <option key={device.id} value={device.ip!}>
                            {device.name} ({device.ip})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* LAN Port */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Port destination (LAN)</label>
                      <input
                        type="number"
                        value={newRule.lan_port || ''}
                        onChange={(e) => setNewRule({ ...newRule, lan_port: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 80"
                        min="1"
                        max="65535"
                        className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Commentaire (optionnel)</label>
                    <input
                      type="text"
                      value={newRule.comment || ''}
                      onChange={(e) => setNewRule({ ...newRule, comment: e.target.value })}
                      placeholder="Ex: Serveur web"
                      className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Enabled toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRule.enabled}
                      onChange={(e) => setNewRule({ ...newRule, enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white">Activer immédiatement</span>
                  </label>

                  {/* Actions */}
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
                        setIsCreating(false);
                        setNewRule({
                          enabled: true,
                          ip_proto: 'tcp',
                          wan_port_start: 0,
                          lan_port: 0,
                          lan_ip: '',
                          comment: ''
                        });
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
                {rules.length === 0 && !isCreating && (
                  <div className="py-8 text-center text-gray-500">
                    <Server size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Aucune redirection de port configurée</p>
                    <p className="text-xs mt-1">Les redirections permettent d'exposer des services internes sur Internet</p>
                  </div>
                )}

                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700 group"
                  >
                    {editingRule?.id === rule.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={editingRule.ip_proto}
                            onChange={(e) => setEditingRule({ ...editingRule, ip_proto: e.target.value as 'tcp' | 'udp' | 'tcp_udp' })}
                            className="px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                          >
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                            <option value="tcp_udp">TCP + UDP</option>
                          </select>
                          <input
                            type="number"
                            value={editingRule.wan_port_start}
                            onChange={(e) => setEditingRule({ ...editingRule, wan_port_start: parseInt(e.target.value) || 0 })}
                            placeholder="Port WAN"
                            className="px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                          />
                          <input
                            type="text"
                            value={editingRule.lan_ip}
                            onChange={(e) => setEditingRule({ ...editingRule, lan_ip: e.target.value })}
                            placeholder="IP LAN"
                            className="px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm font-mono"
                          />
                          <input
                            type="number"
                            value={editingRule.lan_port}
                            onChange={(e) => setEditingRule({ ...editingRule, lan_port: parseInt(e.target.value) || 0 })}
                            placeholder="Port LAN"
                            className="px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingRule.comment || ''}
                          onChange={(e) => setEditingRule({ ...editingRule, comment: e.target.value })}
                          placeholder="Commentaire"
                          className="w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateRule(editingRule)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm"
                          >
                            <Save size={14} />
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingRule(null)}
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
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className={`p-1 rounded transition-colors ${
                                rule.enabled
                                  ? 'text-emerald-400 hover:bg-emerald-900/30'
                                  : 'text-gray-600 hover:bg-gray-700'
                              }`}
                              title={rule.enabled ? 'Désactiver' : 'Activer'}
                            >
                              <Power size={16} />
                            </button>
                            <h4 className="text-sm font-medium text-white">
                              {rule.comment || `Port ${rule.wan_port_start}`}
                            </h4>
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                              {getProtoLabel(rule.ip_proto)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-8">
                            :{rule.wan_port_start}{rule.wan_port_end && rule.wan_port_end !== rule.wan_port_start ? `-${rule.wan_port_end}` : ''} → {rule.lan_ip}:{rule.lan_port}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={14} className="text-gray-400" />
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DMZ Tab */}
          {!isLoading && activeTab === 'dmz' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-700">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Globe size={20} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Zone démilitarisée (DMZ)</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Expose un appareil directement sur Internet. Utilisez avec précaution !
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg mb-4">
                  <p className="text-xs text-orange-400">
                    <strong>Attention :</strong> L'appareil en DMZ est exposé sans protection du pare-feu.
                    Utilisez uniquement si vous savez ce que vous faites.
                  </p>
                </div>

                {dmzConfig && (
                  <div className="space-y-4">
                    {/* Enable toggle */}
                    <label className="flex items-center justify-between py-3 border-b border-gray-800">
                      <span className="text-sm text-white">Activer la DMZ</span>
                      <button
                        onClick={() => setDmzConfig({ ...dmzConfig, enabled: !dmzConfig.enabled })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          dmzConfig.enabled ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            dmzConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>

                    {/* IP selection */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Appareil en DMZ</label>
                      <select
                        value={dmzConfig.ip}
                        onChange={(e) => setDmzConfig({ ...dmzConfig, ip: e.target.value })}
                        disabled={!dmzConfig.enabled}
                        className={`w-full px-3 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 ${
                          !dmzConfig.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <option value="">Aucun appareil</option>
                        {devices.filter(d => d.ip).map((device) => (
                          <option key={device.id} value={device.ip!}>
                            {device.name} ({device.ip})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleUpdateDmz}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortForwardingModal;