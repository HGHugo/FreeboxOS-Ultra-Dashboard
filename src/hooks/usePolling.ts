import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  interval: number;
  immediate?: boolean;
}

export const usePolling = (
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) => {
  const { enabled = true, interval, immediate = true } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Execute immediately if requested
    if (immediate) {
      savedCallback.current();
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      savedCallback.current();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, immediate]);

  // Pause when tab is hidden (optional optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (!document.hidden && enabled) {
        savedCallback.current();
        intervalRef.current = setInterval(() => {
          savedCallback.current();
        }, interval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval]);
};

// Hook for multiple polling intervals
interface PollingConfig {
  key: string;
  callback: () => void | Promise<void>;
  interval: number;
  enabled?: boolean;
}

export const useMultiPolling = (configs: PollingConfig[]) => {
  const intervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    configs.forEach(({ key, callback, interval, enabled = true }) => {
      // Clear existing interval for this key
      const existing = intervals.current.get(key);
      if (existing) {
        clearInterval(existing);
      }

      if (!enabled) return;

      // Execute immediately
      callback();

      // Set up new interval
      const id = setInterval(callback, interval);
      intervals.current.set(key, id);
    });

    return () => {
      intervals.current.forEach((id) => clearInterval(id));
      intervals.current.clear();
    };
  }, [configs]);
};