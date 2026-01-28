/**
 * MOJAVOX API Integration Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - CRM integrations
 * - API key management
 * - Webhook configuration
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Code,
  Copy,
  Database,
  ExternalLink,
  Key,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "crm" | "accounting" | "communication" | "analytics";
  status: "connected" | "disconnected" | "pending";
  lastSync?: string;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  permissions: string[];
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggered?: string;
}

const availableIntegrations: Integration[] = [
  { id: "1", name: "Salesforce", description: "Sync debtors and campaigns with Salesforce CRM", icon: "SF", category: "crm", status: "connected", lastSync: "2026-01-27 14:30" },
  { id: "2", name: "HubSpot", description: "Connect with HubSpot for contact management", icon: "HS", category: "crm", status: "disconnected" },
  { id: "3", name: "Zoho CRM", description: "Integrate with Zoho CRM for lead tracking", icon: "ZO", category: "crm", status: "disconnected" },
  { id: "4", name: "QuickBooks", description: "Export payments and invoices to QuickBooks", icon: "QB", category: "accounting", status: "connected", lastSync: "2026-01-27 12:00" },
  { id: "5", name: "Xero", description: "Sync financial data with Xero accounting", icon: "XE", category: "accounting", status: "disconnected" },
  { id: "6", name: "Twilio", description: "SMS and voice integration for notifications", icon: "TW", category: "communication", status: "connected", lastSync: "2026-01-27 15:45" },
  { id: "7", name: "SendGrid", description: "Email delivery and tracking", icon: "SG", category: "communication", status: "pending" },
  { id: "8", name: "Google Analytics", description: "Track portal usage and conversion metrics", icon: "GA", category: "analytics", status: "disconnected" },
];

export default function APIIntegration() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>(availableIntegrations);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    { id: "1", name: "Production API Key", key: "mk_live_xxxxxxxxxxxxxxxxxxxxxxxx", createdAt: "2026-01-15", lastUsed: "2026-01-27", permissions: ["read", "write", "delete"] },
    { id: "2", name: "Development API Key", key: "mk_test_xxxxxxxxxxxxxxxxxxxxxxxx", createdAt: "2026-01-20", lastUsed: "2026-01-26", permissions: ["read", "write"] },
  ]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    { id: "1", name: "Payment Webhook", url: "https://api.example.com/webhooks/payment", events: ["payment.completed", "payment.failed"], active: true, lastTriggered: "2026-01-27 14:30" },
    { id: "2", name: "Campaign Webhook", url: "https://api.example.com/webhooks/campaign", events: ["campaign.started", "campaign.completed"], active: true, lastTriggered: "2026-01-26 09:15" },
  ]);
  const [showAPIKeyDialog, setShowAPIKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", events: [] as string[] });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "crm": return "bg-neon-blue/20 text-neon-blue";
      case "accounting": return "bg-neon-green/20 text-neon-green";
      case "communication": return "bg-neon-pink/20 text-neon-pink";
      case "analytics": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-neon-green/20 text-neon-green";
      case "disconnected": return "bg-muted text-muted-foreground";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleConnect = (integration: Integration) => {
    setIntegrations(integrations.map(i => 
      i.id === integration.id 
        ? { ...i, status: "connected" as const, lastSync: new Date().toLocaleString() }
        : i
    ));
    toast.success(`Connected to ${integration.name}`);
  };

  const handleDisconnectOld = (integration: Integration) => {
    setIntegrations(integrations.map(i => 
      i.id === integration.id 
        ? { ...i, status: "disconnected" as const, lastSync: undefined }
        : i
    ));
    toast.success(`Disconnected from ${integration.name}`);
  };

  const handleCreateAPIKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `mk_live_${Math.random().toString(36).substring(2, 26)}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: "Never",
      permissions: ["read", "write"],
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    setShowAPIKeyDialog(false);
    toast.success("API key created");
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<APIKey | null>(null);
  const [deleteWebhookDialogOpen, setDeleteWebhookDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [integrationToDisconnect, setIntegrationToDisconnect] = useState<Integration | null>(null);

  const handleDeleteKey = (key: APIKey) => {
    setKeyToDelete(key);
    setDeleteKeyDialogOpen(true);
  };

  const confirmDeleteKey = () => {
    if (keyToDelete) {
      setApiKeys(apiKeys.filter(k => k.id !== keyToDelete.id));
      toast.success("API key deleted", {
        description: `"${keyToDelete.name}" has been removed.`
      });
      setKeyToDelete(null);
    }
  };

  const handleCreateWebhook = () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const webhook: WebhookConfig = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      events: ["payment.completed"],
      active: true,
    };
    setWebhooks([...webhooks, webhook]);
    setNewWebhook({ name: "", url: "", events: [] });
    setShowWebhookDialog(false);
    toast.success("Webhook created");
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  const handleDeleteWebhook = (webhook: WebhookConfig) => {
    setWebhookToDelete(webhook);
    setDeleteWebhookDialogOpen(true);
  };

  const confirmDeleteWebhook = () => {
    if (webhookToDelete) {
      setWebhooks(webhooks.filter(w => w.id !== webhookToDelete.id));
      toast.success("Webhook deleted", {
        description: `"${webhookToDelete.name}" has been removed.`
      });
      setWebhookToDelete(null);
    }
  };

  const handleDisconnectIntegration = (integration: Integration) => {
    setIntegrationToDisconnect(integration);
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = () => {
    if (integrationToDisconnect) {
      setIntegrations(integrations.map(i => 
        i.id === integrationToDisconnect.id ? { ...i, status: "disconnected", lastSync: undefined } : i
      ));
      toast.success("Integration disconnected", {
        description: `${integrationToDisconnect.name} has been disconnected.`
      });
      setIntegrationToDisconnect(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-background" />
                </div>
                API & Integrations
              </h1>
              <p className="text-muted-foreground mt-1">Connect MOJAVOX with external services</p>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-neon-green" />
              Available Integrations
            </CardTitle>
            <CardDescription>Connect with CRM, accounting, and communication platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {integrations.map((integration) => (
                <StaggerItem key={integration.id}>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border hover:border-neon-green/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center text-background font-bold text-sm">
                        {integration.icon}
                      </div>
                      <Badge className={getStatusColor(integration.status)}>
                        {integration.status}
                      </Badge>
                    </div>
                    <h3 className="font-medium mb-1">{integration.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{integration.description}</p>
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Last sync: {integration.lastSync}
                      </p>
                    )}
                    {integration.status === "connected" ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info("Syncing...")}>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Sync
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-400" onClick={() => handleDisconnectIntegration(integration)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-neon-green text-background hover:bg-neon-green/90"
                        onClick={() => handleConnect(integration)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* API Keys */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-neon-blue" />
                    API Keys
                  </CardTitle>
                  <CardDescription>Manage your API access keys</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAPIKeyDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{key.name}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyKey(key.key)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDeleteKey(key)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded block mb-2">
                      {key.key.substring(0, 20)}...
                    </code>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Created: {key.createdAt}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-neon-pink" />
                    Webhooks
                  </CardTitle>
                  <CardDescription>Configure event notifications</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowWebhookDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{webhook.name}</span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.active}
                          onCheckedChange={() => handleToggleWebhook(webhook.id)}
                        />
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDeleteWebhook(webhook)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded block mb-2 truncate">
                      {webhook.url}
                    </code>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    {webhook.lastTriggered && (
                      <p className="text-xs text-muted-foreground">
                        Last triggered: {webhook.lastTriggered}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Documentation Link */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                  <Code className="w-6 h-6 text-background" />
                </div>
                <div>
                  <h3 className="font-medium">API Documentation</h3>
                  <p className="text-sm text-muted-foreground">Learn how to integrate MOJAVOX with your systems</p>
                </div>
              </div>
              <Link href="/docs">
                <Button variant="outline">
                  View Docs
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Create API Key Dialog */}
        <Dialog open={showAPIKeyDialog} onOpenChange={setShowAPIKeyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>Generate a new API key for external access</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAPIKeyDialog(false)}>Cancel</Button>
              <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={handleCreateAPIKey}>
                Create Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Webhook Dialog */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>Configure a new webhook endpoint</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Name</Label>
                <Input
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="e.g., Payment Notifications"
                />
              </div>
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://api.example.com/webhooks"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>Cancel</Button>
              <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={handleCreateWebhook}>
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete API Key Confirmation */}
        <ConfirmDialog
          open={deleteKeyDialogOpen}
          onOpenChange={setDeleteKeyDialogOpen}
          title="Delete API Key?"
          description={keyToDelete ? `Are you sure you want to delete "${keyToDelete.name}"? Any applications using this key will stop working.` : ""}
          confirmText="Delete Key"
          variant="danger"
          onConfirm={confirmDeleteKey}
        />

        {/* Delete Webhook Confirmation */}
        <ConfirmDialog
          open={deleteWebhookDialogOpen}
          onOpenChange={setDeleteWebhookDialogOpen}
          title="Delete Webhook?"
          description={webhookToDelete ? `Are you sure you want to delete "${webhookToDelete.name}"? You will stop receiving notifications at this endpoint.` : ""}
          confirmText="Delete Webhook"
          variant="danger"
          onConfirm={confirmDeleteWebhook}
        />

        {/* Disconnect Integration Confirmation */}
        <ConfirmDialog
          open={disconnectDialogOpen}
          onOpenChange={setDisconnectDialogOpen}
          title="Disconnect Integration?"
          description={integrationToDisconnect ? `Are you sure you want to disconnect ${integrationToDisconnect.name}? You can reconnect it later.` : ""}
          confirmText="Disconnect"
          variant="warning"
          onConfirm={confirmDisconnect}
        />
      </div>
    </PageTransition>
  );
}
