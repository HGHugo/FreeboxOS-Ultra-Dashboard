import React, { useEffect, useState } from 'react';
import {
  Folder,
  File,
  ChevronLeft,
  ChevronRight,
  Home,
  FolderPlus,
  Trash2,
  Download,
  HardDrive,
  Search,
  Grid,
  List,
  RefreshCw,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  ArrowUp,
  Play,
  Pause,
  X
} from 'lucide-react';
import { useFsStore, type FsFile } from '../stores/fsStore';
import { useDownloadsStore } from '../stores';
import type { DownloadTask } from '../types';

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

// Format timestamp
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get file icon based on mimetype
const getFileIcon = (file: FsFile) => {
  if (file.type === 'dir') return Folder;

  const mime = file.mimetype || '';
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) return FileArchive;
  if (mime.startsWith('text/') || mime.includes('document')) return FileText;

  return File;
};

// Get file icon color
const getFileIconColor = (file: FsFile): string => {
  if (file.type === 'dir') return 'text-yellow-400';

  const mime = file.mimetype || '';
  if (mime.startsWith('image/')) return 'text-pink-400';
  if (mime.startsWith('video/')) return 'text-purple-400';
  if (mime.startsWith('audio/')) return 'text-cyan-400';
  if (mime.includes('zip') || mime.includes('rar')) return 'text-orange-400';

  return 'text-gray-400';
};

