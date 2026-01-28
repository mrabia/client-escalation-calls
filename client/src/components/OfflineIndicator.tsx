/**
 * Offline Indicator Component
 * Shows offline status and pending sync actions
 */

import { useOffline } from '@/hooks/useOffline';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingActions } = useOffline();

  if (isOnline && pendingActions === 0) return null;

  return (
    <div className={`
      fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg
      flex items-center gap-2 text-sm font-medium
      animate-slide-in-left
      ${isOnline ? 'bg-neon-yellow/20 text-neon-yellow' : 'bg-destructive/20 text-destructive'}
    `}>
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You're offline</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingActions} actions...</span>
        </>
      )}
    </div>
  );
}
