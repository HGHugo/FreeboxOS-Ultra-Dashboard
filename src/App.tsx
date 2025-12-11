import React, { useEffect, useState } from 'react';
import { Header, Footer, type PageType } from './components/layout';
import {
  Card,
  BarChart,
  WifiPanel,
  VmPanel,
  DevicesList,
  FilePanel,
  UptimeGrid,
  SpeedtestWidget,
  HistoryLog
} from './components/widgets';
import { ActionButton, UnsupportedFeature } from './components/ui';
import { LoginModal, TrafficHistoryModal, WifiSettingsModal, CreateVmModal } from './components/modals';
import { TvPage, PhonePage, FilesPage, VmsPage, AnalyticsPage, SettingsPage } from './pages';
import { usePolling } from './hooks/usePolling';
import { useConnectionWebSocket } from './hooks/useConnectionWebSocket';
import {
  useAuthStore,
  useSystemStore,
  useConnectionStore,
  useWifiStore,
  useLanStore,
  useDownloadsStore,
  useVmStore,
  useHistoryStore
} from './stores';
import { startPermissionsRefresh, stopPermissionsRefresh } from './stores/authStore';
import { useCapabilitiesStore } from './stores/capabilitiesStore';
import { POLLING_INTERVALS, formatSpeed } from './utils/constants';
import {
  MoreHorizontal,
  Calendar,
  Sliders,
  Filter,
  Plus,
  Wifi as WifiIcon,
  HardDrive,
  Server,
  Download,
  History,
  Clock,
  ArrowDownWideNarrow
} from 'lucide-react';