// File item component
const FileItem: React.FC<{
  file: FsFile;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
  onOpen: () => void;
}> = ({ file, isSelected, viewMode, onSelect, onOpen }) => {
  const Icon = getFileIcon(file);
  const iconColor = getFileIconColor(file);

  if (viewMode === 'grid') {
    return (
      <div
        className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${
          isSelected
            ? 'bg-blue-900/30 border-blue-600'
            : 'bg-[#1a1a1a] border-transparent hover:border-gray-700 hover:bg-[#202020]'
        }`}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            onSelect();
          } else {
            onOpen();
          }
        }}
      >
        <button
          className={`absolute top-2 left-2 p-1 rounded transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? (
            <CheckSquare size={16} className="text-blue-400" />
          ) : (
            <Square size={16} className="text-gray-500" />
          )}
        </button>
        <div className="flex flex-col items-center gap-2">
          <Icon size={40} className={iconColor} />
          <span className="text-sm text-center text-white truncate w-full" title={file.name}>
            {file.name}
          </span>
          {file.type !== 'dir' && (
            <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group ${
        isSelected
          ? 'bg-blue-900/30'
          : 'hover:bg-[#1a1a1a]'
      }`}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          onSelect();
        } else {
          onOpen();
        }
      }}
    >
      <button
        className={`p-1 rounded transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected ? (
          <CheckSquare size={16} className="text-blue-400" />
        ) : (
          <Square size={16} className="text-gray-500" />
        )}
      </button>
      <Icon size={20} className={iconColor} />
      <span className="flex-1 text-sm text-white truncate" title={file.name}>
        {file.name}
      </span>
      <span className="text-xs text-gray-500 w-24 text-right">
        {file.type === 'dir' ? `${file.filecount || 0} fichiers` : formatSize(file.size)}
      </span>
      <span className="text-xs text-gray-500 w-32 text-right hidden md:block">
        {formatDate(file.modification)}
      </span>
    </div>
  );
};

// Download item component
const DownloadItem: React.FC<{
  task: DownloadTask;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}> = ({ task, onPause, onResume, onDelete }) => {
  const isActive = task.status === 'downloading' || task.status === 'seeding';
  const isPaused = task.status === 'paused';
  const isDone = task.status === 'done';

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isDone ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
          <Download size={16} className={isDone ? 'text-emerald-400' : 'text-blue-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm text-white truncate">{task.name}</h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatSize(task.downloaded)} / {formatSize(task.size)}</span>
            {isActive && (
              <>
                <span>-</span>
                <span className="text-blue-400">{formatSize(task.downloadSpeed)}/s</span>
              </>
            )}
            {task.eta && task.eta > 0 && (
              <>
                <span>-</span>
                <span>{Math.floor(task.eta / 60)}min restantes</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <button
              onClick={onPause}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Pause size={16} />
            </button>
          )}
          {isPaused && (
            <button
              onClick={onResume}
              className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"
            >
              <Play size={16} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {!isDone && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface FilesPageProps {
  onBack: () => void;
}

export const FilesPage: React.FC<FilesPageProps> = ({ onBack }) => {
  const {
    files,
    currentPath,
    storage,
    disks,
    isLoading,
    error,
    selectedFiles,
    listFiles,
    navigateTo,
    navigateUp,
    createDirectory,
    deleteFiles,
    fetchStorage,
    fetchDisks,
    toggleSelectFile,
    clearSelection,
    selectAll
  } = useFsStore();

  const {
    tasks: downloads,
    fetchDownloads,
    pauseDownload,
    resumeDownload,
    deleteDownload
  } = useDownloadsStore();

  const [activeTab, setActiveTab] = useState<'files' | 'downloads'>('files');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchStorage();
    fetchDisks();
    fetchDownloads();
  }, [fetchStorage, fetchDisks, fetchDownloads]);

  // Only fetch files if we have storage
  useEffect(() => {
    if (storage && storage.total_bytes > 0) {
      listFiles('/');
    }
  }, [storage, listFiles]);

  // Check if we have a disk available
  const hasDisk = (storage && storage.total_bytes > 0) || disks.length > 0;

  // Filter files by search
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Path breadcrumbs
  const pathParts = currentPath.split('/').filter(Boolean);

  // Handle file/folder open
  const handleOpen = (file: FsFile) => {
    if (file.type === 'dir') {
      navigateTo(file.path);
    }
    // For files, could open preview or download
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createDirectory(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  // Handle delete selected
  const handleDeleteSelected = async () => {
    if (selectedFiles.length > 0 && confirm(`Supprimer ${selectedFiles.length} élément(s) ?`)) {
      await deleteFiles(selectedFiles);
    }
  };

  // Active downloads count
  const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'seeding').length;

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
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Folder size={24} className="text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Fichiers</h1>
                  <p className="text-sm text-gray-500">Explorateur & Téléchargements</p>
                </div>
              </div>
            </div>

            {/* Storage info */}
            {storage && storage.total_bytes > 0 ? (
              <div className="hidden md:flex items-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-lg">
                <HardDrive size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Espace utilisé</div>
                  <div className="text-sm text-white">
                    {formatSize(storage.used_bytes || 0)} / {formatSize(storage.total_bytes)}
                  </div>
                </div>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${storage.total_bytes > 0 ? ((storage.used_bytes || 0) / storage.total_bytes) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-lg">
                <HardDrive size={16} className="text-gray-500" />
                <div className="text-sm text-gray-500">Aucun disque</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'files'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder size={16} />
                Explorateur
              </span>
            </button>
            <button
              onClick={() => setActiveTab('downloads')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'downloads'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Download size={16} />
                Téléchargements ({downloads.length})
                {activeDownloads > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white rounded-full">
                    {activeDownloads}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <>
            {/* No disk warning */}
            {!hasDisk && (
              <div className="flex flex-col items-center justify-center py-16">
                <HardDrive size={64} className="text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Aucun disque détecté</h2>
                <p className="text-gray-500 text-center max-w-md">
                  Connectez un disque dur à votre Freebox pour accéder à l'explorateur de fichiers.
                </p>
              </div>
            )}

            {/* File explorer (only show if disk available) */}
            {hasDisk && (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4 mb-4">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => navigateTo('/')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <Home size={16} />
                </button>
                {pathParts.map((part, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                    <button
                      onClick={() => navigateTo('/' + pathParts.slice(0, i + 1).join('/'))}
                      className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors truncate max-w-32"
                    >
                      {part}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 w-40"
                  />
                </div>
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title={viewMode === 'grid' ? 'Vue liste' : 'Vue grille'}
                >
                  {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
                </button>
                <button
                  onClick={() => listFiles()}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Selection toolbar */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={navigateUp}
                  disabled={currentPath === '/'}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded-lg transition-colors"
                >
                  <ArrowUp size={14} />
                  Dossier parent
                </button>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <FolderPlus size={14} />
                  Nouveau dossier
                </button>
              </div>
              <div className="flex items-center gap-2">
                {selectedFiles.length > 0 ? (
                  <>
                    <span className="text-xs text-gray-400">{selectedFiles.length} sélectionné(s)</span>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Désélectionner
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </>
                ) : (
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Tout sélectionner
                  </button>
                )}
              </div>
            </div>

            {/* File list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="text-blue-400 animate-spin" />
              </div>
            ) : filteredFiles.length > 0 ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                : 'space-y-1'
              }>
                {filteredFiles.map((file) => (
                  <FileItem
                    key={file.path}
                    file={file}
                    isSelected={selectedFiles.includes(file.path)}
                    viewMode={viewMode}
                    onSelect={() => toggleSelectFile(file.path)}
                    onOpen={() => handleOpen(file)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Folder size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Dossier vide</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchQuery ? 'Aucun fichier ne correspond à votre recherche.' : 'Ce dossier ne contient aucun fichier.'}
                </p>
              </div>
            )}
              </>
            )}
          </>
        )}

        {/* Downloads Tab */}
        {activeTab === 'downloads' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">
                {activeDownloads > 0 && (
                  <span className="text-emerald-400">{activeDownloads} téléchargement(s) en cours</span>
                )}
              </div>
              <button
                onClick={() => fetchDownloads()}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {downloads.length > 0 ? (
              <div className="space-y-2">
                {downloads.map((task) => (
                  <DownloadItem
                    key={task.id}
                    task={task}
                    onPause={() => pauseDownload(task.id)}
                    onResume={() => resumeDownload(task.id)}
                    onDelete={() => {
                      if (confirm('Supprimer ce téléchargement ?')) {
                        deleteDownload(task.id, false);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Download size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun téléchargement</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Vos téléchargements actifs et terminés apparaîtront ici.
                </p>
              </div>
            )}
          </>
        )}

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Nouveau dossier</h3>
              <input
                type="text"
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FilesPage;