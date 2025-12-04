import React from 'react';
import { FileText, Download, Upload, ChevronRight, Clock, Users } from 'lucide-react';
import { formatBytes, formatSpeed, formatDuration } from '../../utils/constants';
import type { DownloadTask } from '../../types';

interface FilePanelProps {
  tasks: DownloadTask[];
  onTaskClick?: (task: DownloadTask) => void;
}

export const FilePanel: React.FC<FilePanelProps> = ({ tasks, onTaskClick }) => {
  const activeTasks = tasks.filter(t => t.status === 'downloading' || t.status === 'seeding');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-3">
      {/* Active downloads */}
      {activeTasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick?.(task)}
          className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800 cursor-pointer hover:border-gray-700 transition-all"
        >
          {/* File name */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-[#252525] rounded-lg">
              <FileText size={16} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-200 truncate flex-1">
              {task.name}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">
                {formatBytes(task.downloaded)} / {formatBytes(task.size)}
              </span>
              <span className="text-blue-400 font-medium">{task.progress}%</span>
            </div>
            <div className="flex items-center gap-3">
              {task.peers != null && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Users size={10} /> {task.peers}
                </span>
              )}
              {task.eta > 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Clock size={10} /> {formatDuration(task.eta)}
                </span>
              )}
            </div>
          </div>

          {/* Speed row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
            <div className="flex items-center gap-1 text-xs">
              <Download size={12} className="text-blue-400" />
              <span className="text-blue-400 font-mono">{formatSpeed(task.downloadSpeed)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Upload size={12} className="text-emerald-400" />
              <span className="text-emerald-400 font-mono">{formatSpeed(task.uploadSpeed)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Completed files */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          {activeTasks.length > 0 && (
            <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1 mt-4">
              Terminés
            </div>
          )}
          {completedTasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="flex items-center justify-between p-3 bg-[#151515] rounded-xl border border-gray-800/50 hover:border-gray-700 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-[#1f1f1f] rounded-lg shrink-0">
                  <FileText size={14} className="text-gray-500" />
                </div>
                <span className="text-xs text-gray-400 truncate">{task.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-300 font-medium">{formatBytes(task.size)}</span>
                <ChevronRight size={14} className="text-gray-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 5 && (
        <button className="w-full text-center text-xs text-blue-400 hover:text-blue-300 py-2 transition-colors">
          Voir tout ({tasks.length} fichiers)
        </button>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          Aucun téléchargement
        </div>
      )}
    </div>
  );
};