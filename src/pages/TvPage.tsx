import React, {useEffect, useState, useRef, useCallback} from 'react';
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
    X,
    Settings,
    Radio,
    Circle,
    RefreshCw
} from 'lucide-react';
import {useTvStore, useSystemStore} from '../stores';
import {EpgEntry} from '../stores/tvStore';
import {useAuthStore} from '../stores/authStore';
import {PermissionBanner} from '../components/ui/PermissionBanner';
import type {PvrRecording, PvrProgrammed} from '../types/api';

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

// Format date to YYYY-MM-DD using local timezone (not UTC)
const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Recording card component
const RecordingCard: React.FC<{
    recording: PvrRecording;
    onDelete: (id: number) => void;
}> = ({recording, onDelete}) => {
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
                        <span
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
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
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={12}/>
            {formatDate(recording.start)}
        </span>
                <span className="flex items-center gap-1">
          <Clock size={12}/>
                    {formatTime(recording.start)} - {formatTime(recording.end)}
        </span>
                <span className="flex items-center gap-1">
          <Video size={12}/>
                    {formatDuration(recording.duration)}
        </span>
                <span className="flex items-center gap-1">
          <HardDrive size={12}/>
                    {formatSize(recording.byte_size)}
        </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
        <span className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-400">
          {recording.channel_name || recording.channel_type} - {recording.channel_quality}
        </span>
                <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
                    <Play size={12}/>
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
}> = ({programmed, onDelete}) => {
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
                        <span
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
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
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={12}/>
            {formatDate(programmed.start)}
        </span>
                <span className="flex items-center gap-1">
          <Clock size={12}/>
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

// Tooltip component for program details
const ProgramTooltip: React.FC<{
    program: EpgEntry;
    visible: boolean;
    position: { x: number; y: number };
}> = ({program, visible, position}) => {
    if (!visible) return null;

    const startTime = new Date(program.date * 1000);
    const endTime = new Date((program.date + program.duration) * 1000);
    const formatTimeStr = (d: Date) => d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    const formatDateStr = (d: Date) => d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return (
        <div
            className="fixed z-50 max-w-xs bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl p-3 pointer-events-none"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-50%, -100%) translateY(-10px)'
            }}
        >
            <div className="text-xs text-gray-500 mb-1">
                {program.channelName} • {formatDateStr(startTime)} {formatTimeStr(startTime)} - {formatTimeStr(endTime)}
            </div>
            <div className="font-medium text-white text-sm">{program.title}</div>
            {program.category_name && (
                <div className="text-xs text-purple-400 mt-1">{program.category_name}</div>
            )}
            {program.desc && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-3">{program.desc}</p>
            )}
            <div className="text-[10px] text-gray-600 mt-2">Cliquer pour enregistrer</div>
        </div>
    );
};

