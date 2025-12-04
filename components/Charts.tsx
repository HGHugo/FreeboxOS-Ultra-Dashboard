import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { X } from 'lucide-react';
import { NetworkStat } from '../types';

interface StatusChartProps {
  data: NetworkStat[];
  color: string;
  dataKey: 'download' | 'upload';
  title: string;
  currentValue: string;
  unit: string;
  trend: 'up' | 'down';
}

export const StatusChart: React.FC<StatusChartProps> = ({ data, color, dataKey, title, currentValue, unit, trend }) => {
  return (
    <div className="flex flex-col h-full bg-[#151515] rounded-xl p-4 border border-gray-800/50 relative overflow-hidden group">
      <div className="flex justify-between items-start z-10 relative mb-2">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{title}</span>
        {trend === 'up' ? (
             <span className="text-blue-400 text-xs">↑</span>
        ) : (
             <span className="text-green-400 text-xs">↓</span>
        )}
      </div>
      
      <div className="flex items-end gap-1 mb-4 z-10 relative">
        <span className="text-2xl font-bold text-white tracking-tight">{currentValue}</span>
        <span className="text-sm text-gray-500 font-medium mb-1">{unit}</span>
      </div>

      <div className="absolute inset-0 pt-10 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: number) => [`${value} kb/s`, title]}
            />
            <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#color${dataKey})`} 
                isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const TrafficHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // Generate mock data for the last hour (60 minutes)
    const data = React.useMemo(() => {
        const now = new Date();
        return Array.from({ length: 60 }).map((_, i) => {
            const time = new Date(now.getTime() - (59 - i) * 60000);
            return {
                time: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                download: Math.floor(Math.random() * 500) + 100 + (Math.sin(i / 5) * 50), 
                upload: Math.floor(Math.random() * 200) + 50 + (Math.cos(i / 5) * 30)
            };
        });
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#151515] w-full max-w-5xl rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a1a]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Trafic Réseau
                            <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">Dernière heure</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Historique détaillé des débits montant et descendant</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 min-h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDownloadHistory" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorUploadHistory" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="time" 
                                stroke="#4b5563" 
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis 
                                stroke="#4b5563" 
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value} Mb/s`}
                            />
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.4} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Area 
                                type="monotone" 
                                dataKey="download" 
                                name="Descendant"
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorDownloadHistory)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="upload" 
                                name="Montant"
                                stroke="#10b981" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorUploadHistory)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};