/**
 * MOJAVOX Notifications Center
 * Style: Cyberpunk Corporate
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  DollarSign,
  Mail,
  Phone,
  Settings,
  Smartphone,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const initialNotifications = [
  { id: 1, type: "payment", title: "Payment Received", message: "ABC Corp paid $15,000", time: "5 min ago", read: false },
  { id: 2, type: "alert", title: "Agent Needs Assistance", message: "NOVA-01 flagged call #4521", time: "12 min ago", read: false },
  { id: 3, type: "call", title: "High-Value Call Completed", message: "Successfully negotiated $25,000 plan", time: "1 hour ago", read: true },
  { id: 4, type: "payment", title: "Payment Received", message: "XYZ Inc paid $8,500", time: "2 hours ago", read: true },
  { id: 5, type: "alert", title: "Compliance Alert", message: "Script deviation detected in call #4518", time: "3 hours ago", read: true },
];

const getIcon = (type: string) => {
  switch (type) {
    case "payment": return <DollarSign className="w-5 h-5 text-neon-green" />;
    case "alert": return <AlertTriangle className="w-5 h-5 text-neon-yellow" />;
    case "call": return <Phone className="w-5 h-5 text-neon-blue" />;
    default: return <Bell className="w-5 h-5" />;
  }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  
  // Notification settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    paymentAlerts: true,
    callAlerts: true,
    complianceAlerts: true,
    digestFrequency: "realtime",
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    toast.success("Marked as read");
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All marked as read", { 
      description: "All notifications have been marked as read" 
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setClearDialogOpen(false);
    toast.success("Notifications cleared", {
      description: "All notifications have been removed"
    });
  };

  const saveSettings = () => {
    toast.success("Settings saved", {
      description: "Your notification preferences have been updated"
    });
    setSettingsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-neon-yellow" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-neon-pink text-white">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Stay updated with your operations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setClearDialogOpen(true)}
            disabled={notifications.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSettingsDialogOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {notifications.length === 0 ? (
            <Card className="data-card">
              <CardContent className="p-8 text-center">
                <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notif) => (
              <Card key={notif.id} className={cn("data-card", !notif.read && "border-neon-green/30 bg-neon-green/5")}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{notif.title}</h3>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-neon-green" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{notif.time}</p>
                    {!notif.read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1" 
                        onClick={() => markAsRead(notif.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="mt-4 space-y-2">
          {notifications.filter(n => !n.read).length === 0 ? (
            <Card className="data-card">
              <CardContent className="p-8 text-center">
                <CheckCheck className="w-12 h-12 mx-auto mb-4 text-neon-green opacity-50" />
                <p className="text-muted-foreground">All caught up!</p>
              </CardContent>
            </Card>
          ) : (
            notifications.filter(n => !n.read).map((notif) => (
              <Card key={notif.id} className="data-card border-neon-green/30 bg-neon-green/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{notif.title}</h3>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{notif.time}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-1" 
                      onClick={() => markAsRead(notif.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-2">
          {notifications.filter(n => n.type === "payment").map((notif) => (
            <Card key={notif.id} className="data-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-neon-green" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                </div>
                <p className="text-sm text-muted-foreground">{notif.time}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-2">
          {notifications.filter(n => n.type === "alert").map((notif) => (
            <Card key={notif.id} className="data-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-neon-yellow" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                </div>
                <p className="text-sm text-muted-foreground">{notif.time}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-neon-blue" />
              Notification Settings
            </DialogTitle>
            <DialogDescription>
              Configure how you receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Delivery Methods */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Delivery Methods</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Label>Email Notifications</Label>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <Label>Push Notifications</Label>
                  </div>
                  <Switch 
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <Label>Sound Alerts</Label>
                  </div>
                  <Switch 
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, soundEnabled: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Alert Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Alert Types</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-neon-green" />
                    <Label>Payment Alerts</Label>
                  </div>
                  <Switch 
                    checked={settings.paymentAlerts}
                    onCheckedChange={(checked) => setSettings({ ...settings, paymentAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-neon-blue" />
                    <Label>Call Alerts</Label>
                  </div>
                  <Switch 
                    checked={settings.callAlerts}
                    onCheckedChange={(checked) => setSettings({ ...settings, callAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-neon-yellow" />
                    <Label>Compliance Alerts</Label>
                  </div>
                  <Switch 
                    checked={settings.complianceAlerts}
                    onCheckedChange={(checked) => setSettings({ ...settings, complianceAlerts: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Digest Frequency */}
            <div className="space-y-2">
              <Label>Email Digest Frequency</Label>
              <Select 
                value={settings.digestFrequency} 
                onValueChange={(v) => setSettings({ ...settings, digestFrequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={saveSettings}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-neon-pink" />
              Clear All Notifications
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all notifications? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={clearAllNotifications}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