const App: React.FC = () => {
  // Auth state
  const { isLoggedIn, isLoading: authLoading, checkAuth, logout } = useAuthStore();

  // Data stores
  const { info: systemInfo, temperatureHistory: systemTempHistory, fetchSystemInfo, reboot } = useSystemStore();
  const { status: connectionStatus, history: networkHistory, extendedHistory, temperatureHistory, fetchConnectionStatus, fetchExtendedHistory, fetchTemperatureHistory } = useConnectionStore();
  const { networks: wifiNetworks, isLoading: wifiLoading, fetchWifiStatus, toggleBss } = useWifiStore();
  const { devices, fetchDevices } = useLanStore();
  const { tasks: downloads, fetchDownloads } = useDownloadsStore();
  const { vms, isLoading: vmLoading, error: vmError, fetchVms, startVm, stopVm } = useVmStore();
  const { logs: historyLogs, isLoading: historyLoading, fetchHistory } = useHistoryStore();

  // Capabilities store for model-specific features
  const { capabilities, supportsVm, hasLimitedVmSupport, getMaxVms } = useCapabilitiesStore();

  // Local state
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [isCreateVmModalOpen, setIsCreateVmModalOpen] = useState(false);
  const [wifiModalTab, setWifiModalTab] = useState<'filter' | 'planning' | 'wps'>('filter');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAllDevices, setShowAllDevices] = useState(false);

  // Filters for files/downloads
  const [downloadFilter, setDownloadFilter] = useState<'all' | 'active' | 'done'>('all');
  const [downloadSort, setDownloadSort] = useState<'recent' | 'name' | 'progress'>('recent');

  // Navigation state for FilesPage
  const [filesPageInitialTab, setFilesPageInitialTab] = useState<'files' | 'downloads' | 'shares'>('files');
  const [filesPageInitialDownloadId, setFilesPageInitialDownloadId] = useState<string | undefined>(undefined);

  // Filters for history
  const [historyFilter, setHistoryFilter] = useState<'all' | 'connection' | 'calls' | 'notifications'>('all');
  const [historyPeriod, setHistoryPeriod] = useState<'30d' | '7d' | '24h'>('30d');

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Start/stop periodic permissions refresh based on login state
  useEffect(() => {
    if (isLoggedIn) {
      startPermissionsRefresh();
    } else {
      stopPermissionsRefresh();
    }
    return () => stopPermissionsRefresh();
  }, [isLoggedIn]);

  // WebSocket for real-time connection status (replaces polling)
  useConnectionWebSocket({ enabled: isLoggedIn });

  usePolling(fetchSystemInfo, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.system
  });

  usePolling(fetchWifiStatus, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.wifi
  });

  usePolling(fetchDevices, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.devices
  });

  usePolling(fetchDownloads, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.downloads
  });

  // Only poll VMs if the model supports them
  usePolling(fetchVms, {
    enabled: isLoggedIn && supportsVm(),
    interval: POLLING_INTERVALS.vm
  });

  usePolling(fetchHistory, {
    enabled: isLoggedIn,
    interval: 60000 // Refresh history every minute
  });

  // Current speed values
  const currentDownload = connectionStatus
    ? formatSpeed(connectionStatus.rate_down)
    : '-- kb/s';
  const currentUpload = connectionStatus
    ? formatSpeed(connectionStatus.rate_up)
    : '-- kb/s';

  // Filter devices based on selection
  const filteredDevices = devices.filter(d => {
    if (deviceFilter === 'active') return d.active;
    if (deviceFilter === 'inactive') return !d.active;
    return true;
  });

  // Limit devices shown unless "show all" is enabled
  const displayedDevices = showAllDevices ? filteredDevices : filteredDevices.slice(0, 10);

  // Check if disk is available (for VMs and Downloads)
  const hasDisk = systemInfo?.disk_status === 'active' || systemInfo?.user_main_storage;

  // Filter downloads based on selection
  const filteredDownloads = downloads.filter(d => {
    if (downloadFilter === 'active') return d.status === 'downloading' || d.status === 'seeding' || d.status === 'queued';
    if (downloadFilter === 'done') return d.status === 'done';
    return true;
  }).sort((a, b) => {
    if (downloadSort === 'name') return a.name.localeCompare(b.name);
    if (downloadSort === 'progress') return b.progress - a.progress;
    // 'recent' - keep original order (most recent first from API)
    return 0;
  });

  // Filter history logs based on selection
  const filteredHistoryLogs = historyLogs.filter(log => {
    // Filter by type
    if (historyFilter === 'connection' && !log.id.startsWith('conn-')) return false;
    if (historyFilter === 'calls' && !log.id.startsWith('call-')) return false;
    if (historyFilter === 'notifications' && !log.id.startsWith('notif-')) return false;

    // Filter by period
    if (log.rawTimestamp) {
      const now = Date.now() / 1000;
      const diff = now - log.rawTimestamp;
      if (historyPeriod === '24h' && diff > 86400) return false;
      if (historyPeriod === '7d' && diff > 604800) return false;
      // '30d' - no additional filter needed
    }

    return true;
  });

  const handleReboot = async () => {
    if (confirm('Voulez-vous vraiment redémarrer la Freebox ?')) {
      await reboot();
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleVmToggle = async (id: string, start: boolean) => {
    if (start) {
      await startVm(id);
    } else {
      await stopVm(id);
    }
  };

  const handleWifiToggle = async (bssId: string, enabled: boolean) => {
    await toggleBss(bssId, enabled);
  };

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
  };

  // Show login modal if not logged in
  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <LoginModal isOpen={true} />
      </div>
    );
  }

  // Render TV page
  if (currentPage === 'tv') {
    return (
      <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
        <TvPage onBack={() => setCurrentPage('dashboard')} />
        <Footer
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onReboot={handleReboot}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Render Phone page
  if (currentPage === 'phone') {
    return (
      <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
        <PhonePage onBack={() => setCurrentPage('dashboard')} />
        <Footer
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onReboot={handleReboot}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Render Files page
  if (currentPage === 'files') {
    return (
      <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
        <FilesPage
          onBack={() => {
            setCurrentPage('dashboard');
            setFilesPageInitialTab('files');
            setFilesPageInitialDownloadId(undefined);
          }}
          initialTab={filesPageInitialTab}
          initialDownloadId={filesPageInitialDownloadId}
        />
        <Footer
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onReboot={handleReboot}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Render VMs page
  if (currentPage === 'vms') {
    return (
      <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
        <VmsPage onBack={() => setCurrentPage('dashboard')} />
        <Footer
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onReboot={handleReboot}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Render Analytics page
  if (currentPage === 'analytics') {
    return (
      <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
        <AnalyticsPage onBack={() => setCurrentPage('dashboard')} />
        <Footer
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onReboot={handleReboot}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Render Settings page
  if (currentPage === 'settings') {
    return (
      <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
        <SettingsPage onBack={() => setCurrentPage('dashboard')} />
        <Footer
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onReboot={handleReboot}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // Dashboard (default)
  return (
    <div className="min-h-screen pb-20 bg-[#050505] text-gray-300 font-sans selection:bg-blue-500/30">
      <Header systemInfo={systemInfo} connectionStatus={connectionStatus} />

      <main className="p-4 md:p-6 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          {/* Column 1 - État de la Freebox */}
          <div className="flex flex-col gap-6">
            <Card
              title="État de la Freebox"
              actions={
                <ActionButton
                  label="Voir plus"
                  icon={MoreHorizontal}
                  onClick={() => setIsTrafficModalOpen(true)}
                />
              }
            >
              <div className="flex flex-col gap-4">
                <BarChart
                  data={networkHistory}
                  dataKey="download"
                  color="#3b82f6"
                  title="Descendant en temps réel"
                  currentValue={currentDownload.split(' ')[0]}
                  unit={currentDownload.split(' ')[1] || 'kb/s'}
                  trend="down"
                />
                <BarChart
                  data={networkHistory}
                  dataKey="upload"
                  color="#10b981"
                  title="Montant en temps réel"
                  currentValue={currentUpload.split(' ')[0]}
                  unit={currentUpload.split(' ')[1] || 'kb/s'}
                  trend="up"
                />
              </div>
            </Card>

            <Card title="Test de débits">
              <SpeedtestWidget
                downloadSpeed={undefined}
                uploadSpeed={undefined}
                ping={undefined}
                jitter={undefined}
                downloadHistory={[]}
                uploadHistory={[]}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                L'API Freebox ne permet pas de lancer des tests de débit via l'API.
                Utilisez l'interface Freebox OS pour effectuer un test.
              </p>
            </Card>

            <Card
              title="Uptime"
              actions={
                <button className="text-xs bg-[#1a1a1a] border border-gray-700 px-2 py-1 rounded flex items-center gap-1 text-gray-400">
                  <Calendar size={12} /> 30J
                </button>
              }
            >
              {systemInfo ? (
                <UptimeGrid
                  uptimeSeconds={systemInfo.uptime_val}
                />
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Chargement...
                </div>
              )}
            </Card>
          </div>

          {/* Column 2 - WiFi & Local */}
          <div className="flex flex-col gap-6">
            <Card
              title="Wifi"
              actions={
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <ActionButton label="Filtrage" icon={Sliders} onClick={() => { setWifiModalTab('filter'); setIsWifiModalOpen(true); }} />
                  <ActionButton label="Planif." icon={Calendar} onClick={() => { setWifiModalTab('planning'); setIsWifiModalOpen(true); }} />
                  <ActionButton label="WPS" icon={WifiIcon} onClick={() => { setWifiModalTab('wps'); setIsWifiModalOpen(true); }} />
                </div>
              }
            >
              {wifiLoading ? (
                <div className="text-center text-gray-500 py-4">Chargement...</div>
              ) : wifiNetworks.length > 0 ? (
                <WifiPanel networks={wifiNetworks} onToggle={handleWifiToggle} />
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Aucun réseau WiFi configuré
                </div>
              )}
            </Card>

            <Card
              title="Local"
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeviceFilter(deviceFilter === 'active' ? 'all' : 'active')}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                      deviceFilter === 'active'
                        ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                        : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    <Filter size={12} /> Actifs
                  </button>
                  <button
                    onClick={() => setDeviceFilter(deviceFilter === 'inactive' ? 'all' : 'inactive')}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                      deviceFilter === 'inactive'
                        ? 'bg-gray-700/30 border-gray-600 text-gray-300'
                        : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    <Filter size={12} /> Hors-ligne
                  </button>
                </div>
              }
              className="flex-grow"
            >
              <DevicesList devices={displayedDevices} />
              {filteredDevices.length > 10 && !showAllDevices && (
                <button
                  onClick={() => setShowAllDevices(true)}
                  className="w-full mt-2 py-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Afficher tous les appareils ({filteredDevices.length})
                </button>
              )}
              {showAllDevices && filteredDevices.length > 10 && (
                <button
                  onClick={() => setShowAllDevices(false)}
                  className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Réduire la liste
                </button>
              )}
            </Card>
          </div>

          {/* Column 3 - VMs & Fichiers */}
          <div className="flex flex-col gap-6">
            <Card
              title={hasLimitedVmSupport() ? `VMs (max ${getMaxVms()})` : "VMs"}
              actions={supportsVm() && hasDisk && !vmError ? <ActionButton label="Créer" icon={Plus} onClick={() => setIsCreateVmModalOpen(true)} /> : undefined}
            >
              {!supportsVm() ? (
                <UnsupportedFeature
                  feature="Machines Virtuelles"
                  featureType="vm"
                />
              ) : !hasDisk ? (
                <div className="text-center py-8">
                  <Server size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun disque détecté</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Connectez un disque dur pour utiliser les VMs
                  </p>
                </div>
              ) : vmLoading ? (
                <div className="text-center text-gray-500 py-4">Chargement...</div>
              ) : vmError ? (
                <div className="text-center py-8">
                  <Server size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">VMs non disponibles</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Cette fonctionnalité n'est pas supportée sur votre modèle
                  </p>
                </div>
              ) : vms.length > 0 ? (
                <VmPanel vms={vms} onToggle={handleVmToggle} />
              ) : (
                <div className="text-center py-8">
                  <Server size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucune VM configurée</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Créez une VM pour commencer
                  </p>
                </div>
              )}
            </Card>

            <Card
              title="Téléchargements"
              onTitleClick={() => {
                setFilesPageInitialTab('downloads');
                setFilesPageInitialDownloadId(undefined);
                setCurrentPage('files');
              }}
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const next = downloadFilter === 'all' ? 'active' : downloadFilter === 'active' ? 'done' : 'all';
                      setDownloadFilter(next);
                    }}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                      downloadFilter !== 'all'
                        ? 'bg-blue-900/30 border-blue-700 text-blue-400'
                        : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    <Filter size={12} />
                    {downloadFilter === 'all' ? 'Tous' : downloadFilter === 'active' ? 'En cours' : 'Terminés'}
                  </button>
                  <button
                    onClick={() => {
                      const next = downloadSort === 'recent' ? 'name' : downloadSort === 'name' ? 'progress' : 'recent';
                      setDownloadSort(next);
                    }}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                      downloadSort !== 'recent'
                        ? 'bg-blue-900/30 border-blue-700 text-blue-400'
                        : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    <ArrowDownWideNarrow size={12} />
                    {downloadSort === 'recent' ? 'Récent' : downloadSort === 'name' ? 'Nom' : 'Progression'}
                  </button>
                </div>
              }
              className="flex-grow"
            >
              {!hasDisk ? (
                <div className="text-center py-8">
                  <HardDrive size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun disque détecté</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Connectez un disque dur pour télécharger des fichiers
                  </p>
                </div>
              ) : filteredDownloads.length > 0 ? (
                <FilePanel
                  tasks={filteredDownloads}
                  onTaskClick={(task) => {
                    setFilesPageInitialTab('downloads');
                    setFilesPageInitialDownloadId(task.id);
                    setCurrentPage('files');
                  }}
                />
              ) : downloads.length > 0 ? (
                <div className="text-center py-8">
                  <Download size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun téléchargement correspondant</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Modifiez les filtres pour voir plus de résultats
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun téléchargement</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Ajoutez un fichier pour commencer
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Column 4 - Historique */}
          <div className="flex flex-col gap-6">
            <Card
              title="Historique"
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const next = historyFilter === 'all' ? 'connection' : historyFilter === 'connection' ? 'calls' : historyFilter === 'calls' ? 'notifications' : 'all';
                      setHistoryFilter(next);
                    }}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                      historyFilter !== 'all'
                        ? 'bg-purple-900/30 border-purple-700 text-purple-400'
                        : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    <Filter size={12} />
                    {historyFilter === 'all' ? 'Toutes' : historyFilter === 'connection' ? 'Connexion' : historyFilter === 'calls' ? 'Appels' : 'Notifs'}
                  </button>
                  <button
                    onClick={() => {
                      const next = historyPeriod === '30d' ? '7d' : historyPeriod === '7d' ? '24h' : '30d';
                      setHistoryPeriod(next);
                    }}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                      historyPeriod !== '30d'
                        ? 'bg-purple-900/30 border-purple-700 text-purple-400'
                        : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:bg-[#252525]'
                    }`}
                  >
                    <Clock size={12} />
                    {historyPeriod === '30d' ? '30J' : historyPeriod === '7d' ? '7J' : '24H'}
                  </button>
                </div>
              }
              className="h-full"
            >
              {historyLoading ? (
                <div className="text-center text-gray-500 py-4">Chargement...</div>
              ) : filteredHistoryLogs.length > 0 ? (
                <HistoryLog logs={filteredHistoryLogs} />
              ) : historyLogs.length > 0 ? (
                <div className="text-center py-8">
                  <History size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun événement correspondant</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Modifiez les filtres pour voir plus de résultats
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun événement récent</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Les logs de connexion et appels apparaîtront ici
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Traffic History Modal */}
        <TrafficHistoryModal
          isOpen={isTrafficModalOpen}
          onClose={() => setIsTrafficModalOpen(false)}
          data={extendedHistory.length > 0 ? extendedHistory : undefined}
          temperatureData={temperatureHistory}
          systemInfo={systemInfo}
          connectionStatus={connectionStatus}
          onFetchHistory={() => {
            fetchExtendedHistory();
            fetchTemperatureHistory();
          }}
        />

        {/* WiFi Settings Modal */}
        <WifiSettingsModal
          isOpen={isWifiModalOpen}
          onClose={() => setIsWifiModalOpen(false)}
          initialTab={wifiModalTab}
        />

        {/* Create VM Modal */}
        <CreateVmModal
          isOpen={isCreateVmModalOpen}
          onClose={() => setIsCreateVmModalOpen(false)}
        />
      </main>

      <Footer
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onReboot={handleReboot}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;