import React, { useEffect, useState } from 'react';
import {
  Settings,
  Wifi,
  Network,
  HardDrive,
  Shield,
  Server,
  Monitor,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  Globe,
  Lock,
  Power,
  Clock,
  Users,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Lightbulb
} from 'lucide-react';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import { ParentalControlModal } from '../components/modals/ParentalControlModal';
import { PortForwardingModal } from '../components/modals/PortForwardingModal';
import { VpnModal } from '../components/modals/VpnModal';
import { RebootScheduleModal } from '../components/modals/RebootScheduleModal';
import { useLanStore } from '../stores/lanStore';
import { useAuthStore } from '../stores/authStore';
import { useSystemStore } from '../stores/systemStore';
import { getPermissionErrorMessage, getPermissionShortError, getFreeboxSettingsUrl } from '../utils/permissions';

interface SettingsPageProps {
  onBack: () => void;
}

type SettingsTab = 'network' | 'wifi' | 'dhcp' | 'storage' | 'security' | 'system';

// Toggle component
const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
  >
    <span
      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// Setting row component
const SettingRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-gray-800 last:border-b-0">
    <div className="flex-1">
      <h4 className="text-sm font-medium text-white">{label}</h4>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <div className="ml-4">{children}</div>
  </div>
);

// Section component
const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  permissionError?: string | null;
  freeboxSettingsUrl?: string | null;
}> = ({ title, icon: Icon, children, permissionError, freeboxSettingsUrl }) => (
  <div className={`bg-[#121212] rounded-xl border border-gray-800 overflow-hidden ${permissionError ? 'opacity-60' : ''}`}>
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#0f0f0f]">
      <Icon size={18} className="text-gray-400" />
      <h3 className="font-medium text-white">{title}</h3>
    </div>
    {permissionError && (
      <div className="px-4 py-3 bg-amber-900/20 border-b border-amber-700/30">
        <p className="text-amber-400 text-xs">
          {permissionError}
          {freeboxSettingsUrl && (
            <>
              {' '}
              <a
                href={freeboxSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline"
              >
                Ouvrir les paramètres Freebox
                <ExternalLink size={12} />
              </a>
            </>
          )}
        </p>
      </div>
    )}
    <div className={`px-4 ${permissionError ? 'pointer-events-none' : ''}`}>{children}</div>
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('network');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showParentalModal, setShowParentalModal] = useState(false);
  const [showFirewallModal, setShowFirewallModal] = useState(false);
  const [showVpnModal, setShowVpnModal] = useState(false);
  const [showRebootScheduleModal, setShowRebootScheduleModal] = useState(false);

  // Get devices from LAN store for parental control
  const { devices } = useLanStore();
  const { reboot } = useSystemStore();

  // Get permissions and freebox URL from auth store
  const { permissions, freeboxUrl } = useAuthStore();

  // Helper to check if a permission is granted (defaults to false if not present)
  const hasPermission = (permission: keyof typeof permissions): boolean => {
    return permissions[permission] === true;
  };

  // Connection settings
  const [connectionConfig, setConnectionConfig] = useState<{
    remote_access: boolean;
    remote_access_port: number;
    ping: boolean;
    wol: boolean;
    adblock: boolean;
  } | null>(null);

  // Original config for diff comparison
  const [originalConnectionConfig, setOriginalConnectionConfig] = useState<typeof connectionConfig>(null);

  // DHCP settings
  const [dhcpConfig, setDhcpConfig] = useState<{
    enabled: boolean;
    ip_range_start: string;
    ip_range_end: string;
    netmask: string;
    gateway: string;
    dns: string[];  // Array of DNS servers
    sticky_assign: boolean;
    always_broadcast: boolean;
  } | null>(null);

  // DHCP static leases
  const [staticLeases, setStaticLeases] = useState<Array<{
    id: string;
    mac: string;
    ip: string;
    comment: string;
    hostname?: string;
  }>>([]);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [editingLease, setEditingLease] = useState<{
    id?: string;
    mac: string;
    ip: string;
    comment: string;
  } | null>(null);

  // FTP settings
  const [ftpConfig, setFtpConfig] = useState<{
    enabled: boolean;
    allow_anonymous: boolean;
    allow_anonymous_write: boolean;
    port_ctrl: number;
  } | null>(null);

  // LCD settings (includes LED strip for Ultra 25 ans edition)
  const [lcdConfig, setLcdConfig] = useState<{
    brightness: number;
    orientation: number;
    orientation_forced: boolean;
    hide_wifi_key?: boolean;
    hide_status_led?: boolean;
    // LED Strip (Ultra 25 ans edition only)
    led_strip_enabled?: boolean;
    led_strip_brightness?: number;
    led_strip_animation?: string;
    available_led_strip_animations?: string[];
  } | null>(null);

  // WiFi planning
  const [wifiPlanning, setWifiPlanning] = useState<{
    enabled: boolean;
  } | null>(null);

  // Parental control profiles
  const [parentalProfiles, setParentalProfiles] = useState<Array<{
    id: number;
    name: string;
  }>>([]);

  // Port forwarding rules (firewall)
  const [portForwardingRules, setPortForwardingRules] = useState<Array<{
    id: number;
    enabled: boolean;
    comment?: string;
    lan_port: number;
    wan_port_start: number;
    wan_port_end?: number;
    lan_ip: string;
    ip_proto: string;
  }>>([]);

  // VPN server config
  const [vpnServerConfig, setVpnServerConfig] = useState<{
    enabled: boolean;
  } | null>(null);

  const [vpnUsers, setVpnUsers] = useState<Array<{
    login: string;
    ip_reservation?: string;
  }>>([]);

  // Fetch settings based on active tab
  useEffect(() => {
    fetchSettings();
  }, [activeTab]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'network': {
          const response = await api.get<typeof connectionConfig>(API_ROUTES.CONNECTION_CONFIG);
          if (response.success && response.result) {
            setConnectionConfig(response.result);
            setOriginalConnectionConfig(response.result);
          }
          break;
        }
        case 'dhcp': {
          const response = await api.get<typeof dhcpConfig>(API_ROUTES.SETTINGS_DHCP);
          if (response.success && response.result) {
            setDhcpConfig(response.result);
          }
          // Fetch static leases
          const leasesResponse = await api.get<typeof staticLeases>(API_ROUTES.DHCP_STATIC_LEASES);
          if (leasesResponse.success && leasesResponse.result) {
            setStaticLeases(Array.isArray(leasesResponse.result) ? leasesResponse.result : []);
          }
          break;
        }
        case 'storage': {
          const response = await api.get<typeof ftpConfig>(API_ROUTES.SETTINGS_FTP);
          if (response.success && response.result) {
            setFtpConfig(response.result);
          }
          break;
        }
        case 'system': {
          const response = await api.get<typeof lcdConfig>(API_ROUTES.SETTINGS_LCD);
          if (response.success && response.result) {
            setLcdConfig(response.result);
          }
          break;
        }
        case 'wifi': {
          const response = await api.get<typeof wifiPlanning>(API_ROUTES.WIFI_PLANNING);
          if (response.success && response.result) {
            setWifiPlanning(response.result);
          }
          break;
        }
        case 'security': {
          // Fetch parental profiles
          try {
            const profilesRes = await api.get<Array<{ id: number; name: string }>>(API_ROUTES.PROFILES);
            if (profilesRes.success && profilesRes.result) {
              setParentalProfiles(profilesRes.result);
            }
          } catch {
            // Silently fail - parental control may not be available
          }

          // Fetch port forwarding rules
          try {
            const natRes = await api.get<Array<typeof portForwardingRules[0]>>(`${API_ROUTES.SETTINGS_NAT}/redirections`);
            if (natRes.success && natRes.result) {
              setPortForwardingRules(natRes.result);
            }
          } catch {
            // Silently fail - NAT may not be available
          }

          // Fetch VPN server config
          try {
            const vpnRes = await api.get<{ enabled: boolean }>(API_ROUTES.SETTINGS_VPN_SERVER);
            if (vpnRes.success && vpnRes.result) {
              setVpnServerConfig(vpnRes.result);
            }
          } catch {
            // Silently fail - VPN may not be available
          }

          // Fetch VPN users
          try {
            const vpnUsersRes = await api.get<Array<{ login: string; ip_reservation?: string }>>(`${API_ROUTES.SETTINGS_VPN_SERVER.replace('/server', '/users')}`);
            if (vpnUsersRes.success && vpnUsersRes.result) {
              setVpnUsers(vpnUsersRes.result);
            }
          } catch {
            // Silently fail
          }
          break;
        }
      }
    } catch {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const saveConnectionConfig = async () => {
    if (!connectionConfig || !originalConnectionConfig) return;

    // Build payload with only modified fields
    const changedFields: Partial<typeof connectionConfig> = {};
    for (const key of Object.keys(connectionConfig) as Array<keyof typeof connectionConfig>) {
      if (connectionConfig[key] !== originalConnectionConfig[key]) {
        changedFields[key] = connectionConfig[key] as never;
      }
    }

    // If nothing changed, don't send request
    if (Object.keys(changedFields).length === 0) {
      showSuccess('Aucune modification à enregistrer');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.CONNECTION_CONFIG, changedFields);
      if (response.success) {
        showSuccess('Paramètres réseau enregistrés');
        // Update original config to reflect saved state
        setOriginalConnectionConfig({ ...connectionConfig });
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDhcpConfig = async () => {
    if (!dhcpConfig) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.SETTINGS_DHCP, dhcpConfig);
      if (response.success) {
        showSuccess('Paramètres DHCP enregistrés');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  // DHCP Static Leases management
  const addStaticLease = () => {
    setEditingLease({ mac: '', ip: '', comment: '' });
    setShowLeaseModal(true);
  };

  const editStaticLease = (lease: typeof staticLeases[0]) => {
    setEditingLease({ id: lease.id, mac: lease.mac, ip: lease.ip, comment: lease.comment });
    setShowLeaseModal(true);
  };

  const saveStaticLease = async () => {
    if (!editingLease) return;
    setIsLoading(true);
    try {
      let response;
      if (editingLease.id) {
        // Update existing lease
        response = await api.put(`${API_ROUTES.DHCP_STATIC_LEASES}/${editingLease.id}`, {
          mac: editingLease.mac,
          ip: editingLease.ip,
          comment: editingLease.comment
        });
      } else {
        // Create new lease
        response = await api.post(API_ROUTES.DHCP_STATIC_LEASES, {
          mac: editingLease.mac,
          ip: editingLease.ip,
          comment: editingLease.comment
        });
      }

      if (response.success) {
        showSuccess(editingLease.id ? 'Bail statique modifié' : 'Bail statique ajouté');
        setShowLeaseModal(false);
        setEditingLease(null);
        // Refresh leases
        fetchSettings();
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStaticLease = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce bail statique ?')) return;
    setIsLoading(true);
    try {
      const response = await api.delete(`${API_ROUTES.DHCP_STATIC_LEASES}/${id}`);
      if (response.success) {
        showSuccess('Bail statique supprimé');
        // Refresh leases
        fetchSettings();
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const saveFtpConfig = async () => {
    if (!ftpConfig) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.SETTINGS_FTP, ftpConfig);
      if (response.success) {
        showSuccess('Paramètres FTP enregistrés');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLcdConfig = async () => {
    if (!lcdConfig) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.SETTINGS_LCD, lcdConfig);
      if (response.success) {
        showSuccess('Paramètres écran enregistrés');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWifiPlanning = async () => {
    if (!wifiPlanning) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.WIFI_PLANNING, wifiPlanning);
      if (response.success) {
        showSuccess('Planification WiFi enregistrée');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReboot = async () => {
    if (confirm('Êtes-vous sûr de vouloir redémarrer la Freebox ?')) {
      setIsLoading(true);
      const success = await reboot();
      setIsLoading(false);
      
      if (success) {
        showSuccess('Redémarrage en cours...');
      } else {
        setError('Échec du redémarrage');
      }
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'network', label: 'Réseau', icon: Globe },
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'dhcp', label: 'DHCP', icon: Network },
    { id: 'storage', label: 'Stockage', icon: HardDrive },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'system', label: 'Système', icon: Server }
  ];

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
                <div className="p-2 bg-gray-700/50 rounded-lg">
                  <Settings size={24} className="text-gray-300" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Paramètres</h1>
                  <p className="text-sm text-gray-500">Configuration de la Freebox</p>
                </div>
              </div>
            </div>

            <button
              onClick={fetchSettings}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-[#121212] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-xl flex items-center gap-3">
            <Save className="text-emerald-400" size={18} />
            <p className="text-emerald-400">{successMessage}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-gray-400 animate-spin" />
          </div>
        )}

        {/* Network settings */}
        {!isLoading && activeTab === 'network' && connectionConfig && (
          <div className="space-y-6">
            <Section title="Accès distant" icon={Globe} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Accès distant"
                description="Permet l'accès à la Freebox depuis Internet"
              >
                <Toggle
                  enabled={connectionConfig.remote_access}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, remote_access: v })}
                />
              </SettingRow>
              <SettingRow
                label="Port d'accès distant"
                description="Port HTTP pour l'accès distant à la Freebox"
              >
                <input
                  type="number"
                  value={connectionConfig.remote_access_port}
                  onChange={(e) => setConnectionConfig({ ...connectionConfig, remote_access_port: parseInt(e.target.value) })}
                  className="w-24 px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </SettingRow>
            </Section>

            <Section title="Options réseau" icon={Network} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Réponse au ping"
                description="Répond aux requêtes ping depuis Internet"
              >
                <Toggle
                  enabled={connectionConfig.ping}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, ping: v })}
                />
              </SettingRow>
              <SettingRow
                label="Wake on LAN"
                description="Permet de réveiller les appareils depuis Internet"
              >
                <Toggle
                  enabled={connectionConfig.wol}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, wol: v })}
                />
              </SettingRow>
              <SettingRow
                label="Blocage de publicités"
                description="Active le blocage DNS des publicités"
              >
                <Toggle
                  enabled={connectionConfig.adblock}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, adblock: v })}
                />
              </SettingRow>
            </Section>

            <button
              onClick={saveConnectionConfig}
              disabled={!hasPermission('settings')}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        )}

        {/* WiFi settings */}
        {!isLoading && activeTab === 'wifi' && (
          <div className="space-y-6">
            <Section title="Planification WiFi" icon={Clock} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Planification active"
                description="Active les horaires d'extinction automatique du WiFi"
              >
                <Toggle
                  enabled={wifiPlanning?.enabled || false}
                  onChange={(v) => setWifiPlanning({ ...wifiPlanning, enabled: v })}
                />
              </SettingRow>
              <div className="py-4 text-sm text-gray-500">
                <p>Configurez les plages horaires dans l'interface détaillée.</p>
                <p className="mt-2">Le WiFi peut être automatiquement désactivé la nuit pour économiser l'énergie.</p>
              </div>
            </Section>

            <Section title="Filtrage MAC" icon={Shield} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <div className="py-4 text-sm text-gray-500">
                <p>Le filtrage MAC permet de restreindre l'accès au WiFi à des appareils spécifiques.</p>
                <p className="mt-2">Mode liste blanche : seuls les appareils autorisés peuvent se connecter.</p>
                <p>Mode liste noire : les appareils listés sont bloqués.</p>
              </div>
            </Section>

            {wifiPlanning && (
              <button
                onClick={saveWifiPlanning}
                disabled={!hasPermission('settings')}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save size={16} />
                Enregistrer
              </button>
            )}
          </div>
        )}

        {/* DHCP settings */}
        {!isLoading && activeTab === 'dhcp' && dhcpConfig && (
          <div className="space-y-6">
            <Section title="Serveur DHCP" icon={Network} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="DHCP activé"
                description="Attribution automatique des adresses IP"
              >
                <Toggle
                  enabled={dhcpConfig.enabled}
                  onChange={(v) => setDhcpConfig({ ...dhcpConfig, enabled: v })}
                />
              </SettingRow>
              <SettingRow label="Début de plage IP">
                <input
                  type="text"
                  value={dhcpConfig.ip_range_start}
                  onChange={(e) => setDhcpConfig({ ...dhcpConfig, ip_range_start: e.target.value })}
                  className="w-40 px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </SettingRow>
              <SettingRow label="Fin de plage IP">
                <input
                  type="text"
                  value={dhcpConfig.ip_range_end}
                  onChange={(e) => setDhcpConfig({ ...dhcpConfig, ip_range_end: e.target.value })}
                  className="w-40 px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </SettingRow>
              <SettingRow
                label="Serveurs DNS"
                description="Serveurs DNS distribués aux clients DHCP"
              >
                <div className="flex flex-col gap-2">
                  {(dhcpConfig.dns || []).map((dns, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={dns}
                        onChange={(e) => {
                          const newDns = [...(dhcpConfig.dns || [])];
                          newDns[index] = e.target.value;
                          setDhcpConfig({ ...dhcpConfig, dns: newDns });
                        }}
                        placeholder="192.168.1.254"
                        className="w-40 px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newDns = (dhcpConfig.dns || []).filter((_, i) => i !== index);
                          setDhcpConfig({ ...dhcpConfig, dns: newDns });
                        }}
                        className="p-1.5 hover:bg-gray-800 rounded text-red-400 hover:text-red-300 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(dhcpConfig.dns || []).length < 3 && (
                    <button
                      onClick={() => {
                        const newDns = [...(dhcpConfig.dns || []), ''];
                        setDhcpConfig({ ...dhcpConfig, dns: newDns });
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg text-gray-400 hover:text-white text-sm transition-colors w-fit"
                    >
                      <Plus size={14} />
                      Ajouter DNS
                    </button>
                  )}
                </div>
              </SettingRow>
              <SettingRow
                label="Attribution persistante"
                description="Conserver l'attribution IP entre les redémarrages"
              >
                <Toggle
                  enabled={dhcpConfig.sticky_assign}
                  onChange={(v) => setDhcpConfig({ ...dhcpConfig, sticky_assign: v })}
                />
              </SettingRow>
            </Section>

            <button
              onClick={saveDhcpConfig}
              disabled={!hasPermission('settings')}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={16} />
              Enregistrer
            </button>

            {/* Static Leases Section */}
            <Section title="Baux DHCP statiques" icon={Network} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-gray-500">({staticLeases.length} bail{staticLeases.length !== 1 ? 'x' : ''})</span>
                <button
                  onClick={addStaticLease}
                  disabled={!hasPermission('settings')}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              </div>
              <div className="overflow-x-auto">
                {staticLeases.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-[#0a0a0a] border-b border-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Adresse MAC</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Commentaire</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hostname</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {staticLeases.map((lease) => (
                        <tr key={lease.id} className="hover:bg-[#0a0a0a] transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-white">{lease.mac}</td>
                          <td className="px-4 py-3 text-sm font-mono text-white">{lease.ip}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{lease.comment || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{lease.hostname || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => editStaticLease(lease)}
                                className="p-1.5 hover:bg-gray-800 rounded text-blue-400 hover:text-blue-300 transition-colors"
                                title="Modifier"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => deleteStaticLease(lease.id)}
                                className="p-1.5 hover:bg-gray-800 rounded text-red-400 hover:text-red-300 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Network size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun bail statique configuré</p>
                    <p className="text-xs mt-1">Cliquez sur "Ajouter" pour en créer un</p>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* Storage (FTP) settings */}
        {!isLoading && activeTab === 'storage' && ftpConfig && (
          <div className="space-y-6">
            <Section title="Serveur FTP" icon={Share2} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="FTP activé"
                description="Permet l'accès aux fichiers via FTP"
              >
                <Toggle
                  enabled={ftpConfig.enabled}
                  onChange={(v) => setFtpConfig({ ...ftpConfig, enabled: v })}
                />
              </SettingRow>
              <SettingRow
                label="Accès anonyme"
                description="Permet l'accès sans authentification"
              >
                <Toggle
                  enabled={ftpConfig.allow_anonymous}
                  onChange={(v) => setFtpConfig({ ...ftpConfig, allow_anonymous: v })}
                />
              </SettingRow>
              <SettingRow
                label="Écriture anonyme"
                description="Permet aux anonymes de créer/modifier des fichiers"
              >
                <Toggle
                  enabled={ftpConfig.allow_anonymous_write}
                  onChange={(v) => setFtpConfig({ ...ftpConfig, allow_anonymous_write: v })}
                />
              </SettingRow>
              <SettingRow label="Port FTP">
                <input
                  type="number"
                  value={ftpConfig.port_ctrl}
                  onChange={(e) => setFtpConfig({ ...ftpConfig, port_ctrl: parseInt(e.target.value) })}
                  className="w-24 px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </SettingRow>
            </Section>

            <button
              onClick={saveFtpConfig}
              disabled={!hasPermission('settings')}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        )}

        {/* Security settings */}
        {!isLoading && activeTab === 'security' && (
          <div className="space-y-6">
            <Section title="Contrôle parental" icon={Users} permissionError={!hasPermission('parental') ? getPermissionErrorMessage('parental') : null} freeboxSettingsUrl={!hasPermission('parental') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Règles de filtrage"
                description="Règles de contrôle parental pour limiter l'accès Internet"
              >
                <button
                  onClick={() => setShowParentalModal(true)}
                  disabled={!hasPermission('parental')}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors ${!hasPermission('parental') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ExternalLink size={14} />
                  Gérer
                </button>
              </SettingRow>
              {parentalProfiles.length > 0 && (
                <div className="py-2 space-y-2">
                  {parentalProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                      <span className="text-sm text-white">{profile.name}</span>
                      <span className="text-xs text-gray-500">ID: {profile.id}</span>
                    </div>
                  ))}
                </div>
              )}
              {parentalProfiles.length === 0 && (
                <div className="py-4 text-sm text-gray-500">
                  <p>Cliquez sur "Gérer" pour configurer les règles de contrôle parental.</p>
                  <p className="mt-2">Limitez l'accès Internet pour certains appareils par horaires ou de façon permanente.</p>
                </div>
              )}
            </Section>

            <Section title="Pare-feu - Redirection de ports" icon={Shield} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Règles actives"
                description="Redirections de ports configurées sur la Freebox"
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                    {portForwardingRules.filter(r => r.enabled).length} / {portForwardingRules.length}
                  </span>
                  <button
                    onClick={() => setShowFirewallModal(true)}
                    disabled={!hasPermission('settings')}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ExternalLink size={14} />
                    Gérer
                  </button>
                </div>
              </SettingRow>
              {portForwardingRules.length > 0 && (
                <div className="py-2 space-y-2">
                  {portForwardingRules.slice(0, 5).map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                      <div className="flex-1">
                        <span className="text-sm text-white">{rule.comment || `Port ${rule.wan_port_start}`}</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rule.ip_proto.toUpperCase()} {rule.wan_port_start}{rule.wan_port_end ? `-${rule.wan_port_end}` : ''} → {rule.lan_ip}:{rule.lan_port}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${rule.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                        {rule.enabled ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ))}
                  {portForwardingRules.length > 5 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      + {portForwardingRules.length - 5} autres règles
                    </p>
                  )}
                </div>
              )}
              {portForwardingRules.length === 0 && (
                <div className="py-4 text-sm text-gray-500">
                  <p>Aucune redirection de port configurée.</p>
                  <p className="mt-2">Les redirections permettent d'exposer des services internes sur Internet.</p>
                </div>
              )}
            </Section>

            <Section title="Serveur VPN" icon={Lock} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Serveur VPN"
                description="Permet de se connecter au réseau local depuis l'extérieur"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    vpnServerConfig?.enabled
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {vpnServerConfig?.enabled ? 'Activé' : 'Désactivé'}
                  </span>
                  <button
                    onClick={() => setShowVpnModal(true)}
                    disabled={!hasPermission('settings')}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ExternalLink size={14} />
                    Gérer
                  </button>
                </div>
              </SettingRow>
              {vpnUsers.length > 0 && (
                <SettingRow
                  label="Utilisateurs VPN"
                  description="Comptes configurés pour l'accès VPN"
                >
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                    {vpnUsers.length} utilisateur{vpnUsers.length !== 1 ? 's' : ''}
                  </span>
                </SettingRow>
              )}
              {vpnUsers.length > 0 && (
                <div className="py-2 space-y-2">
                  {vpnUsers.map((user) => (
                    <div key={user.login} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                      <span className="text-sm text-white">{user.login}</span>
                      {user.ip_reservation && (
                        <span className="text-xs text-gray-500 font-mono">{user.ip_reservation}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!vpnServerConfig && vpnUsers.length === 0 && (
                <div className="py-4 text-sm text-gray-500">
                  <p>Le serveur VPN n'est pas configuré.</p>
                  <p className="mt-2">Protocoles supportés : OpenVPN, WireGuard, PPTP.</p>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* System settings */}
        {!isLoading && activeTab === 'system' && lcdConfig && (
          <div className="space-y-6">
            <Section title="Écran LCD" icon={Monitor} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow label="Luminosité">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lcdConfig.brightness}
                    onChange={(e) => setLcdConfig({ ...lcdConfig, brightness: parseInt(e.target.value) })}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-400 w-12">{lcdConfig.brightness}%</span>
                </div>
              </SettingRow>
              <SettingRow label="Orientation">
                <select
                  value={lcdConfig.orientation}
                  onChange={(e) => setLcdConfig({ ...lcdConfig, orientation: parseInt(e.target.value) })}
                  className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>Normal</option>
                  <option value={90}>90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>270°</option>
                </select>
              </SettingRow>
              <SettingRow
                label="Forcer l'orientation"
                description="Empêche la rotation automatique"
              >
                <Toggle
                  enabled={lcdConfig.orientation_forced}
                  onChange={(v) => setLcdConfig({ ...lcdConfig, orientation_forced: v })}
                />
              </SettingRow>
            </Section>

            {/* LED Strip section - Only shown for Ultra 25 ans edition */}
            {lcdConfig.led_strip_enabled !== undefined && (
              <Section title="Bandeau LED" icon={Lightbulb} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
                <SettingRow
                  label="Bandeau LED activé"
                  description="Active ou désactive le bandeau LED"
                >
                  <Toggle
                    enabled={lcdConfig.led_strip_enabled ?? false}
                    onChange={(v) => setLcdConfig({ ...lcdConfig, led_strip_enabled: v })}
                  />
                </SettingRow>
                {lcdConfig.led_strip_enabled && (
                  <>
                    <SettingRow label="Luminosité LED">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={lcdConfig.led_strip_brightness ?? 50}
                          onChange={(e) => setLcdConfig({ ...lcdConfig, led_strip_brightness: parseInt(e.target.value) })}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-400 w-12">{lcdConfig.led_strip_brightness ?? 50}%</span>
                      </div>
                    </SettingRow>
                    <SettingRow label="Animation">
                      <select
                        value={lcdConfig.led_strip_animation ?? 'breathing'}
                        onChange={(e) => setLcdConfig({ ...lcdConfig, led_strip_animation: e.target.value })}
                        className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {(lcdConfig.available_led_strip_animations || ['organic', 'static', 'breathing', 'rain', 'trail', 'wave']).map((anim) => (
                          <option key={anim} value={anim}>
                            {anim.charAt(0).toUpperCase() + anim.slice(1)}
                          </option>
                        ))}
                      </select>
                    </SettingRow>
                  </>
                )}
              </Section>
            )}

            <Section title="Actions système" icon={Power} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <div className="py-4 space-y-3">
                <button
                  onClick={handleReboot}
                  disabled={!hasPermission('settings')}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-sm text-white">Redémarrer la Freebox</span>
                  <Power size={16} className="text-orange-400" />
                </button>
                <button
                  onClick={() => setShowRebootScheduleModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-sm text-white">Programmer le redémarrage</span>
                  <Calendar size={16} className="text-blue-400" />
                </button>
                <p className="text-xs text-gray-600 px-1">
                  Le redémarrage prend environ 2-3 minutes. Toutes les connexions seront interrompues.
                </p>
              </div>
            </Section>

            <button
              onClick={saveLcdConfig}
              disabled={!hasPermission('settings')}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        )}

        {/* No disk placeholder for some tabs */}
        {!isLoading && (activeTab === 'network' && !connectionConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Paramètres non disponibles</h3>
            <p className="text-gray-500 text-center max-w-md">
              Impossible de charger les paramètres. Vérifiez que vous êtes connecté à la Freebox.
            </p>
          </div>
        )}

        {!isLoading && (activeTab === 'dhcp' && !dhcpConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Network size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">DHCP non disponible</h3>
            <p className="text-gray-500 text-center max-w-md">
              Impossible de charger la configuration DHCP.
            </p>
          </div>
        )}

        {!isLoading && (activeTab === 'storage' && !ftpConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <HardDrive size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Stockage non disponible</h3>
            <p className="text-gray-500 text-center max-w-md">
              Aucun disque n'est connecté à la Freebox.
            </p>
          </div>
        )}

        {!isLoading && (activeTab === 'system' && !lcdConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Monitor size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Paramètres système</h3>
            <p className="text-gray-500 text-center max-w-md">
              Impossible de charger les paramètres de l'écran LCD.
            </p>
          </div>
        )}
      </main>

      {/* Parental Control Modal */}
      <ParentalControlModal
        isOpen={showParentalModal}
        onClose={() => setShowParentalModal(false)}
        devices={devices}
      />

      {/* Port Forwarding Modal */}
      <PortForwardingModal
        isOpen={showFirewallModal}
        onClose={() => setShowFirewallModal(false)}
        devices={devices}
      />

      {/* VPN Modal */}
      <VpnModal
        isOpen={showVpnModal}
        onClose={() => setShowVpnModal(false)}
      />

      {/* Reboot Schedule Modal */}
      <RebootScheduleModal
        isOpen={showRebootScheduleModal}
        onClose={() => setShowRebootScheduleModal(false)}
      />

      {/* DHCP Static Lease Modal */}
      {showLeaseModal && editingLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#151515] w-full max-w-md rounded-xl border border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">
                {editingLease.id ? 'Modifier' : 'Ajouter'} un bail statique
              </h3>
              <button
                onClick={() => {
                  setShowLeaseModal(false);
                  setEditingLease(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Adresse MAC *
                </label>
                <input
                  type="text"
                  value={editingLease.mac}
                  onChange={(e) => setEditingLease({ ...editingLease, mac: e.target.value })}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Format: XX:XX:XX:XX:XX:XX</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Adresse IP *
                </label>
                <input
                  type="text"
                  value={editingLease.ip}
                  onChange={(e) => setEditingLease({ ...editingLease, ip: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Doit être dans la plage DHCP</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Commentaire
                </label>
                <input
                  type="text"
                  value={editingLease.comment}
                  onChange={(e) => setEditingLease({ ...editingLease, comment: e.target.value })}
                  placeholder="Ex: PC Bureau, NAS, Imprimante..."
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowLeaseModal(false);
                  setEditingLease(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveStaticLease}
                disabled={!editingLease.mac || !editingLease.ip || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {editingLease.id ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;