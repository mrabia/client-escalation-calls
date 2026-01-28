/**
 * Offline Detection Hook
 * Tracks online/offline status and provides caching utilities
 */

import { useState, useEffect, useCallback } from 'react';

interface OfflineState {
  isOnline: boolean;
  isOfflineReady: boolean;
  lastOnline: Date | null;
  pendingActions: number;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOfflineReady: false,
    lastOnline: null,
    pendingActions: 0,
  });

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
      }));
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if service worker is ready
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setState(prev => ({ ...prev, isOfflineReady: true }));
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache data for offline use
  const cacheData = useCallback(async (key: string, data: unknown) => {
    try {
      localStorage.setItem(`mojavox_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(<T,>(key: string, maxAge?: number): T | null => {
    try {
      const cached = localStorage.getItem(`mojavox_cache_${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (maxAge && Date.now() - timestamp > maxAge) {
        localStorage.removeItem(`mojavox_cache_${key}`);
        return null;
      }

      return data as T;
    } catch {
      return null;
    }
  }, []);

  // Queue action for when back online
  const queueOfflineAction = useCallback((action: { type: string; payload: unknown }) => {
    const queue = JSON.parse(localStorage.getItem('mojavox_offline_queue') || '[]');
    queue.push({ ...action, timestamp: Date.now() });
    localStorage.setItem('mojavox_offline_queue', JSON.stringify(queue));
    
    setState(prev => ({
      ...prev,
      pendingActions: queue.length,
    }));
  }, []);

  // Process offline queue
  const processOfflineQueue = useCallback(async (processor: (action: unknown) => Promise<void>) => {
    const queue = JSON.parse(localStorage.getItem('mojavox_offline_queue') || '[]');
    const failed: unknown[] = [];

    for (const action of queue) {
      try {
        await processor(action);
      } catch {
        failed.push(action);
      }
    }

    localStorage.setItem('mojavox_offline_queue', JSON.stringify(failed));
    setState(prev => ({
      ...prev,
      pendingActions: failed.length,
    }));
  }, []);

  // Clear all cached data
  const clearCache = useCallback(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mojavox_cache_'));
    keys.forEach(k => localStorage.removeItem(k));
    
    // Also clear service worker cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage('clearCache');
    }
  }, []);

  return {
    ...state,
    cacheData,
    getCachedData,
    queueOfflineAction,
    processOfflineQueue,
    clearCache,
  };
}
