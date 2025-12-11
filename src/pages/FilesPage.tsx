import React, { useEffect, useState, useCallback } from 'react';
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
  X,
  MoreVertical,
  Edit3,
  Copy,
  Move,
  Share2,
  Link,
  Check,
  Clock,
  Plus,
  Upload,
  RotateCcw,
  LinkIcon
} from 'lucide-react';
import { useFsStore, type FsFile, type ShareLink } from '../stores/fsStore';
import { useDownloadsStore, useSystemStore } from '../stores';
import { useAuthStore } from '../stores/authStore';
import { PermissionBanner } from '../components/ui/PermissionBanner';
import { ToastContainer, type ToastData } from '../components/ui/Toast';
import { DownloadDetails } from '../components/downloads/DownloadDetails';
import type { DownloadTask } from '../types';

// Map model to display name
const getDisplayName = (model: string): string => {
  switch (model) {
    case 'ultra': return 'Freebox Ultra';
    case 'delta': return 'Freebox Delta';
    case 'pop': return 'Freebox Pop';
    case 'revolution': return 'Freebox Revolution';
    default: return 'Freebox';
  }
};

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

// Decode base64 path to readable string
const decodeBase64Path = (encoded: string): string => {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return encoded;
  }
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
  isShared: boolean;
  isRootFolder: boolean;
  isParentDir: boolean;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRename: () => void;
  onCopy: () => void;
  onMove: () => void;
  onShare: () => void;
  onDelete: () => void;
}> = ({ file, isSelected, isShared, isRootFolder, isParentDir, viewMode, onSelect, onOpen, onContextMenu, onRename, onCopy, onMove, onShare, onDelete }) => {
  const Icon = getFileIcon(file);
  const iconColor = getFileIconColor(file);
  const [showMenu, setShowMenu] = useState(false);

  if (viewMode === 'grid') {
    return (
      <div
        className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${
          isSelected
            ? 'bg-blue-900/30 border-blue-600'
            : 'bg-[#1a1a1a] border-transparent hover:border-gray-700 hover:bg-[#202020]'
        }`}
        onClick={(e) => {
          if ((e.ctrlKey || e.metaKey) && !isParentDir) {
            onSelect();
          } else {
            onOpen();
          }
        }}
        onContextMenu={isParentDir ? undefined : onContextMenu}
      >
        {!isParentDir && (
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
        )}
        {/* Ellipsis menu button */}
        {!isParentDir && (
          <div className="absolute top-2 right-2">
            <button
              className={`p-1 rounded transition-opacity hover:bg-white/10 ${
                showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical size={16} className="text-gray-400" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-8 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px] z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { if (!isRootFolder) { onRename(); setShowMenu(false); } }}
                  disabled={isRootFolder}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isRootFolder ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  <Edit3 size={14} /> Renommer
                </button>
                <button onClick={() => { onCopy(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                  <Copy size={14} /> Copier
                </button>
                <button onClick={() => { onMove(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                  <Move size={14} /> Déplacer
                </button>
                <button onClick={() => { onShare(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-purple-400 hover:bg-gray-800 flex items-center gap-2">
                  <Share2 size={14} /> Partager
                </button>
                <div className="border-t border-gray-700 my-1" />
                <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            )}
          </div>
        )}
        {/* Shared indicator */}
        {isShared && !isParentDir && (
          <div className="absolute top-2 right-8 p-1" title="Partagé">
            <Link size={14} className="text-purple-400" />
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Icon size={40} className={iconColor} />
          </div>
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
        if ((e.ctrlKey || e.metaKey) && !isParentDir) {
          onSelect();
        } else {
          onOpen();
        }
      }}
      onContextMenu={isParentDir ? undefined : onContextMenu}
    >
      {!isParentDir ? (
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
      ) : (
        <div className="w-6" />
      )}
      <div className="relative">
        <Icon size={20} className={iconColor} />
        {isShared && !isParentDir && (
          <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-0.5" title="Partagé">
            <Link size={8} className="text-white" />
          </div>
        )}
      </div>
      <span className="flex-1 text-sm text-white truncate" title={file.name}>
        {file.name}
      </span>
      {isShared && !isParentDir && (
        <span className="text-xs text-purple-400 hidden sm:block">Partagé</span>
      )}
      {!isParentDir && (
        <span className="text-xs text-gray-500 w-24 text-right">
          {file.type === 'dir' ? `${file.filecount || 0} fichiers` : formatSize(file.size)}
        </span>
      )}
      {!isParentDir && (
        <span className="text-xs text-gray-500 w-32 text-right hidden md:block">
          {formatDate(file.modification)}
        </span>
      )}
      {/* Ellipsis menu */}
      {!isParentDir ? (
        <div className="relative">
          <button
            className={`p-1 rounded transition-opacity hover:bg-white/10 ${
              showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical size={16} className="text-gray-400" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-8 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px] z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { if (!isRootFolder) { onRename(); setShowMenu(false); } }}
                disabled={isRootFolder}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isRootFolder ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                <Edit3 size={14} /> Renommer
              </button>
              <button onClick={() => { onCopy(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                <Copy size={14} /> Copier
              </button>
              <button onClick={() => { onMove(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                <Move size={14} /> Déplacer
              </button>
              <button onClick={() => { onShare(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-purple-400 hover:bg-gray-800 flex items-center gap-2">
                <Share2 size={14} /> Partager
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2">
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-6" />
      )}
    </div>
  );
};

// Download item component
const DownloadItem: React.FC<{
  task: DownloadTask;
  isSelected: boolean;
  onSelect: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onDelete: () => void;
}> = ({ task, isSelected, onSelect, onPause, onResume, onRetry, onDelete }) => {
  const isActive = task.status === 'downloading' || task.status === 'seeding';
  const isPaused = task.status === 'paused';
  const isDone = task.status === 'done';
  const isError = task.status === 'error';
  const isQueued = task.status === 'queued';

  const getStatusColor = () => {
    if (isDone) return 'bg-emerald-500/20';
    if (isError) return 'bg-red-500/20';
    if (isPaused || isQueued) return 'bg-gray-500/20';
    return 'bg-blue-500/20';
  };

  const getIconColor = () => {
    if (isDone) return 'text-emerald-400';
    if (isError) return 'text-red-400';
    if (isPaused || isQueued) return 'text-gray-400';
    return 'text-blue-400';
  };

  const getProgressColor = () => {
    if (isDone) return 'bg-emerald-500';
    if (isError) return 'bg-red-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (isError) return <span className="text-red-400">Erreur</span>;
    if (isQueued) return <span className="text-gray-400">En attente</span>;
    if (isPaused) return <span className="text-gray-400">En pause</span>;
    if (isDone) return <span className="text-emerald-400">Terminé</span>;
    if (task.status === 'seeding') return <span className="text-purple-400">Seeding</span>;
    return null;
  };

  return (
    <div
      className={`rounded-lg p-3 cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-900/30 border border-blue-600'
          : 'bg-[#1a1a1a] border border-transparent hover:border-gray-700'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${getStatusColor()}`}>
          {isError ? (
            <AlertCircle size={16} className={getIconColor()} />
          ) : (
            <Download size={16} className={getIconColor()} />
          )}
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
            {task.eta && task.eta > 0 && isActive && (
              <>
                <span>-</span>
                <span>{Math.floor(task.eta / 60)}min restantes</span>
              </>
            )}
            {getStatusText() && (
              <>
                <span>-</span>
                {getStatusText()}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isActive && (
            <button
              onClick={onPause}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Pause"
            >
              <Pause size={16} />
            </button>
          )}
          {(isPaused || isQueued) && (
            <button
              onClick={onResume}
              className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"
              title="Reprendre"
            >
              <Play size={16} />
            </button>
          )}
          {isError && (
            <button
              onClick={onRetry}
              className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-900/20 rounded-lg transition-colors"
              title="Réessayer"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Supprimer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {!isDone && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor()}`}
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
  initialTab?: 'files' | 'downloads' | 'shares';
  initialDownloadId?: string;
}

export const FilesPage: React.FC<FilesPageProps> = ({ onBack, initialTab, initialDownloadId }) => {
  const {
    files,
    currentPath,
    disks,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    selectedFiles,
    shareLinks,
    listFiles,
    loadMore,
    navigateTo,
    navigateUp,
    createDirectory,
    deleteFiles,
    copyFiles,
    moveFiles,
    rename,
    fetchDisks,
    fetchShareLinks,
    createShareLink,
    deleteShareLink,
    toggleSelectFile,
    clearSelection,
    selectAll
  } = useFsStore();

  const {
    tasks: downloads,
    fetchDownloads,
    addDownload,
    addDownloadFromFile,
    pauseDownload,
    resumeDownload,
    deleteDownload
  } = useDownloadsStore();

  // Get permissions from auth store
  const { permissions, freeboxUrl } = useAuthStore();
  const hasExplorerPermission = permissions.explorer === true;
  const hasDownloaderPermission = permissions.downloader === true;

  // Get box name from system store
  const { info: systemInfo } = useSystemStore();
  const boxName = getDisplayName(systemInfo?.board_name || '');

  const [activeTab, setActiveTab] = useState<'files' | 'downloads' | 'shares'>(initialTab || 'files');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Modal states for file operations
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FsFile | null>(null);
  const [newName, setNewName] = useState('');

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [destinationPath, setDestinationPath] = useState('');
  const [browserPath, setBrowserPath] = useState('/');
  const [browserFiles, setBrowserFiles] = useState<FsFile[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<FsFile | null>(null);
  const [shareExpireDays, setShareExpireDays] = useState<number>(7);
  const [createdShareLink, setCreatedShareLink] = useState<ShareLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FsFile } | null>(null);

  // Add download modal state
  const [showAddDownloadModal, setShowAddDownloadModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [torrentFile, setTorrentFile] = useState<File | null>(null);
  const [isAddingDownload, setIsAddingDownload] = useState(false);

  // Selected download for details view
  const [selectedDownload, setSelectedDownload] = useState<DownloadTask | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastData['type'], message: string, id?: string, progress?: number) => {
    const toastId = id || Date.now().toString();
    setToasts(prev => {
      // Update existing toast if id matches
      const existing = prev.find(t => t.id === toastId);
      if (existing) {
        return prev.map(t => t.id === toastId ? { ...t, type, message, progress } : t);
      }
      return [...prev, { id: toastId, type, message, progress }];
    });
    return toastId;
  };

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchDisks();
    fetchDownloads();
    fetchShareLinks();
    // Always try to list files on mount - the API will handle errors gracefully
    listFiles('/');
  }, [fetchDisks, fetchDownloads, fetchShareLinks, listFiles]);

  // Select initial download when downloads are loaded
  useEffect(() => {
    if (initialDownloadId && downloads.length > 0 && !selectedDownload) {
      const download = downloads.find(d => d.id === initialDownloadId);
      if (download) {
        setSelectedDownload(download);
      }
    }
  }, [initialDownloadId, downloads, selectedDownload]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Check if we have a disk available
  const hasDisk = disks.length > 0;

  // Calculate total storage from disks partitions
  const totalStorage = disks.reduce((acc, disk) => {
    const partitionTotal = disk.partitions?.reduce((sum, p) => sum + (p.total_bytes || 0), 0) || 0;
    return acc + partitionTotal;
  }, 0);

  const usedStorage = disks.reduce((acc, disk) => {
    const partitionUsed = disk.partitions?.reduce((sum, p) => sum + (p.used_bytes || 0), 0) || 0;
    return acc + partitionUsed;
  }, 0);

  // Filter files by search (exclude . directory, keep .. for navigation except at root)
  const filteredFiles = files.filter(file =>
    file.name !== '.' &&
    !(file.name === '..' && currentPath === '/') &&
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Path breadcrumbs - decode base64 path and split into parts
  const pathParts: { name: string; encodedPath: string }[] = (() => {
    if (currentPath === '/') return [];
    try {
      const decodedPath = decodeBase64Path(currentPath);
      const parts = decodedPath.split('/').filter(Boolean);
      return parts.map((name, i) => {
        // Build the path up to this point and encode it
        const pathUpToHere = '/' + parts.slice(0, i + 1).join('/');
        const encodedPath = btoa(unescape(encodeURIComponent(pathUpToHere)));
        return { name, encodedPath };
      });
    } catch {
      return [];
    }
  })();

  // Handle file/folder open
  const handleOpen = (file: FsFile) => {
    if (file.type === 'dir') {
      if (file.name === '..') {
        navigateUp();
      } else {
        navigateTo(file.path);
      }
    }
    // For files, could open preview or download
  };

  // Check if a file is shared
  const isFileShared = useCallback((filePath: string): boolean => {
    return shareLinks.some(link => link.path === filePath);
  }, [shareLinks]);

  // Check if file is a root level folder (disk)
  const isRootLevelFolder = (filePath: string): boolean => {
    try {
      const decodedPath = decodeBase64Path(filePath);
      // Root level folders have only one segment (e.g., "/Disque 1")
      const parts = decodedPath.split('/').filter(Boolean);
      return parts.length === 1;
    } catch {
      return false;
    }
  };

  // Single file actions
  const handleSingleFileRename = (file: FsFile) => {
    if (isRootLevelFolder(file.path)) {
      addToast('warning', 'Impossible de renommer un disque');
      return;
    }
    setRenameTarget(file);
    setNewName(file.name);
    setShowRenameModal(true);
  };

  const handleSingleFileCopy = (file: FsFile) => {
    clearSelection();
    toggleSelectFile(file.path);
    openCopyModal();
  };

  const handleSingleFileMove = (file: FsFile) => {
    clearSelection();
    toggleSelectFile(file.path);
    openMoveModal();
  };

  const handleSingleFileShare = (file: FsFile) => {
    setShareTarget(file);
    setCreatedShareLink(null);
    setShowShareModal(true);
  };

  const handleSingleFileDelete = async (file: FsFile) => {
    if (confirm(`Supprimer "${file.name}" ?`)) {
      const toastId = addToast('loading', `Suppression de "${file.name}"...`);
      const success = await deleteFiles([file.path]);
      removeToast(toastId);
      if (success) {
        addToast('success', `"${file.name}" supprimé`);
      } else {
        addToast('error', 'Erreur lors de la suppression');
      }
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      const toastId = addToast('loading', 'Création du dossier...');
      const success = await createDirectory(newFolderName.trim());
      removeToast(toastId);
      if (success) {
        addToast('success', `Dossier "${newFolderName.trim()}" créé`);
      } else {
        addToast('error', 'Erreur lors de la création du dossier');
      }
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  // Handle add download
  const handleAddDownload = async () => {
    setIsAddingDownload(true);
    const toastId = addToast('loading', 'Ajout du téléchargement...');
    let success = false;

    try {
      if (torrentFile) {
        // Upload torrent file
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data:application/x-bittorrent;base64, prefix
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(torrentFile);
        });
        success = await addDownloadFromFile(fileBase64, torrentFile.name);
      } else if (downloadUrl.trim()) {
        // Add by URL
        success = await addDownload(downloadUrl.trim());
      }
    } catch {
      success = false;
    }

    removeToast(toastId);
    setIsAddingDownload(false);

    if (success) {
      addToast('success', 'Téléchargement ajouté');
      setDownloadUrl('');
      setTorrentFile(null);
      setShowAddDownloadModal(false);
    } else {
      addToast('error', 'Erreur lors de l\'ajout du téléchargement');
    }
  };

  // Handle torrent file selection
  const handleTorrentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.torrent')) {
      setTorrentFile(file);
      setDownloadUrl(''); // Clear URL when file is selected
    }
  };

  // Handle retry download (restart a failed download)
  const handleRetryDownload = async (id: string) => {
    const toastId = addToast('loading', 'Relance du téléchargement...');
    await resumeDownload(id);
    removeToast(toastId);
    addToast('success', 'Téléchargement relancé');
  };

  // Handle delete selected
  const handleDeleteSelected = async () => {
    const count = selectedFiles.length;
    if (count > 0 && confirm(`Supprimer ${count} élément(s) ?`)) {
      const toastId = addToast('loading', `Suppression de ${count} élément(s)...`);
      const success = await deleteFiles(selectedFiles);
      removeToast(toastId);
      if (success) {
        addToast('success', `${count} élément(s) supprimé(s)`);
      } else {
        addToast('error', 'Erreur lors de la suppression');
      }
    }
  };

  // Handle rename
  const handleRename = async () => {
    if (renameTarget && newName.trim()) {
      const toastId = addToast('loading', 'Renommage en cours...');
      const success = await rename(renameTarget.path, newName.trim());
      removeToast(toastId);
      if (success) {
        addToast('success', `"${renameTarget.name}" renommé en "${newName.trim()}"`);
      } else {
        addToast('error', 'Erreur lors du renommage');
      }
      setRenameTarget(null);
      setNewName('');
      setShowRenameModal(false);
    }
  };

  // Handle copy
  const handleCopy = async () => {
    // browserPath must be a valid base64 path (not '/' which is just a UI marker for root listing)
    if (selectedFiles.length > 0 && browserPath && browserPath !== '/') {
      const count = selectedFiles.length;
      const dest = destinationPath;
      const filesToCopy = [...selectedFiles];
      const destPath = browserPath;

      setShowCopyModal(false);
      setDestinationPath('');
      setBrowserPath('/');
      clearSelection();

      const toastId = addToast('loading', `Copie de ${count} élément(s) en cours...`);
      // Use destPath (base64 encoded) for the API
      const success = await copyFiles(filesToCopy, destPath);
      removeToast(toastId);
      if (success) {
        addToast('success', `${count} élément(s) copié(s) vers ${dest}`);
      } else {
        addToast('error', 'Erreur lors de la copie');
      }
    }
  };

  // Handle move
  const handleMove = async () => {
    // browserPath must be a valid base64 path (not '/' which is just a UI marker for root listing)
    if (selectedFiles.length > 0 && browserPath && browserPath !== '/') {
      const count = selectedFiles.length;
      const dest = destinationPath;
      const filesToMove = [...selectedFiles];
      const destPath = browserPath;

      setShowMoveModal(false);
      setDestinationPath('');
      setBrowserPath('/');
      clearSelection();

      const toastId = addToast('loading', `Déplacement de ${count} élément(s) en cours...`);
      // Use browserPath (base64 encoded) for the API
      const success = await moveFiles(filesToMove, destPath);
      removeToast(toastId);
      if (success) {
        addToast('success', `${count} élément(s) déplacé(s) vers ${dest}`);
      } else {
        addToast('error', 'Erreur lors du déplacement');
      }
    }
  };

  // Handle share
  const handleShare = async () => {
    if (shareTarget) {
      const link = await createShareLink(shareTarget.path, shareExpireDays || undefined);
      if (link) {
        setCreatedShareLink(link);
      }
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Open context menu
  const handleContextMenu = (e: React.MouseEvent, file: FsFile) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 180;
    const menuHeight = 250;

    // Adjust position to stay within viewport
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({ x, y, file });
  };

  // Browser for destination selection
  const loadBrowserFiles = async (path: string) => {
    setBrowserLoading(true);
    try {
      const url = (path === '/' || path === '')
        ? '/api/fs/list'
        : `/api/fs/list?path=${encodeURIComponent(path)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.result) {
        // Only show directories
        const dirs = data.result.filter((f: FsFile) => f.type === 'dir');
        setBrowserFiles(dirs);
        // For root, we store '/' as a marker, but for operations we'll need to select a subfolder
        setBrowserPath(path);
        // Set destination path (decoded for display)
        if (path === '/') {
          setDestinationPath('/');
        } else {
          setDestinationPath(decodeBase64Path(path));
        }
      }
    } catch {
      setBrowserFiles([]);
    }
    setBrowserLoading(false);
  };

  const browserNavigateUp = async () => {
    if (browserPath === '/') return;
    try {
      const decodedPath = decodeBase64Path(browserPath);
      const parts = decodedPath.split('/').filter(Boolean);
      parts.pop();
      if (parts.length === 0) {
        await loadBrowserFiles('/');
      } else {
        const parentPath = '/' + parts.join('/');
        const encodedParentPath = btoa(unescape(encodeURIComponent(parentPath)));
        await loadBrowserFiles(encodedParentPath);
      }
    } catch {
      await loadBrowserFiles('/');
    }
  };

  const openCopyModal = () => {
    setShowCopyModal(true);
    loadBrowserFiles('/');
  };

  const openMoveModal = () => {
    setShowMoveModal(true);
    loadBrowserFiles('/');
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
            {hasDisk && totalStorage > 0 ? (
              <div className="hidden md:flex items-center gap-3 bg-[#1a1a1a] px-4 py-2 rounded-lg">
                <HardDrive size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Espace utilisé</div>
                  <div className="text-sm text-white">
                    {formatSize(usedStorage)} / {formatSize(totalStorage)}
                  </div>
                </div>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${totalStorage > 0 ? (usedStorage / totalStorage) * 100 : 0}%` }}
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
            <button
              onClick={() => {
                setActiveTab('shares');
                fetchShareLinks();
              }}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'shares'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Link size={16} />
                Partages ({shareLinks.length})
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
            {/* Permission warning */}
            {!hasExplorerPermission && (
              <PermissionBanner permission="explorer" freeboxUrl={freeboxUrl} />
            )}

            {/* No disk warning */}
            {!hasDisk && hasExplorerPermission && (
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
              <div className="flex items-center gap-1 overflow-x-auto flex-grow">
                <button
                  onClick={() => navigateTo('/')}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <Home size={16} />
                  <span className="text-sm text-gray-300">{boxName}</span>
                </button>
                {pathParts.map((part, i) => {
                  const isPartShared = isFileShared(part.encodedPath);
                  return (
                    <React.Fragment key={i}>
                      <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
                      <button
                        onClick={() => navigateTo(part.encodedPath)}
                        className={`px-2 py-1 text-sm hover:text-white hover:bg-gray-800 rounded transition-colors truncate max-w-48 flex items-center gap-1 ${
                          isPartShared ? 'text-purple-400' : 'text-gray-300'
                        }`}
                      >
                        {part.name}
                        {isPartShared && <Link size={12} className="flex-shrink-0" />}
                      </button>
                    </React.Fragment>
                  );
                })}
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
                  disabled={currentPath === '/'}
                  title={currentPath === '/' ? 'Impossible de créer un dossier à la racine' : 'Nouveau dossier'}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
                      Annuler
                    </button>
                    {selectedFiles.length === 1 && !isRootLevelFolder(selectedFiles[0]) && (
                      <button
                        onClick={() => {
                          const file = files.find(f => f.path === selectedFiles[0]);
                          if (file) {
                            setRenameTarget(file);
                            setNewName(file.name);
                            setShowRenameModal(true);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg transition-colors"
                        title="Renommer"
                      >
                        <Edit3 size={14} />
                        Renommer
                      </button>
                    )}
                    <button
                      onClick={openCopyModal}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg transition-colors"
                      title="Copier"
                    >
                      <Copy size={14} />
                      Copier
                    </button>
                    <button
                      onClick={openMoveModal}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-lg transition-colors"
                      title="Déplacer"
                    >
                      <Move size={14} />
                      Déplacer
                    </button>
                    {selectedFiles.length === 1 && (
                      <button
                        onClick={() => {
                          const file = files.find(f => f.path === selectedFiles[0]);
                          if (file) {
                            setShareTarget(file);
                            setCreatedShareLink(null);
                            setShowShareModal(true);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
                        title="Partager"
                      >
                        <Share2 size={14} />
                        Partager
                      </button>
                    )}
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
              <>
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                  : 'space-y-1'
                }>
                  {filteredFiles.map((file) => (
                    <FileItem
                      key={file.path}
                      file={file}
                      isSelected={selectedFiles.includes(file.path)}
                      isShared={isFileShared(file.path)}
                      isRootFolder={isRootLevelFolder(file.path)}
                      isParentDir={file.name === '..'}
                      viewMode={viewMode}
                      onSelect={() => toggleSelectFile(file.path)}
                      onOpen={() => handleOpen(file)}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                      onRename={() => handleSingleFileRename(file)}
                      onCopy={() => handleSingleFileCopy(file)}
                      onMove={() => handleSingleFileMove(file)}
                      onShare={() => handleSingleFileShare(file)}
                      onDelete={() => handleSingleFileDelete(file)}
                    />
                  ))}
                </div>

                {/* Load More button for v15 pagination */}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] disabled:opacity-50 border border-gray-700 rounded-lg transition-colors text-sm text-white"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={16} />
                          Charger plus de fichiers
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
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
            {/* Permission warning */}
            {!hasDownloaderPermission && (
              <PermissionBanner permission="downloader" freeboxUrl={freeboxUrl} />
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddDownloadModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Ajouter
                </button>
                {activeDownloads > 0 && (
                  <span className="text-sm text-emerald-400">{activeDownloads} téléchargement(s) en cours</span>
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
                    isSelected={selectedDownload?.id === task.id}
                    onSelect={() => setSelectedDownload(selectedDownload?.id === task.id ? null : task)}
                    onPause={() => pauseDownload(task.id)}
                    onResume={() => resumeDownload(task.id)}
                    onRetry={() => handleRetryDownload(task.id)}
                    onDelete={() => {
                      if (confirm('Supprimer ce téléchargement ?')) {
                        // Close details panel first if this is the selected download
                        if (selectedDownload?.id === task.id) {
                          setSelectedDownload(null);
                        }
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
                <button
                  onClick={() => setShowAddDownloadModal(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Ajouter un téléchargement
                </button>
              </div>
            )}

            {/* Download Details Panel */}
            {selectedDownload && (
              <div className="mt-6">
                <DownloadDetails
                  task={selectedDownload}
                  onClose={() => setSelectedDownload(null)}
                />
              </div>
            )}
          </>
        )}

        {/* Shares Tab */}
        {activeTab === 'shares' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">
                {shareLinks.length > 0 && (
                  <span>{shareLinks.length} lien(s) de partage actif(s)</span>
                )}
              </div>
              <button
                onClick={() => fetchShareLinks()}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {shareLinks.length > 0 ? (
              <div className="space-y-2">
                {shareLinks.map((link) => (
                  <div key={link.token} className="bg-[#1a1a1a] rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Link size={16} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-white truncate">{link.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          {link.expire > 0 ? (
                            <>
                              <Clock size={12} />
                              <span>Expire le {formatDate(link.expire)}</span>
                            </>
                          ) : (
                            <span>Pas d'expiration</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(link.fullurl)}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
                        >
                          {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                          {linkCopied ? 'Copié !' : 'Copier le lien'}
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Supprimer ce lien de partage ?')) {
                              await deleteShareLink(link.token);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {link.fullurl && (
                      <div className="mt-3 p-2 bg-[#0a0a0a] rounded-lg">
                        <p className="text-xs text-gray-400 font-mono truncate">{link.fullurl}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Link size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucun lien de partage</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Sélectionnez un fichier ou dossier dans l'explorateur et cliquez sur "Partager" pour créer un lien.
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

        {/* Rename Modal */}
        {showRenameModal && renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Renommer</h3>
              <p className="text-sm text-gray-400 mb-4">Renommer "{renameTarget.name}"</p>
              <input
                type="text"
                placeholder="Nouveau nom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setRenameTarget(null);
                    setNewName('');
                    setShowRenameModal(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRename}
                  disabled={!newName.trim() || newName === renameTarget.name}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Renommer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Copy Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Copy size={20} className="text-blue-400" />
                Copier {selectedFiles.length} élément(s)
              </h3>

              {/* Destination path display */}
              <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Destination :</p>
                <p className="text-sm text-white font-mono">{destinationPath || '/'}</p>
              </div>

              {/* Folder browser */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => loadBrowserFiles('/')}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                    title="Racine"
                  >
                    <Home size={14} />
                  </button>
                  <button
                    onClick={browserNavigateUp}
                    disabled={browserPath === '/'}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                    title="Dossier parent"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {browserPath === '/' ? '/' : decodeBase64Path(browserPath)}
                  </span>
                </div>
                <div className="h-48 overflow-y-auto bg-[#0a0a0a] rounded-lg border border-gray-700">
                  {browserLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={20} className="text-blue-400 animate-spin" />
                    </div>
                  ) : browserFiles.length > 0 ? (
                    <div className="p-1">
                      {browserFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => loadBrowserFiles(file.path)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded text-left transition-colors"
                        >
                          <Folder size={16} className="text-yellow-400 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      Aucun sous-dossier
                    </div>
                  )}
                </div>
              </div>

              {browserPath === '/' && (
                <p className="text-xs text-amber-400 mb-3">Sélectionnez un dossier de destination</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDestinationPath('');
                    setShowCopyModal(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCopy}
                  disabled={browserPath === '/'}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Copier ici
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Move Modal */}
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Move size={20} className="text-blue-400" />
                Déplacer {selectedFiles.length} élément(s)
              </h3>

              {/* Destination path display */}
              <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Destination :</p>
                <p className="text-sm text-white font-mono">{destinationPath || '/'}</p>
              </div>

              {/* Folder browser */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => loadBrowserFiles('/')}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                    title="Racine"
                  >
                    <Home size={14} />
                  </button>
                  <button
                    onClick={browserNavigateUp}
                    disabled={browserPath === '/'}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                    title="Dossier parent"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {browserPath === '/' ? '/' : decodeBase64Path(browserPath)}
                  </span>
                </div>
                <div className="h-48 overflow-y-auto bg-[#0a0a0a] rounded-lg border border-gray-700">
                  {browserLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={20} className="text-blue-400 animate-spin" />
                    </div>
                  ) : browserFiles.length > 0 ? (
                    <div className="p-1">
                      {browserFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => loadBrowserFiles(file.path)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded text-left transition-colors"
                        >
                          <Folder size={16} className="text-yellow-400 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      Aucun sous-dossier
                    </div>
                  )}
                </div>
              </div>

              {browserPath === '/' && (
                <p className="text-xs text-amber-400 mb-3">Sélectionnez un dossier de destination</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDestinationPath('');
                    setShowMoveModal(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleMove}
                  disabled={browserPath === '/'}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Déplacer ici
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && shareTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                <span className="flex items-center gap-2">
                  <Share2 size={20} className="text-purple-400" />
                  Partager "{shareTarget.name}"
                </span>
              </h3>

              {!createdShareLink ? (
                <>
                  <p className="text-sm text-gray-400 mb-4">
                    Créez un lien de partage public pour ce {shareTarget.type === 'dir' ? 'dossier' : 'fichier'}.
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Expiration du lien :</label>
                    <select
                      value={shareExpireDays}
                      onChange={(e) => setShareExpireDays(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value={0}>Jamais</option>
                      <option value={1}>1 jour</option>
                      <option value={7}>7 jours</option>
                      <option value={30}>30 jours</option>
                      <option value={90}>90 jours</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShareTarget(null);
                        setCreatedShareLink(null);
                        setShowShareModal(false);
                      }}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleShare}
                      className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                    >
                      Créer le lien
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Check size={16} />
                      <span className="text-sm font-medium">Lien créé avec succès !</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Lien de partage :</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createdShareLink.fullurl}
                        readOnly
                        className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(createdShareLink.fullurl)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      >
                        {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {createdShareLink.expire > 0 && (
                    <p className="text-xs text-gray-500 mb-4">
                      Expire le {formatDate(createdShareLink.expire)}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShareTarget(null);
                        setCreatedShareLink(null);
                        setShowShareModal(false);
                        clearSelection();
                      }}
                      className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Download Modal */}
        {showAddDownloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Download size={20} className="text-blue-400" />
                Ajouter un téléchargement
              </h3>

              <div className="space-y-4">
                {/* URL Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    URL du fichier ou lien magnet
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="https://... ou magnet:?xt=..."
                        value={downloadUrl}
                        onChange={(e) => {
                          setDownloadUrl(e.target.value);
                          if (e.target.value) setTorrentFile(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && (downloadUrl.trim() || torrentFile) && handleAddDownload()}
                        disabled={!!torrentFile}
                        className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-700" />
                  <span className="text-xs text-gray-500">ou</span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Fichier torrent
                  </label>
                  {torrentFile ? (
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-gray-700 rounded-lg">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FileArchive size={20} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{torrentFile.name}</p>
                        <p className="text-xs text-gray-500">{formatSize(torrentFile.size)}</p>
                      </div>
                      <button
                        onClick={() => setTorrentFile(null)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 hover:bg-[#1a1a1a]/50 transition-colors">
                      <Upload size={24} className="text-gray-500" />
                      <span className="text-sm text-gray-400">Cliquez ou déposez un fichier .torrent</span>
                      <input
                        type="file"
                        accept=".torrent"
                        onChange={handleTorrentFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  Formats supportés : HTTP, HTTPS, FTP, Magnet, fichiers .torrent
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setDownloadUrl('');
                    setTorrentFile(null);
                    setShowAddDownloadModal(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddDownload}
                  disabled={(!downloadUrl.trim() && !torrentFile) || isAddingDownload}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isAddingDownload ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Télécharger
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] z-[200]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-700">
            <p className="text-xs text-gray-400 truncate max-w-[160px]">{contextMenu.file.name}</p>
          </div>
          <button
            onClick={() => { if (!isRootLevelFolder(contextMenu.file.path)) { handleSingleFileRename(contextMenu.file); setContextMenu(null); } }}
            disabled={isRootLevelFolder(contextMenu.file.path)}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isRootLevelFolder(contextMenu.file.path) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            <Edit3 size={14} /> Renommer
          </button>
          <button
            onClick={() => { handleSingleFileCopy(contextMenu.file); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
          >
            <Copy size={14} /> Copier
          </button>
          <button
            onClick={() => { handleSingleFileMove(contextMenu.file); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
          >
            <Move size={14} /> Déplacer
          </button>
          <button
            onClick={() => { handleSingleFileShare(contextMenu.file); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-purple-400 hover:bg-gray-800 flex items-center gap-2"
          >
            <Share2 size={14} /> Partager
          </button>
          <div className="border-t border-gray-700 my-1" />
          <button
            onClick={() => { handleSingleFileDelete(contextMenu.file); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default FilesPage;