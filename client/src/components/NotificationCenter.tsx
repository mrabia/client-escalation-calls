/**
 * MOJAVOX Notification Center
 * Real-time notification UI component
 * 
 * Frontend-only implementation - ready for WebSocket backend integration
 * See /docs/BACKEND_NOTIFICATION_SPEC.md for backend implementation guide
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Phone,
  DollarSign,
  AlertTriangle,
  Bot,
  Target,
  Clock,
  Trash2,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Notification types
export type NotificationType = 
  | 'payment_received'
  | 'call_completed'
  | 'call_escalation'
  | 'agent_alert'
  | 'campaign_milestone'
  | 'system_alert'
  | 'high_value_call';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
  actionUrl?: string;
}

// Notification icon mapping
const notificationIcons: Record<NotificationType, React.ElementType> = {
  payment_received: DollarSign,
  call_completed: Phone,
  call_escalation: AlertTriangle,
  agent_alert: Bot,
  campaign_milestone: Target,
  system_alert: AlertTriangle,
  high_value_call: DollarSign,
};

// Priority colors
const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-neon-blue',
  high: 'text-neon-yellow',
  critical: 'text-neon-pink',
};

// Context for notification state
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  paymentAlerts: boolean;
  callAlerts: boolean;
  agentAlerts: boolean;
  campaignAlerts: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  desktop: true,
  paymentAlerts: true,
  callAlerts: true,
  agentAlerts: true,
  campaignAlerts: true,
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Mock notifications for demo
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'payment_received',
    title: 'Payment Received',
    message: 'John Smith paid $2,450.00 on account #AC-2024-1234',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    priority: 'high',
    data: { amount: 2450, accountId: 'AC-2024-1234' },
    actionUrl: '/payment-history',
  },
  {
    id: '2',
    type: 'call_escalation',
    title: 'Call Escalation Required',
    message: 'NOVA-01 requests supervisor intervention on call with Maria Garcia',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
    priority: 'critical',
    data: { agentId: 'NOVA-01', debtorName: 'Maria Garcia' },
    actionUrl: '/live-monitor',
  },
  {
    id: '3',
    type: 'campaign_milestone',
    title: 'Campaign Milestone',
    message: 'Q1 2026 Recovery campaign reached 50% of target',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
    priority: 'medium',
    data: { campaignId: 'Q1-2026', progress: 50 },
    actionUrl: '/campaigns',
  },
  {
    id: '4',
    type: 'agent_alert',
    title: 'Agent Performance Alert',
    message: 'APEX-02 success rate dropped below 60% in the last hour',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    read: true,
    priority: 'high',
    data: { agentId: 'APEX-02', successRate: 58 },
    actionUrl: '/fleet',
  },
];

// Notification Provider
interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('mojavox_notification_settings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });
  const [isConnected, setIsConnected] = useState(false);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('mojavox_notification_settings', JSON.stringify(settings));
  }, [settings]);

  // Request desktop notification permission
  useEffect(() => {
    if (settings.desktop && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [settings.desktop]);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!settings.enabled) return;

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Play sound
    if (settings.sound) {
      // In production, play actual notification sound
      console.log('[Notification] Sound played');
    }

    // Show desktop notification
    if (settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotification.title, {
        body: newNotification.message,
        icon: '/icons/icon-192x192.png',
        tag: newNotification.id,
      });
    }

    // Show toast
    toast(newNotification.title, {
      description: newNotification.message,
    });
  }, [settings]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Connect to WebSocket (mock implementation)
  const connect = useCallback(() => {
    console.log('[Notification] Connecting to WebSocket...');
    // In production, this would connect to the actual WebSocket server
    // See BACKEND_NOTIFICATION_SPEC.md for implementation details
    setIsConnected(true);
    toast.success('Connected to notification service');
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('[Notification] Disconnecting from WebSocket...');
    setIsConnected(false);
    toast.info('Disconnected from notification service');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (settings.enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        settings,
        updateSettings,
        isConnected,
        connect,
        disconnect,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Notification Item Component
function NotificationItem({ notification, onRead, onRemove }: {
  notification: Notification;
  onRead: () => void;
  onRemove: () => void;
}) {
  const Icon = notificationIcons[notification.type];
  const timeAgo = getTimeAgo(notification.timestamp);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-3 rounded-lg border transition-colors cursor-pointer group",
        notification.read
          ? "bg-muted/30 border-border"
          : "bg-muted/50 border-neon-green/20 hover:border-neon-green/40"
      )}
      onClick={onRead}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          notification.read ? "bg-muted" : "bg-neon-green/10"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            priorityColors[notification.priority]
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "font-medium text-sm",
              !notification.read && "text-foreground"
            )}>
              {notification.title}
            </span>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-neon-green" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {notification.priority === 'critical' && (
              <Badge variant="destructive" className="text-xs">Critical</Badge>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// Notification Panel Component
export function NotificationPanel({ onClose }: { onClose?: () => void }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    settings,
    updateSettings,
    isConnected,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <Card className="w-96 max-h-[500px] border-border bg-card shadow-xl">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-neon-green text-background">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-neon-green" : "bg-muted-foreground"
          )} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm">Enable Notifications</span>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => updateSettings({ enabled })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="text-sm">Sound</span>
                </div>
                <Switch
                  checked={settings.sound}
                  onCheckedChange={(sound) => updateSettings({ sound })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Payment Alerts</span>
                </div>
                <Switch
                  checked={settings.paymentAlerts}
                  onCheckedChange={(paymentAlerts) => updateSettings({ paymentAlerts })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Call Alerts</span>
                </div>
                <Switch
                  checked={settings.callAlerts}
                  onCheckedChange={(callAlerts) => updateSettings({ callAlerts })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <span className="text-sm">Agent Alerts</span>
                </div>
                <Switch
                  checked={settings.agentAlerts}
                  onCheckedChange={(agentAlerts) => updateSettings({ agentAlerts })}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Actions */}
              {notifications.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs h-7"
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs h-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}

              {/* Notification list */}
              <ScrollArea className="h-[350px]">
                <div className="p-3 space-y-2">
                  <AnimatePresence>
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={() => markAsRead(notification.id)}
                          onRemove={() => removeNotification(notification.id)}
                        />
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                      >
                        <BellOff className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Export for use in header
export function NotificationBell() {
  const { unreadCount, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-pink text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-muted-foreground rounded-full" />
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 z-50"
          >
            <NotificationPanel onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
