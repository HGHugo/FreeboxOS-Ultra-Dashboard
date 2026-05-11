import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  File,
  FileText,
  FileVideo,
  FileAudio,
  FileImage,
  FileArchive,
  Users,
  Radio,
  Grid3X3,
  Ban,
  ScrollText,
  Loader2,
  RefreshCw,
  Globe,
  ArrowDown,
  ArrowUp,
  Check,
  AlertCircle,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { useDownloadsStore } from '../../stores/downloadsStore';
import type { DownloadTask } from '../../types';
import type { DownloadTracker, DownloadPeer, DownloadFile, DownloadBlacklistEntry } from '../../types/api';

// Format file size
const formatSize = (bytes: number | undefined | null): string => {
  if (bytes === undefined || bytes === null || bytes === 0 || isNaN(bytes)) return '0 B';
  if (bytes < 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format speed
const formatSpeed = (bytesPerSec: number): string => {
  return formatSize(bytesPerSec) + '/s';
};

// Get file icon based on mimetype
const getFileIcon = (mimetype: string) => {
  if (mimetype.startsWith('image/')) return FileImage;
  if (mimetype.startsWith('video/')) return FileVideo;
  if (mimetype.startsWith('audio/')) return FileAudio;
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('tar') || mimetype.includes('7z')) return FileArchive;
  if (mimetype.startsWith('text/') || mimetype.includes('document')) return FileText;
  return File;
};

// Tab type
type TabType = 'files' | 'log' | 'trackers' | 'peers' | 'pieces' | 'blacklist';

interface DownloadDetailsProps {
  task: DownloadTask;
  onClose: () => void;
}

export const DownloadDetails: React.FC<DownloadDetailsProps> = ({ task, onClose }) => {
  const { getTrackers, getPeers, getFiles, updateFilePriority, getPieces, getBlacklist, emptyBlacklist, getLog } = useDownloadsStore();

  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [trackers, setTrackers] = useState<DownloadTracker[]>([]);
  const [peers, setPeers] = useState<DownloadPeer[]>([]);
  const [pieces, setPieces] = useState<string>('');
  const [blacklist, setBlacklist] = useState<DownloadBlacklistEntry[]>([]);
  const [log, setLog] = useState<string>('');

  // Load data for active tab
  const loadData = useCallback(async (tab: TabType) => {
    setIsLoading(true);
    try {
      switch (tab) {
        case 'files':
          const filesData = await getFiles(task.id);
          setFiles(filesData);
          break;
        case 'trackers':
          const trackersData = await getTrackers(task.id);
          setTrackers(trackersData);
          break;
        case 'peers':
          const peersData = await getPeers(task.id);
          setPeers(peersData);
          break;
        case 'pieces':
          const piecesData = await getPieces(task.id);
          setPieces(piecesData);
          break;
        case 'blacklist':
          const blacklistData = await getBlacklist(task.id);
          setBlacklist(blacklistData);
          break;
        case 'log':
          const logData = await getLog(task.id);
          setLog(logData);
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setIsLoading(false);
  }, [task.id, getFiles, getTrackers, getPeers, getPieces, getBlacklist, getLog]);

  // Load data on tab change
  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  // Refresh data periodically for peers and trackers
  useEffect(() => {
    if (activeTab === 'peers' || activeTab === 'trackers') {
      const interval = setInterval(() => loadData(activeTab), 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadData]);

  // Handle file priority change
  const handlePriorityChange = async (fileId: string, priority: string) => {
    const success = await updateFilePriority(task.id, fileId, priority);
    if (success) {
      loadData('files');
    }
  };

  // Handle empty blacklist
  const handleEmptyBlacklist = async () => {
    if (confirm('Vider la blacklist ?')) {
      const success = await emptyBlacklist(task.id);
      if (success) {
        loadData('blacklist');
      }
    }
  };

  // Get tracker status color
  const getTrackerStatusColor = (status: string) => {
    switch (status) {
      case 'announced': return 'text-emerald-400';
      case 'announcing': return 'text-blue-400';
      case 'announce_failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Get peer state color
  const getPeerStateColor = (state: string) => {
    switch (state) {
      case 'ready': return 'text-emerald-400';
      case 'handshaking':
      case 'connecting': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  // Get blacklist reason text
  const getBlacklistReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      'not_blacklisted': 'Non blacklisté',
      'crypto_not_supported': 'Crypto non supporté',
      'connect_fail': 'Échec de connexion',
      'hs_timeout': 'Timeout handshake',
      'hs_failed': 'Échec handshake',
      'hs_crypt_failed': 'Échec crypto handshake',
      'hs_crypto_disabled': 'Crypto désactivé',
      'torrent_not_found': 'Torrent non trouvé',
      'read_failed': 'Échec lecture',
      'write_failed': 'Échec écriture',
      'crap_received': 'Données invalides',
      'conn_closed': 'Connexion fermée',
      'timeout': 'Timeout',
      'blocklist': 'Dans la blocklist',
      'user': 'Manuel'
    };
    return reasons[reason] || reason;
  };

  // Render pieces visualization
  const renderPieces = () => {
    if (!pieces) return null;

    const pieceArray = pieces.split('');
    const totalPieces = pieceArray.length;
    const completedPieces = pieceArray.filter(p => p === 'X').length;
    const downloadingPieces = pieceArray.filter(p => p === '+' || p === '/').length;

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">
            {completedPieces} / {totalPieces} pièces ({Math.round((completedPieces / totalPieces) * 100)}%)
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
              Complet
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded-sm" />
              En cours ({downloadingPieces})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-600 rounded-sm" />
              En attente
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-0.5 p-2 bg-[#0a0a0a] rounded-lg max-h-64 overflow-y-auto">
          {pieceArray.map((piece, i) => {
            let color = 'bg-gray-700';
            if (piece === 'X') color = 'bg-emerald-500';
            else if (piece === '+' || piece === '/') color = 'bg-blue-500';
            else if (piece === 'U') color = 'bg-purple-500';
            else if (piece === '-') color = 'bg-gray-800';

            return (
              <div
                key={i}
                className={`w-2 h-2 ${color} rounded-[1px]`}
                title={`Pièce ${i + 1}: ${piece === 'X' ? 'Complète' : piece === '+' ? 'En téléchargement' : piece === '/' ? 'Prioritaire' : piece === '.' ? 'En attente' : 'Non demandée'}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'files', label: 'Fichiers', icon: <File size={14} /> },
    { key: 'log', label: 'Journal', icon: <ScrollText size={14} /> },
    { key: 'trackers', label: 'Traqueurs', icon: <Radio size={14} /> },
    { key: 'peers', label: 'Pairs', icon: <Users size={14} /> },
    { key: 'pieces', label: 'Pièces', icon: <Grid3X3 size={14} /> },
    { key: 'blacklist', label: 'Blacklist', icon: <Ban size={14} /> },
  ];

  return (
    <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{task.name}</h3>
          <p className="text-xs text-gray-500">
            {formatSize(task.downloaded)} / {formatSize(task.size)} ({task.progress}%)
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Files Tab */}
            {activeTab === 'files' && (
              <div className="space-y-2">
                {files.length > 0 ? (
                  files.map((file) => {
                    const Icon = getFileIcon(file.mimetype);
                    const progress = file.size > 0 ? Math.round((file.rx / file.size) * 100) : 0;

                    return (
                      <div key={file.id} className="bg-[#1a1a1a] rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{file.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{formatSize(file.rx)} / {formatSize(file.size)}</span>
                              {file.status === 'done' && (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Check size={10} /> Terminé
                                </span>
                              )}
                              {file.status === 'error' && (
                                <span className="text-red-400 flex items-center gap-1">
                                  <AlertCircle size={10} /> Erreur
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            <select
                              value={file.priority}
                              onChange={(e) => handlePriorityChange(file.id, e.target.value)}
                              className="appearance-none bg-[#0a0a0a] border border-gray-700 rounded px-2 py-1 pr-6 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
                            >
                              <option value="no_dl">Ne pas télécharger</option>
                              <option value="low">Basse</option>
                              <option value="normal">Normale</option>
                              <option value="high">Haute</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                          </div>
                        </div>
                        {file.priority !== 'no_dl' && file.status !== 'done' && (
                          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun fichier</p>
                )}
              </div>
            )}

            {/* Log Tab */}
            {activeTab === 'log' && (
              <div className="bg-[#0a0a0a] rounded-lg p-3">
                {log ? (
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {log}
                  </pre>
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun log disponible</p>
                )}
              </div>
            )}

            {/* Trackers Tab */}
            {activeTab === 'trackers' && (
              <div className="space-y-2">
                {trackers.length > 0 ? (
                  trackers.map((tracker, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Radio size={14} className={getTrackerStatusColor(tracker.status)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-mono truncate">{tracker.announce}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className={getTrackerStatusColor(tracker.status)}>
                              {tracker.status === 'announced' ? 'Annoncé' :
                               tracker.status === 'announcing' ? 'Annonce...' :
                               tracker.status === 'announce_failed' ? 'Échec' : 'Non annoncé'}
                            </span>
                            <span>Seeds: {tracker.nseeders}</span>
                            <span>Leechers: {tracker.nleechers}</span>
                            {tracker.reannounce_in > 0 && (
                              <span>Réannonce dans {Math.floor(tracker.reannounce_in / 60)}min</span>
                            )}
                          </div>
                        </div>
                        {!tracker.is_enabled && (
                          <span className="text-xs text-gray-500">Désactivé</span>
                        )}
                        {tracker.is_backup && (
                          <span className="text-xs text-amber-400">Backup</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun traqueur</p>
                )}
              </div>
            )}

            {/* Peers Tab */}
            {activeTab === 'peers' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{peers.length} pair(s) connecté(s)</span>
                  <button
                    onClick={() => loadData('peers')}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                {peers.length > 0 ? (
                  peers.map((peer, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Globe size={12} className="text-gray-500" />
                          <span className="text-xs text-gray-400">{peer.country_code}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-mono">{peer.host}:{peer.port}</p>
                          <p className="text-xs text-gray-500">{peer.client}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ArrowDown size={10} />
                              {formatSpeed(peer.rx_rate)}
                            </span>
                            <span className="text-blue-400 flex items-center gap-1">
                              <ArrowUp size={10} />
                              {formatSpeed(peer.tx_rate)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{peer.progress}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span className={getPeerStateColor(peer.state)}>
                          {peer.state === 'ready' ? 'Connecté' :
                           peer.state === 'handshaking' ? 'Handshake...' :
                           peer.state === 'connecting' ? 'Connexion...' : 'Déconnecté'}
                        </span>
                        <span>via {peer.origin}</span>
                        <span>{peer.protocol}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">Aucun pair connecté</p>
                )}
              </div>
            )}

            {/* Pieces Tab */}
            {activeTab === 'pieces' && (
              pieces ? renderPieces() : (
                <p className="text-center text-gray-500 py-4">Aucune information sur les pièces</p>
              )
            )}

            {/* Blacklist Tab */}
            {activeTab === 'blacklist' && (
              <div className="space-y-2">
                {blacklist.length > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{blacklist.length} entrée(s)</span>
                    <button
                      onClick={handleEmptyBlacklist}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                      Vider
                    </button>
                  </div>
                )}
                {blacklist.length > 0 ? (
                  blacklist.map((entry, i) => (
                    <div key={i} className="bg-[#1a1a1a] rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-white font-mono">{entry.host}</p>
                          <p className="text-xs text-gray-500">{getBlacklistReasonText(entry.reason)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            Expire dans {Math.floor(entry.expire / 60)}min
                          </p>
                          {entry.global && (
                            <span className="text-xs text-amber-400">Global</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">Blacklist vide</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DownloadDetails;