// EPG Timeline component - Gantt-style TV guide
const EpgTimeline: React.FC<{
    programs: EpgEntry[];
    onRecord: (program: EpgEntry) => void;
    freeboxUrl: string;
    onLoadMore?: (timestamp: number) => void;
    onDateChange?: (timestamp: number) => void;
    timelineStartTimestamp: number;
    onTimelineStartChange: (timestamp: number) => void;
}> = ({programs, onRecord, freeboxUrl, onLoadMore, onDateChange, timelineStartTimestamp, onTimelineStartChange}) => {
    const [visibleChannels, setVisibleChannels] = useState(15);
    const [tooltip, setTooltip] = useState<{ program: EpgEntry; x: number; y: number } | null>(null);
    const [timelineHours, setTimelineHours] = useState(12); // Start with 12 hours
    const [channelFilter, setChannelFilter] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        // Initialize from timelineStartTimestamp using local date
        return formatDateForInput(new Date(timelineStartTimestamp * 1000));
    });

    // Sync selectedDate when timelineStartTimestamp changes from parent
    useEffect(() => {
        setSelectedDate(formatDateForInput(new Date(timelineStartTimestamp * 1000)));
    }, [timelineStartTimestamp]);

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false); // Ref for immediate check in scroll handler
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const channelListRef = useRef<HTMLDivElement>(null);
    const programListRef = useRef<HTMLDivElement>(null);
    const now = useRef(Math.floor(Date.now() / 1000)).current; // Stable reference for "now" line
    const syncingScroll = useRef(false);
    const initialScrollDone = useRef(false);
    const timelineHoursRef = useRef(timelineHours); // Ref to access current value in scroll handler

    // Timeline config: dynamic duration
    const timelineStart = timelineStartTimestamp;
    const timelineDuration = timelineHours * 60 * 60; // Dynamic hours in seconds
    const timelineEnd = timelineStart + timelineDuration;
    const pixelsPerMinute = 4; // Width per minute

    // Track which 2h slots have been loaded
    const loadedSlotsRef = useRef<Set<number>>(new Set());

    // Keep refs in sync with state
    useEffect(() => {
        timelineHoursRef.current = timelineHours;
    }, [timelineHours]);

    // Calculate visible time range based on scroll position
    const getVisibleTimeRange = useCallback(() => {
        if (!scrollContainerRef.current) return null;

        const container = scrollContainerRef.current;
        const scrollLeft = container.scrollLeft;
        const viewportWidth = container.clientWidth;

        // Convert pixels to time (pixelsPerMinute = 4)
        const visibleStartMinutes = scrollLeft / pixelsPerMinute;
        const visibleEndMinutes = (scrollLeft + viewportWidth) / pixelsPerMinute;

        const visibleStartTs = timelineStart + (visibleStartMinutes * 60);
        const visibleEndTs = timelineStart + (visibleEndMinutes * 60);

        return { visibleStartTs, visibleEndTs };
    }, [timelineStart, pixelsPerMinute]);

    // Check if we need to load more programs based on visible time range
    const checkAndLoadMore = useCallback(() => {
        if (loadingMoreRef.current) return;

        const visibleRange = getVisibleTimeRange();
        if (!visibleRange) return;

        const { visibleEndTs } = visibleRange;
        const currentHours = timelineHoursRef.current;

        // Check if visible end time is approaching or past the timeline end
        const bufferSeconds = 60 * 60; // 1 hour buffer
        const needsMoreTimeline = visibleEndTs + bufferSeconds > timelineEnd;

        // Extend timeline if needed (max 48 hours)
        if (needsMoreTimeline && currentHours < 48) {
            const newHours = Math.min(currentHours + 6, 48);
            setTimelineHours(newHours);
        }

        // Calculate which 2h slots are needed for visible range + buffer
        const EPG_INTERVAL = 2 * 60 * 60; // 2 hours
        const startSlot = Math.floor((visibleRange.visibleStartTs - bufferSeconds) / EPG_INTERVAL) * EPG_INTERVAL;
        const endSlot = Math.floor((visibleEndTs + bufferSeconds) / EPG_INTERVAL) * EPG_INTERVAL;

        // Find slots that haven't been loaded yet
        const slotsToLoad: number[] = [];
        for (let slot = startSlot; slot <= endSlot; slot += EPG_INTERVAL) {
            if (!loadedSlotsRef.current.has(slot)) {
                slotsToLoad.push(slot);
            }
        }

        // Load missing slots
        if (slotsToLoad.length > 0 && onLoadMore) {
            loadingMoreRef.current = true;
            setIsLoadingMore(true);

            // Mark slots as loading
            slotsToLoad.forEach(slot => loadedSlotsRef.current.add(slot));

            // Load each slot with a small delay between them
            const loadSlots = async () => {
                for (let i = 0; i < slotsToLoad.length; i++) {
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    onLoadMore(slotsToLoad[i]);
                }

                setTimeout(() => {
                    loadingMoreRef.current = false;
                    setIsLoadingMore(false);
                }, 500);
            };

            loadSlots();
        }
    }, [getVisibleTimeRange, timelineEnd, onLoadMore]);

    // Check on scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', checkAndLoadMore);
        return () => container.removeEventListener('scroll', checkAndLoadMore);
    }, [checkAndLoadMore]);

    // Also poll periodically as backup
    useEffect(() => {
        const interval = setInterval(checkAndLoadMore, 500);
        return () => clearInterval(interval);
    }, [checkAndLoadMore]);

    // Reset loaded slots when timeline start changes (date change)
    useEffect(() => {
        loadedSlotsRef.current.clear();
    }, [timelineStartTimestamp]);

    // Sync vertical scroll between channel list and program list
    const syncVerticalScroll = useCallback((source: 'channels' | 'programs') => {
        if (syncingScroll.current) return;
        syncingScroll.current = true;

        const channelList = channelListRef.current;
        const programList = programListRef.current;

        if (channelList && programList) {
            if (source === 'channels') {
                programList.scrollTop = channelList.scrollTop;
            } else {
                channelList.scrollTop = programList.scrollTop;
            }
        }

        requestAnimationFrame(() => {
            syncingScroll.current = false;
        });
    }, []);

    useEffect(() => {
        const channelList = channelListRef.current;
        const programList = programListRef.current;

        const handleChannelScroll = () => syncVerticalScroll('channels');
        const handleProgramScroll = () => syncVerticalScroll('programs');

        if (channelList) {
            channelList.addEventListener('scroll', handleChannelScroll);
        }
        if (programList) {
            programList.addEventListener('scroll', handleProgramScroll);
        }

        return () => {
            if (channelList) {
                channelList.removeEventListener('scroll', handleChannelScroll);
            }
            if (programList) {
                programList.removeEventListener('scroll', handleProgramScroll);
            }
        };
    }, [syncVerticalScroll]);

    // Group programs by channel
    const channelsMap = new Map<string, {
        uuid: string;
        name: string;
        logo?: string;
        number?: number;
        programs: EpgEntry[]
    }>();

    programs.forEach(program => {
        const endTime = program.date + program.duration;
        // Only include programs that overlap with our timeline window
        if (endTime > timelineStart && program.date < timelineEnd) {
            if (!channelsMap.has(program.channelUuid)) {
                channelsMap.set(program.channelUuid, {
                    uuid: program.channelUuid,
                    name: program.channelName || 'Chaîne',
                    logo: program.channelLogo,
                    number: program.channelNumber,
                    programs: []
                });
            }
            channelsMap.get(program.channelUuid)!.programs.push(program);
        }
    });

    // Sort channels by number and convert to array
    // Also sort and deduplicate programs within each channel
    const channels = Array.from(channelsMap.values())
        .map(channel => {
            // Sort programs by start time
            channel.programs.sort((a, b) => a.date - b.date);

            // Deduplicate by program ID and remove overlapping programs
            const seenIds = new Set<string>();
            const deduped: EpgEntry[] = [];

            for (const program of channel.programs) {
                // Skip if we've already seen this program ID
                if (seenIds.has(program.id)) continue;
                seenIds.add(program.id);

                const lastProgram = deduped[deduped.length - 1];
                // Skip if this program overlaps with the previous one
                if (lastProgram && program.date < lastProgram.date + lastProgram.duration) {
                    continue;
                }

                deduped.push(program);
            }
            channel.programs = deduped;

            return channel;
        })
        .filter(channel => {
            if (!channelFilter) return true;
            const filter = channelFilter.toLowerCase();
            return channel.name.toLowerCase().includes(filter) ||
                (channel.number && channel.number.toString().includes(filter));
        })
        .sort((a, b) => (a.number || 999) - (b.number || 999));

    // Handle date change
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);

        // Convert date to timestamps
        const [year, month, day] = newDate.split('-').map(Number);
        const midnightObj = new Date(year, month - 1, day, 0, 0, 0, 0);
        const midnightTimestamp = Math.floor(midnightObj.getTime() / 1000);

        // Update timeline display to start at midnight
        onTimelineStartChange(midnightTimestamp);

        // Reset scroll position flag to scroll to beginning
        initialScrollDone.current = false;

        if (onDateChange) {
            // Pass midnight timestamp for EPG loading
            // The EPG loader will handle fetching enough data to cover the timeline
            onDateChange(midnightTimestamp);
        }
    };

    // Generate time markers (every 30 minutes)
    const timeMarkers: { time: number; label: string; dateLabel?: string }[] = [];
    let markerTime = Math.floor(timelineStart / (30 * 60)) * (30 * 60); // Round to nearest 30 min
    while (markerTime <= timelineEnd) {
        if (markerTime >= timelineStart) {
            const date = new Date(markerTime * 1000);
            const dateStr = date.toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'});
            const timeStr = date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
            const hours = date.getHours();
            const minutes = date.getMinutes();

            // Show date label every 2 hours (at 00:00, 02:00, 04:00, etc.)
            const showDate = minutes === 0 && hours % 2 === 0;

            timeMarkers.push({
                time: markerTime,
                label: timeStr,
                dateLabel: showDate ? dateStr : undefined
            });
        }
        markerTime += 30 * 60;
    }

    // Check if we need to load more channels based on vertical scroll
    const checkLoadMoreChannels = useCallback(() => {
        const channelList = channelListRef.current;
        const programList = programListRef.current;

        // Check either container
        const container = channelList || programList;
        if (!container) return;

        const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

        // Load more when approaching the bottom (within 200px)
        if (scrollBottom < 200 && visibleChannels < channels.length) {
            setVisibleChannels(prev => Math.min(prev + 10, channels.length));
        }
    }, [visibleChannels, channels.length]);

    // Attach vertical scroll listeners for lazy loading channels
    useEffect(() => {
        const channelList = channelListRef.current;
        const programList = programListRef.current;

        if (channelList) {
            channelList.addEventListener('scroll', checkLoadMoreChannels);
        }
        if (programList) {
            programList.addEventListener('scroll', checkLoadMoreChannels);
        }

        return () => {
            if (channelList) {
                channelList.removeEventListener('scroll', checkLoadMoreChannels);
            }
            if (programList) {
                programList.removeEventListener('scroll', checkLoadMoreChannels);
            }
        };
    }, [checkLoadMoreChannels]);

    // Also use Intersection Observer as backup
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleChannels < channels.length) {
                    setVisibleChannels(prev => Math.min(prev + 10, channels.length));
                }
            },
            {threshold: 0.1}
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [visibleChannels, channels.length]);

    // Scroll to appropriate position on mount or date change
    useEffect(() => {
        if (scrollContainerRef.current && !initialScrollDone.current) {
            initialScrollDone.current = true;

            // Check if "now" is within the visible timeline
            const isNowVisible = now >= timelineStart && now <= timelineEnd;

            if (isNowVisible) {
                // Scroll to current time
                const nowOffset = ((now - timelineStart) / 60) * pixelsPerMinute;
                scrollContainerRef.current.scrollLeft = Math.max(0, nowOffset - 100);
            } else {
                // Scroll to beginning of timeline
                scrollContainerRef.current.scrollLeft = 0;
            }
        }
    }, [now, timelineStart, timelineEnd, pixelsPerMinute]);

    const getPositionStyle = (program: EpgEntry) => {
        // Calculate visible portion of the program within the timeline window
        const visibleStart = Math.max(program.date, timelineStart);
        const visibleEnd = Math.min(program.date + program.duration, timelineEnd);
        const visibleDuration = visibleEnd - visibleStart;

        // Position from the start of timeline
        const left = ((visibleStart - timelineStart) / 60) * pixelsPerMinute;
        const width = Math.max(50, (visibleDuration / 60) * pixelsPerMinute - 2); // Min 50px, -2 for gap

        return {left: `${left}px`, width: `${width}px`};
    };

    const isLive = (program: EpgEntry) => {
        const endTime = program.date + program.duration;
        return now >= program.date && now < endTime;
    };

    const isNowVisible = now >= timelineStart && now <= timelineEnd;
    const nowLinePosition = isNowVisible ? ((now - timelineStart) / 60) * pixelsPerMinute : -1;

    const timelineWidth = (timelineDuration / 60) * pixelsPerMinute;

    return (
        <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#0a0a0a]">
            {/* Filter bar */}
            <div className="flex items-center gap-3 p-3 bg-[#151515] border-b border-gray-800">
                <div className="flex-1 max-w-xs">
                    <input
                        type="text"
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        placeholder="Filtrer les chaînes..."
                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Date:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="px-3 py-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                    />
                </div>
                <span className="text-xs text-gray-500">
          {channels.length} chaîne{channels.length > 1 ? 's' : ''}
        </span>
            </div>

            <div className="flex relative">
                {/* Fixed channel column */}
                <div className="flex-shrink-0 w-32 md:w-40">
                    {/* Channel header */}
                    <div
                        className="h-12 bg-[#151515] p-2 flex items-end text-xs text-gray-500 font-medium border-b border-r border-gray-800">
                        Chaîne
                    </div>
                    {/* Channel list - scrolls vertically only */}
                    <div ref={channelListRef} className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
                        {channels.slice(0, visibleChannels).map((channel) => (
                            <div
                                key={channel.uuid}
                                className="h-14 p-2 flex items-center gap-2 border-b border-r border-gray-800 bg-[#0f0f0f] hover:bg-[#111]"
                            >
                                <div
                                    className="w-8 h-8 rounded bg-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {channel.logo ? (
                                        <img
                                            src={`${freeboxUrl}${channel.logo}`}
                                            alt=""
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <Tv size={14} className="text-gray-600"/>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    {channel.number && (
                                        <span className="text-[10px] text-gray-600 font-medium">{channel.number}</span>
                                    )}
                                    <p className="text-xs text-white truncate">{channel.name}</p>
                                </div>
                            </div>
                        ))}
                        {/* Load more trigger */}
                        {visibleChannels < channels.length && (
                            <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                                <Loader2 size={20} className="text-gray-600 animate-spin"/>
                                <span className="ml-2 text-xs text-gray-500">
                  {visibleChannels}/{channels.length}
                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable timeline area - single scroll for header + all channels */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-700"
                >
                    <div style={{width: `${timelineWidth}px`}}>
                        {/* Time markers header */}
                        <div className="relative h-12 border-b border-gray-800 bg-[#0a0a0a]">
                            {timeMarkers.map((marker) => (
                                <div
                                    key={marker.time}
                                    className="absolute top-0 h-full flex flex-col justify-end pb-0.5 border-l border-gray-700 pl-1"
                                    style={{left: `${((marker.time - timelineStart) / 60) * pixelsPerMinute}px`}}
                                >
                                    {marker.dateLabel && (
                                        <span
                                            className="text-[10px] text-purple-400 font-medium whitespace-nowrap leading-tight">
                      {marker.dateLabel}
                    </span>
                                    )}
                                    <span className="text-xs text-gray-500 leading-tight">{marker.label}</span>
                                </div>
                            ))}
                            {/* Current time line in header */}
                            {isNowVisible && (
                                <div
                                    className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
                                    style={{left: `${nowLinePosition}px`}}
                                />
                            )}
                        </div>

                        {/* Channel programs - scrolls vertically with channel list */}
                        <div ref={programListRef} className="max-h-[60vh] overflow-y-auto">
                            {channels.slice(0, visibleChannels).map((channel) => (
                                <div
                                    key={channel.uuid}
                                    className="relative h-14 border-b border-gray-800/50 hover:bg-[#111]/50"
                                >
                                    {/* Current time line */}
                                    {isNowVisible && (
                                        <div
                                            className="absolute top-0 h-full w-0.5 bg-red-500/30 z-10 pointer-events-none"
                                            style={{left: `${nowLinePosition}px`}}
                                        />
                                    )}

                                    {channel.programs.map((program) => {
                                        const style = getPositionStyle(program);
                                        const live = isLive(program);

                                        return (
                                            <button
                                                key={`${program.id}-${program.date}`}
                                                onClick={() => onRecord(program)}
                                                onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setTooltip({
                                                        program,
                                                        x: rect.left + rect.width / 2,
                                                        y: rect.top
                                                    });
                                                }}
                                                onMouseLeave={() => setTooltip(null)}
                                                className={`absolute top-1 h-12 rounded px-1.5 text-left overflow-hidden transition-colors ${
                                                    live
                                                        ? 'bg-red-900/40 border border-red-500/50 hover:bg-red-900/60'
                                                        : 'bg-[#1a1a1a] border border-gray-700 hover:border-purple-500 hover:bg-[#1f1f1f]'
                                                }`}
                                                style={style}
                                            >
                                                <div className="flex items-center gap-1 h-full">
                                                    {live && (
                                                        <Circle size={5}
                                                                className="text-red-400 fill-current flex-shrink-0"/>
                                                    )}
                                                    <span
                                                        className="text-[11px] font-medium text-white truncate leading-tight">
                            {program.title}
                          </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Loading indicator - fixed position overlay */}
                {isLoadingMore && (
                    <div
                        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pointer-events-none z-20"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 size={24} className="text-purple-400 animate-spin"/>
                            <span className="text-[10px] text-gray-400 font-medium">Chargement...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <ProgramTooltip
                    program={tooltip.program}
                    visible={true}
                    position={{x: tooltip.x, y: tooltip.y}}
                />
            )}
        </div>
    );
};

// EPG Program Card component
const EpgProgramCard: React.FC<{
    program: EpgEntry;
    onRecord: (program: EpgEntry) => void;
    freeboxUrl: string;
}> = ({program, onRecord, freeboxUrl}) => {
    const now = Math.floor(Date.now() / 1000);
    const endTime = program.date + program.duration;
    const isLive = now >= program.date && now < endTime;
    const progress = isLive ? ((now - program.date) / program.duration) * 100 : 0;

    return (
        <div className={`bg-[#1a1a1a] rounded-xl border p-4 transition-colors ${
            isLive ? 'border-red-500/50' : 'border-gray-800 hover:border-gray-700'
        }`}>
            <div className="flex gap-3">
                {/* Channel logo */}
                <div
                    className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center">
                    {program.channelLogo ? (
                        <img
                            src={`${freeboxUrl}${program.channelLogo}`}
                            alt={program.channelName || ''}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <Tv size={20} className="text-gray-600"/>
                    )}
                </div>

                {/* Program info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                {isLive && (
                                    <span
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 font-medium">
                    <Circle size={6} className="fill-current"/>
                    EN DIRECT
                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                  {program.channelNumber && `${program.channelNumber}. `}{program.channelName}
                </span>
                            </div>
                            <h3 className="font-medium text-white truncate mt-1">{program.title}</h3>
                            {program.category_name && (
                                <span className="text-xs text-purple-400">{program.category_name}</span>
                            )}
                        </div>
                        <button
                            onClick={() => onRecord(program)}
                            className="flex-shrink-0 p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                            title="Programmer l'enregistrement"
                        >
                            <Circle size={14} className="fill-current"/>
                        </button>
                    </div>

                    {/* Time info */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12}/>
                {formatTime(program.date)} - {formatTime(endTime)}
            </span>
                        <span>{formatDuration(program.duration)}</span>
                    </div>

                    {/* Live progress bar */}
                    {isLive && (
                        <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-1000"
                                style={{width: `${progress}%`}}
                            />
                        </div>
                    )}

                    {/* Description */}
                    {program.desc && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{program.desc}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// PVR Config modal
const PvrConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentConfig: { margin_before: number; margin_after: number } | null;
    onSave: (config: { margin_before: number; margin_after: number }) => Promise<boolean>;
}> = ({isOpen, onClose, currentConfig, onSave}) => {
    const [marginBefore, setMarginBefore] = useState(0);
    const [marginAfter, setMarginAfter] = useState(0);
    const [saving, setSaving] = useState(false);

    // Initialize form with current config (convert seconds to minutes for display)
    React.useEffect(() => {
        if (currentConfig && isOpen) {
            setMarginBefore(Math.floor(currentConfig.margin_before / 60));
            setMarginAfter(Math.floor(currentConfig.margin_after / 60));
        }
    }, [currentConfig, isOpen]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Convert minutes back to seconds for API
            const success = await onSave({
                margin_before: marginBefore * 60,
                margin_after: marginAfter * 60
            });
            if (success) {
                onClose();
            }
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#151515] w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Configuration PVR</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
                        <X size={20}/>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-400">
                        Configurez les marges par défaut pour les enregistrements. Ces marges permettent de commencer
                        l'enregistrement avant l'heure prévue et de le terminer après.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-2">Marge avant (minutes)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="30"
                                    value={marginBefore}
                                    onChange={(e) => setMarginBefore(parseInt(e.target.value))}
                                    className="flex-1 accent-purple-500"
                                />
                                <span className="w-12 text-center text-white font-medium">{marginBefore}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">Démarre {marginBefore} min avant</p>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-2">Marge après (minutes)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="60"
                                    value={marginAfter}
                                    onChange={(e) => setMarginAfter(parseInt(e.target.value))}
                                    className="flex-1 accent-purple-500"
                                />
                                <span className="w-12 text-center text-white font-medium">{marginAfter}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">Termine {marginAfter} min après</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin"/>}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

// Recording form modal
const RecordingFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<PvrProgrammed>) => Promise<boolean>;
    channels: { uuid: string; name: string; number: number }[];
    prefillProgram?: EpgEntry | null;
}> = ({isOpen, onClose, onSave, channels, prefillProgram}) => {
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

    // Initialize form - with prefill data from EPG or defaults
    React.useEffect(() => {
        if (!isOpen) return;

        if (prefillProgram) {
            // Pre-fill from EPG program
            const startDate = new Date(prefillProgram.date * 1000);
            const endDate = new Date((prefillProgram.date + prefillProgram.duration) * 1000);

            setFormData({
                name: prefillProgram.title,
                channel_uuid: prefillProgram.channelUuid,
                channel_type: 'tnt',
                channel_quality: 'hd',
                start_date: formatDateForInput(startDate),
                start_time: startDate.toTimeString().slice(0, 5),
                end_time: endDate.toTimeString().slice(0, 5),
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
        } else {
            // Default values
            const now = new Date();
            const dateStr = formatDateForInput(now);
            const timeStr = now.toTimeString().slice(0, 5);
            const endTime = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
            setFormData(prev => ({
                ...prev,
                name: '',
                channel_uuid: channels[0]?.uuid || '',
                start_date: dateStr,
                start_time: timeStr,
                end_time: endTime
            }));
        }
    }, [isOpen, prefillProgram, channels]);

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
            <div
                className="bg-[#151515] w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div
                    className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-[#151515]">
                    <h2 className="text-lg font-bold text-white">Programmer un enregistrement</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
                        <X size={20}/>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Nom de l'enregistrement</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            placeholder="Mon émission"
                        />
                    </div>

                    {/* Channel */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Chaîne</label>
                        <select
                            value={formData.channel_uuid}
                            onChange={(e) => setFormData({...formData, channel_uuid: e.target.value})}
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
                                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Début</label>
                            <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Fin</label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
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
                                onChange={(e) => setFormData({
                                    ...formData,
                                    margin_before: parseInt(e.target.value) || 0
                                })}
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
                                onChange={(e) => setFormData({
                                    ...formData,
                                    margin_after: parseInt(e.target.value) || 0
                                })}
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
                                {key: 'repeat_monday', label: 'Lun'},
                                {key: 'repeat_tuesday', label: 'Mar'},
                                {key: 'repeat_wednesday', label: 'Mer'},
                                {key: 'repeat_thursday', label: 'Jeu'},
                                {key: 'repeat_friday', label: 'Ven'},
                                {key: 'repeat_saturday', label: 'Sam'},
                                {key: 'repeat_sunday', label: 'Dim'}
                            ].map(({key, label}) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({
                                        ...formData,
                                        [key]: !formData[key as keyof typeof formData]
                                    })}
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
                        {saving && <Loader2 size={16} className="animate-spin"/>}
                        Programmer
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TvPage: React.FC<TvPageProps> = ({onBack}) => {
    const {info: systemInfo} = useSystemStore();
    const {
        channels,
        recordings,
        programmed,
        pvrConfig,
        epgPrograms,
        epgLoading,
        epgRateLimited,
        epgRateLimitedUntil,
        isLoading,
        error,
        fetchChannels,
        fetchRecordings,
        fetchProgrammed,
        fetchPvrConfig,
        fetchEpgByTime,
        clearEpgCache,
        clearRateLimit,
        deleteRecording,
        deleteProgrammed,
        createProgrammed,
        updatePvrConfig
    } = useTvStore();

    // Get permissions from auth store
    const {permissions, freeboxUrl} = useAuthStore();
    const hasPvrPermission = permissions.pvr === true;

    const [activeTab, setActiveTab] = useState<'guide' | 'recordings' | 'programmed'>('recordings');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showRecordingForm, setShowRecordingForm] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [recordingFromEpg, setRecordingFromEpg] = useState<EpgEntry | null>(null);
    const [epgStartTimestamp, setEpgStartTimestamp] = useState<number | null>(null);
    // Timeline start timestamp - controls what time period is displayed
    const [timelineStartTimestamp, setTimelineStartTimestamp] = useState(() => {
        // Default: 30 min before now
        return Math.floor(Date.now() / 1000) - (30 * 60);
    });

    // Check if PVR is available (requires disk)
    const hasDisk = systemInfo?.disk_status === 'active' || systemInfo?.user_main_storage;

    // Fetch data on mount
    useEffect(() => {
        fetchChannels();
        if (hasDisk) {
            fetchRecordings();
            fetchProgrammed();
            fetchPvrConfig();
        }
    }, [hasDisk, fetchChannels, fetchRecordings, fetchProgrammed, fetchPvrConfig]);

    // Fetch EPG when Guide tab is active and channels are loaded
    // Load multiple timestamps to get more programs across the timeline
    useEffect(() => {
        if (activeTab === 'guide' && channels.length > 0 && !epgRateLimited) {
            const EPG_INTERVAL = 2 * 60 * 60; // 2 hours - must match server interval
            const baseTs = epgStartTimestamp || Math.floor(Date.now() / 1000);

            // Start 4 hours before the requested time to get programs that are "in progress" at midnight
            // The API returns programs that are playing at the requested time, not starting after it
            const startTs = baseTs - (2 * EPG_INTERVAL); // 4 hours before

            let cancelled = false;

            const loadData = async () => {
                // Load from 4 hours before to 12 hours after (total 8 requests covering 16 hours)
                for (let i = 0; i <= 8; i++) {
                    if (cancelled) break;
                    if (i > 0) {
                        // Wait 500ms between requests
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    if (cancelled) break;
                    const result = await fetchEpgByTime(startTs + i * EPG_INTERVAL, i > 0);
                    if (result.rateLimited) break; // Stop on rate limit
                }
            };
            loadData();

            return () => {
                cancelled = true;
            };
        }
    }, [activeTab, channels.length, fetchEpgByTime, epgStartTimestamp, epgRateLimited]);

    const handleDeleteRecording = async (id: number) => {
        await deleteRecording(id);
    };

    const handleDeleteProgrammed = async (id: number) => {
        await deleteProgrammed(id);
    };

    // Handle recording from EPG
    const handleRecordFromEpg = (program: EpgEntry) => {
        setRecordingFromEpg(program);
        setShowRecordingForm(true);
    };

    // Refresh EPG
    const handleRefreshEpg = () => {
        fetchEpgByTime();
    };

    // Load more EPG programs (for horizontal scroll)
    const handleLoadMoreEpg = useCallback((timestamp: number) => {
        fetchEpgByTime(timestamp, true); // merge=true to append data
    }, [fetchEpgByTime]);

    // Handle date change from timeline
    const handleEpgDateChange = useCallback((timestamp: number) => {
        clearEpgCache(); // Clear cache when changing date to force reload
        setEpgStartTimestamp(timestamp);
    }, [clearEpgCache]);

    // Handle timeline start change (when user changes date in the timeline)
    const handleTimelineStartChange = useCallback((timestamp: number) => {
        setTimelineStartTimestamp(timestamp);
    }, []);

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
                                <ChevronLeft size={24}/>
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Tv size={24} className="text-purple-400"/>
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
                                <Grid size={20}/>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-gray-700 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                <List size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
                {/* No disk warning */}
                {!hasDisk && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <HardDrive size={64} className="text-gray-600 mb-4"/>
                        <h2 className="text-xl font-semibold text-white mb-2">Aucun disque détecté</h2>
                        <p className="text-gray-500 text-center max-w-md">
                            Connectez un disque dur à votre Freebox pour utiliser la fonctionnalité d'enregistrement TV
                            (PVR).
                        </p>
                    </div>
                )}

                {/* PVR Config Panel */}
                {hasDisk && (
                    <div className="mb-6 p-4 bg-[#151515] border border-gray-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowConfigModal(true)}
                                    className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
                                    title="Configurer les marges"
                                >
                                    <Settings size={20} className="text-emerald-400"/>
                                </button>
                                <div>
                                    <h3 className="font-medium text-white">Enregistreur PVR</h3>
                                    {pvrConfig ? (
                                        <button
                                            onClick={() => setShowConfigModal(true)}
                                            className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                                        >
                                            Marges: -{Math.floor(pvrConfig.margin_before / 60)}min /
                                            +{Math.floor(pvrConfig.margin_after / 60)}min
                                        </button>
                                    ) : (
                                        <p className="text-xs text-gray-500">Chargement...</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {channels.length > 0 && (
                                    <button
                                        onClick={() => setShowRecordingForm(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                        <Plus size={14}/>
                                        Programmer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs - Always show Guide tab, others only with disk */}
                <div className="flex items-center gap-4 mb-6 border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === 'guide'
                                ? 'text-red-400 border-red-400'
                                : 'text-gray-400 border-transparent hover:text-white'
                        }`}
                    >
            <span className="flex items-center gap-2">
              <Radio size={16}/>
              Guide TV
            </span>
                    </button>
                    {hasDisk && (
                        <>
                            <button
                                onClick={() => setActiveTab('recordings')}
                                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                    activeTab === 'recordings'
                                        ? 'text-purple-400 border-purple-400'
                                        : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                            >
                <span className="flex items-center gap-2">
                  <Video size={16}/>
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
                  <Calendar size={16}/>
                  Programmés ({programmed.length})
                </span>
                            </button>
                        </>
                    )}
                </div>

                {/* Guide TV tab */}
                {activeTab === 'guide' && (
                    <>
                        {/* Rate limit warning */}
                        {epgRateLimited && (
                            <div
                                className="mb-4 p-3 bg-orange-900/20 border border-orange-700/50 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="text-orange-400 flex-shrink-0" size={20}/>
                                    <div>
                                        <p className="text-orange-400 font-medium text-sm">Limite de requêtes
                                            atteinte</p>
                                        <p className="text-orange-400/70 text-xs">

                                            Veuillez patienter quelques secondes avant de rafraîchir. <br/>
                                            (L'API de récupération du guide TV (EPG) limite les requêtes de façon
                                            drastique).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={clearRateLimit}
                                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                    Réessayer
                                </button>
                            </div>
                        )}

                        {/* Refresh button */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-500">
                                {epgPrograms.length} programmes
                                sur {new Set(epgPrograms.map(p => p.channelUuid)).size} chaînes
                            </p>
                            <button
                                onClick={handleRefreshEpg}
                                disabled={epgLoading || epgRateLimited}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={epgLoading ? 'animate-spin' : ''}/>
                                Actualiser
                            </button>
                        </div>

                        {epgLoading && epgPrograms.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={32} className="text-red-400 animate-spin"/>
                            </div>
                        ) : epgPrograms.length > 0 ? (
                            <EpgTimeline
                                programs={epgPrograms}
                                onRecord={handleRecordFromEpg}
                                freeboxUrl={freeboxUrl}
                                onLoadMore={handleLoadMoreEpg}
                                onDateChange={handleEpgDateChange}
                                timelineStartTimestamp={timelineStartTimestamp}
                                onTimelineStartChange={handleTimelineStartChange}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Radio size={48} className="text-gray-600 mb-4"/>
                                <h3 className="text-lg font-medium text-white mb-2">Aucun programme disponible</h3>
                                <p className="text-gray-500 text-center max-w-md">
                                    Le guide des programmes n'est pas disponible pour le moment.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {hasDisk && (
                    <>

                        {/* Error message */}
                        {error && (
                            <div
                                className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center gap-3">
                                <AlertCircle className="text-red-400 flex-shrink-0"/>
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Loading state */}
                        {isLoading && (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={32} className="text-purple-400 animate-spin"/>
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
                                        <Video size={48} className="text-gray-600 mb-4"/>
                                        <h3 className="text-lg font-medium text-white mb-2">Aucun enregistrement</h3>
                                        <p className="text-gray-500 text-center max-w-md">
                                            Vos enregistrements TV apparaîtront ici. Programmez un enregistrement depuis
                                            le guide TV.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Programmed tab */}
                        {!isLoading && activeTab === 'programmed' && (
                            <>
                                {/* Permission warning */}
                                {!hasPvrPermission && (
                                    <PermissionBanner permission="pvr" freeboxUrl={freeboxUrl}/>
                                )}

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
                                        <Calendar size={48} className="text-gray-600 mb-4"/>
                                        <h3 className="text-lg font-medium text-white mb-2">Aucune programmation</h3>
                                        <p className="text-gray-500 text-center max-w-md">
                                            Programmez des enregistrements depuis le guide des programmes dans Freebox
                                            OS.
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
                onClose={() => {
                    setShowRecordingForm(false);
                    setRecordingFromEpg(null);
                }}
                onSave={createProgrammed}
                channels={channels}
                prefillProgram={recordingFromEpg}
            />

            {/* PVR Config Modal */}
            <PvrConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
                currentConfig={pvrConfig}
                onSave={updatePvrConfig}
            />
        </div>
    );
};

export default TvPage;