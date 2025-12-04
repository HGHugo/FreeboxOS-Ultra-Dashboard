import React, { useEffect, useState } from 'react';
import {
  Tv,
  Video,
  Calendar,
  Clock,
  Trash2,
  Play,
  AlertCircle,
  Loader2,
  ChevronLeft,
  HardDrive,
  List,
  Grid,
  Plus,
  Power,
  X
} from 'lucide-react';
import { useTvStore, useSystemStore } from '../stores';
import type { PvrRecording, PvrProgrammed, TvChannel } from '../types/api';

// Format duration from seconds to HH:MM:SS
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, '0')}m`;
  }
  return `${m}min`;
};

// Format timestamp to date string
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Format timestamp to time string
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
};

// Recording card component
const RecordingCard: React.FC<{
  recording: PvrRecording;
  onDelete: (id: number) => void;
}> = ({ recording, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (showConfirm) {
      onDelete(recording.id);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{recording.name}</h3>
          {recording.sub_name && (
            <p className="text-sm text-gray-400 truncate">{recording.sub_name}</p>
          )}
          {(recording.season || recording.episode) && (
            <p className="text-xs text-gray-500">
              {recording.season && `S${recording.season.toString().padStart(2, '0')}`}
              {recording.episode && `E${recording.episode.toString().padStart(2, '0')}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {recording.state === 'running' && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              En cours
            </span>
          )}
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg transition-colors ${
              showConfirm
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'hover:bg-gray-700 text-gray-400 hover:text-white'
            }`}
            title={showConfirm ? 'Confirmer la suppression' : 'Supprimer'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(recording.start)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatTime(recording.start)} - {formatTime(recording.end)}
        </span>
        <span className="flex items-center gap-1">
          <Video size={12} />
          {formatDuration(recording.duration)}
        </span>
        <span className="flex items-center gap-1">
          <HardDrive size={12} />
          {formatSize(recording.byte_size)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-400">
          {recording.channel_name || recording.channel_type} - {recording.channel_quality}
        </span>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
          <Play size={12} />
          Lire
        </button>
      </div>
    </div>
  );
};

// Programmed recording card component
const ProgrammedCard: React.FC<{
  programmed: PvrProgrammed;
  onDelete: (id: number) => void;
}> = ({ programmed, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (showConfirm) {
      onDelete(programmed.id);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  const isActive = programmed.state === 'running' || programmed.state === 'starting';
  const isPast = programmed.end * 1000 < Date.now();

  // Check repeat days
  const repeatDays: string[] = [];
  if (programmed.repeat_monday) repeatDays.push('Lun');
  if (programmed.repeat_tuesday) repeatDays.push('Mar');
  if (programmed.repeat_wednesday) repeatDays.push('Mer');
  if (programmed.repeat_thursday) repeatDays.push('Jeu');
  if (programmed.repeat_friday) repeatDays.push('Ven');
  if (programmed.repeat_saturday) repeatDays.push('Sam');
  if (programmed.repeat_sunday) repeatDays.push('Dim');

  return (
    <div className={`bg-[#1a1a1a] rounded-xl border p-4 transition-colors ${
      isActive ? 'border-red-500/50' : isPast ? 'border-gray-700 opacity-60' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{programmed.name}</h3>
          {programmed.sub_name && (
            <p className="text-sm text-gray-400 truncate">{programmed.sub_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Enregistrement
            </span>
          )}
          {!programmed.enabled && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-400">
              Désactivé
            </span>
          )}
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg transition-colors ${
              showConfirm
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'hover:bg-gray-700 text-gray-400 hover:text-white'
            }`}
            title={showConfirm ? 'Confirmer la suppression' : 'Supprimer'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(programmed.start)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatTime(programmed.start)} - {formatTime(programmed.end)}
        </span>
        {repeatDays.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
            Répétition: {repeatDays.join(', ')}
          </span>
        )}
      </div>

      <div className="mt-3">
        <span className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-400">
          {programmed.channel_name || programmed.channel_type} - {programmed.channel_quality}
        </span>
      </div>
    </div>
  );
};

interface TvPageProps {
  onBack: () => void;
}

// Recording form modal
const RecordingFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PvrProgrammed>) => Promise<boolean>;
  channels: { uuid: string; name: string; number: number }[];
}> = ({ isOpen, onClose, onSave, channels }) => {
  const [formData, setFormData] = useState({
    name: '',
    channel_uuid: channels[0]?.uuid || '',
    channel_type: 'tnt',
    channel_quality: 'hd',
    start_date: '',
    start_time: '',
    end_time: '',
    margin_before: 5,
    margin_after: 10,
    repeat_monday: false,
    repeat_tuesday: false,
    repeat_wednesday: false,
    repeat_thursday: false,
    repeat_friday: false,
    repeat_saturday: false,
    repeat_sunday: false
  });
  const [saving, setSaving] = useState(false);

  // Set default date to today
  React.useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
    setFormData(prev => ({
      ...prev,
      start_date: dateStr,
      start_time: timeStr,
      end_time: endTime
    }));
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.channel_uuid || !formData.start_date || !formData.start_time || !formData.end_time) {
      return;
    }

    setSaving(true);
    try {
      const startDate = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDate = new Date(`${formData.start_date}T${formData.end_time}`);

      // If end time is before start time, assume it's the next day
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const success = await onSave({
        name: formData.name,
        channel_uuid: formData.channel_uuid,
        channel_type: formData.channel_type,
        channel_quality: formData.channel_quality,
        start: Math.floor(startDate.getTime() / 1000),
        end: Math.floor(endDate.getTime() / 1000),
        margin_before: formData.margin_before * 60, // Convert to seconds
        margin_after: formData.margin_after * 60,
        enabled: true,
        repeat_monday: formData.repeat_monday,
        repeat_tuesday: formData.repeat_tuesday,
        repeat_wednesday: formData.repeat_wednesday,
        repeat_thursday: formData.repeat_thursday,
        repeat_friday: formData.repeat_friday,
        repeat_saturday: formData.repeat_saturday,
        repeat_sunday: formData.repeat_sunday
      });

      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedChannel = channels.find(c => c.uuid === formData.channel_uuid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#151515] w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-[#151515]">
          <h2 className="text-lg font-bold text-white">Programmer un enregistrement</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom de l'enregistrement</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              placeholder="Mon émission"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Chaîne</label>
            <select
              value={formData.channel_uuid}
              onChange={(e) => setFormData({ ...formData, channel_uuid: e.target.value })}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {channels.map((channel) => (
                <option key={channel.uuid} value={channel.uuid}>
                  {channel.number} - {channel.name}
                </option>
              ))}
            </select>
            {selectedChannel && (
              <p className="text-xs text-gray-500 mt-1">
                Chaîne sélectionnée: {selectedChannel.name}
              </p>
            )}
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Début</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fin</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Margins */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Marge avant (min)</label>
              <input
                type="number"
                value={formData.margin_before}
                onChange={(e) => setFormData({ ...formData, margin_before: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                min="0"
                max="30"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Marge après (min)</label>
              <input
                type="number"
                value={formData.margin_after}
                onChange={(e) => setFormData({ ...formData, margin_after: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                min="0"
                max="60"
              />
            </div>
          </div>

          {/* Repeat days */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Répétition</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'repeat_monday', label: 'Lun' },
                { key: 'repeat_tuesday', label: 'Mar' },
                { key: 'repeat_wednesday', label: 'Mer' },
                { key: 'repeat_thursday', label: 'Jeu' },
                { key: 'repeat_friday', label: 'Ven' },
                { key: 'repeat_saturday', label: 'Sam' },
                { key: 'repeat_sunday', label: 'Dim' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, [key]: !formData[key as keyof typeof formData] })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    formData[key as keyof typeof formData]
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-800 sticky bottom-0 bg-[#151515]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.name || !formData.channel_uuid}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Programmer
          </button>
        </div>
      </div>
    </div>
  );
};

export const TvPage: React.FC<TvPageProps> = ({ onBack }) => {
  const { info: systemInfo } = useSystemStore();
  const {
    channels,
    recordings,
    programmed,
    pvrConfig,
    isLoading,
    error,
    fetchChannels,
    fetchRecordings,
    fetchProgrammed,
    fetchPvrConfig,
    deleteRecording,
    deleteProgrammed,
    createProgrammed,
    updatePvrConfig
  } = useTvStore();

  const [activeTab, setActiveTab] = useState<'recordings' | 'programmed'>('recordings');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showRecordingForm, setShowRecordingForm] = useState(false);
  const [togglingPvr, setTogglingPvr] = useState(false);

  // Check if PVR is available (requires disk)
  const hasDisk = systemInfo?.disk_status === 'active' || systemInfo?.user_main_storage;

  // Fetch data on mount
  useEffect(() => {
    if (hasDisk) {
      fetchChannels();
      fetchRecordings();
      fetchProgrammed();
      fetchPvrConfig();
    }
  }, [hasDisk, fetchChannels, fetchRecordings, fetchProgrammed, fetchPvrConfig]);

  const handleTogglePvr = async () => {
    if (!pvrConfig) return;
    setTogglingPvr(true);
    await updatePvrConfig({ enabled: !pvrConfig.enabled });
    setTogglingPvr(false);
  };

  const handleDeleteRecording = async (id: number) => {
    await deleteRecording(id);
  };

  const handleDeleteProgrammed = async (id: number) => {
    await deleteProgrammed(id);
  };

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
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Tv size={24} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Télévision</h1>
                  <p className="text-sm text-gray-500">Enregistrements PVR</p>
                </div>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* No disk warning */}
        {!hasDisk && (
          <div className="flex flex-col items-center justify-center py-16">
            <HardDrive size={64} className="text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Aucun disque détecté</h2>
            <p className="text-gray-500 text-center max-w-md">
              Connectez un disque dur à votre Freebox pour utiliser la fonctionnalité d'enregistrement TV (PVR).
            </p>
          </div>
        )}

        {/* PVR Config Panel */}
        {hasDisk && pvrConfig && (
          <div className="mb-6 p-4 bg-[#151515] border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${pvrConfig.enabled ? 'bg-emerald-500/20' : 'bg-gray-700'}`}>
                  <Power size={20} className={pvrConfig.enabled ? 'text-emerald-400' : 'text-gray-400'} />
                </div>
                <div>
                  <h3 className="font-medium text-white">Enregistreur PVR</h3>
                  <p className="text-xs text-gray-500">
                    {pvrConfig.enabled ? 'Activé' : 'Désactivé'} • Stockage: {pvrConfig.storage_path || 'Non configuré'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePvr}
                  disabled={togglingPvr}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    pvrConfig.enabled ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  {togglingPvr ? (
                    <Loader2 size={14} className="absolute top-1 left-1 animate-spin text-white" />
                  ) : (
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        pvrConfig.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  )}
                </button>
                {pvrConfig.enabled && channels.length > 0 && (
                  <button
                    onClick={() => setShowRecordingForm(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Programmer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PVR disabled warning */}
        {hasDisk && pvrConfig && !pvrConfig.enabled && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">PVR désactivé</p>
              <p className="text-sm text-yellow-400/70">
                Activez le PVR ci-dessus pour programmer des enregistrements.
              </p>
            </div>
          </div>
        )}

        {hasDisk && (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-800">
              <button
                onClick={() => setActiveTab('recordings')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'recordings'
                    ? 'text-purple-400 border-purple-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Video size={16} />
                  Enregistrements ({recordings.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('programmed')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'programmed'
                    ? 'text-emerald-400 border-emerald-400'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  Programmés ({programmed.length})
                </span>
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="text-purple-400 animate-spin" />
              </div>
            )}

            {/* Recordings tab */}
            {!isLoading && activeTab === 'recordings' && (
              <>
                {recordings.length > 0 ? (
                  <div className={viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
                  }>
                    {recordings.map((recording) => (
                      <RecordingCard
                        key={recording.id}
                        recording={recording}
                        onDelete={handleDeleteRecording}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Video size={48} className="text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Aucun enregistrement</h3>
                    <p className="text-gray-500 text-center max-w-md">
                      Vos enregistrements TV apparaîtront ici. Programmez un enregistrement depuis le guide TV.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Programmed tab */}
            {!isLoading && activeTab === 'programmed' && (
              <>
                {programmed.length > 0 ? (
                  <div className={viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
                  }>
                    {programmed.map((prog) => (
                      <ProgrammedCard
                        key={prog.id}
                        programmed={prog}
                        onDelete={handleDeleteProgrammed}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Calendar size={48} className="text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Aucune programmation</h3>
                    <p className="text-gray-500 text-center max-w-md">
                      Programmez des enregistrements depuis le guide des programmes dans Freebox OS.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Recording Form Modal */}
      <RecordingFormModal
        isOpen={showRecordingForm}
        onClose={() => setShowRecordingForm(false)}
        onSave={createProgrammed}
        channels={channels}
      />
    </div>
  );
};

export default TvPage;