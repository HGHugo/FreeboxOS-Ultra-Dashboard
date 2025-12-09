import React, { useState, useEffect } from 'react';
import { X, Clock, Loader2, Check, AlertTriangle, Save, Calendar, Settings, Power } from 'lucide-react';
import { useSystemStore } from '../../stores/systemStore';

interface RebootScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export const RebootScheduleModal: React.FC<RebootScheduleModalProps> = ({
  isOpen,
  onClose
}) => {
  const { schedule, fetchSchedule, updateSchedule } = useSystemStore();
  
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [time, setTime] = useState('03:00');
  const [days, setDays] = useState<number[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    await fetchSchedule();
    setLoading(false);
  };

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      const initialMapping = schedule.mapping || {};
      setMapping(initialMapping);

      // Derive mode and simple params
      const times = Object.values(initialMapping);
      const uniqueTimes = new Set(times);
      const scheduledDays = Object.keys(initialMapping).map(Number);

      if (uniqueTimes.size <= 1) {
        setMode('simple');
        if (uniqueTimes.size === 1) {
          setTime(times[0]);
        }
        setDays(scheduledDays);
      } else {
        setMode('advanced');
        // Default time/days for switching back to simple
        setTime('03:00');
        setDays(scheduledDays);
      }
    }
  }, [schedule]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Build final mapping based on current mode
    let finalMapping: Record<number, string> = {};

    if (mode === 'simple') {
      days.forEach(day => {
        finalMapping[day] = time;
      });
    } else {
      finalMapping = mapping;
    }

    const success = await updateSchedule({
      enabled,
      mapping: finalMapping
    });

    if (success) {
      setSuccess('Planification enregistrée');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Erreur lors de l\'enregistrement');
    }
    setSaving(false);
  };

  const toggleDay = (day: number) => {
    setDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const updateMappingDay = (day: number, newTime: string | null) => {
    setMapping(prev => {
      const next = { ...prev };
      if (newTime) {
        next[day] = newTime;
      } else {
        delete next[day];
      }
      return next;
    });
  };

  // When switching to advanced, ensure mapping is populated from simple settings if needed
  useEffect(() => {
    if (mode === 'advanced') {
      // If we switch to advanced, we populate mapping from simple state IF mapping is empty or we want to sync
      // But typically we want to preserve what was in simple mode
      const newMapping: Record<number, string> = {};
      days.forEach(day => {
        newMapping[day] = time;
      });
      // Merge with existing mapping but prioritize simple state if it was active? 
      // Actually, simple state "days" and "time" are just UI helpers.
      // If coming from simple, we should overwrite mapping with simple config
      setMapping(newMapping);
    } else {
      // Switching to simple
      // We try to find a common time or default
      const times = Object.values(mapping);
      const uniqueTimes = new Set(times);
      if (uniqueTimes.size === 1) {
        setTime(times[0]);
      }
      setDays(Object.keys(mapping).map(Number));
    }
  }, [mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151515] w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white">Redémarrage planifié</h2>
            <p className="text-sm text-gray-500 mt-1">Programmer le redémarrage automatique</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                  <Check size={16} />
                  {success}
                </div>
              )}

              {/* Main Controls */}
              <div className="flex flex-col gap-4">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <Power size={20} className={enabled ? "text-emerald-400" : "text-gray-500"} />
                    <span className="text-white font-medium">Activer la planification</span>
                  </div>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-emerald-500' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <Settings size={20} className={mode === 'advanced' ? "text-blue-400" : "text-gray-500"} />
                    <div>
                      <span className="text-white font-medium block">Mode Avancé</span>
                      <span className="text-xs text-gray-500">Configuration par jour</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Prevent effect loop by setting state directly here if needed, but effect handles logic well
                      setMode(mode === 'simple' ? 'advanced' : 'simple');
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      mode === 'advanced' ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      mode === 'advanced' ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Simple Mode UI */}
              {mode === 'simple' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Clock size={16} />
                      Heure du redémarrage
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <Calendar size={16} />
                      Jours d'exécution
                    </label>
                    <div className="flex justify-between gap-1">
                      {DAYS.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => toggleDay(day.value)}
                          className={`flex-1 aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                            days.includes(day.value)
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                              : 'bg-[#1a1a1a] text-gray-500 hover:bg-[#252525] hover:text-gray-300'
                          }`}
                          title={day.label}
                        >
                          {day.label[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Mode UI */}
              {mode === 'advanced' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-4">
                    <Calendar size={16} />
                    Configuration par jour
                  </label>
                  {DAYS.map((day) => {
                    const dayEnabled = mapping[day.value] !== undefined;
                    const dayTime = mapping[day.value] || '03:00';

                    return (
                      <div key={day.value} className="flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 transition-colors hover:border-gray-700">
                        <button
                          onClick={() => updateMappingDay(day.value, dayEnabled ? null : dayTime)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                            dayEnabled ? 'bg-blue-600 text-white' : 'bg-[#252525] text-transparent border border-gray-700'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                        
                        <span className={`flex-1 font-medium ${dayEnabled ? 'text-white' : 'text-gray-500'}`}>
                          {day.label}
                        </span>

                        <input
                          type="time"
                          value={dayTime}
                          disabled={!dayEnabled}
                          onChange={(e) => updateMappingDay(day.value, e.target.value)}
                          className={`px-3 py-1.5 bg-[#252525] border border-gray-700 rounded-lg text-sm transition-colors focus:outline-none focus:border-blue-500 ${
                            dayEnabled ? 'text-white' : 'text-gray-600 opacity-50'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Note :</strong> Cette fonctionnalité utilise le serveur du dashboard pour déclencher le redémarrage. Le dashboard doit être en cours d'exécution au moment prévu.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-[#1a1a1a]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Enregistrer la planification
          </button>
        </div>
      </div>
    </div>
  );
};
