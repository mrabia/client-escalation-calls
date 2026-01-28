/**
 * MOJAVOX Settings Page
 * Style: Cyberpunk Corporate
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  Bell,
  Building,
  Check,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Globe,
  Key,
  Link2,
  Lock,
  Mail,
  Phone,
  Plus,
  Save,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { TourTriggerButton } from "@/components/GuidedTour";
import { Play, HelpCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface APIKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  permissions: string[];
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  description: string;
}

interface ServiceConfig {
  name: string;
  status: "Connected" | "Not Connected";
  apiKey?: string;
  webhookUrl?: string;
  lastSync?: string;
}

const initialAPIKeys: APIKey[] = [
  { id: "1", name: "Production API", key: "mk_live_xxxxxxxxxxxxxxxxxxxxxxxx", created: "2025-12-01", lastUsed: "2 hours ago", permissions: ["read", "write"] },
  { id: "2", name: "Development API", key: "mk_test_xxxxxxxxxxxxxxxxxxxxxxxx", created: "2025-11-15", lastUsed: "5 days ago", permissions: ["read"] },
];

const initialInvoices: Invoice[] = [
  { id: "INV-2026-001", date: "2026-01-01", amount: 2499, status: "paid", description: "Enterprise Plan - January 2026" },
  { id: "INV-2025-012", date: "2025-12-01", amount: 2499, status: "paid", description: "Enterprise Plan - December 2025" },
  { id: "INV-2025-011", date: "2025-11-01", amount: 2499, status: "paid", description: "Enterprise Plan - November 2025" },
  { id: "INV-2025-010", date: "2025-10-01", amount: 1999, status: "paid", description: "Professional Plan - October 2025" },
];

const plans = [
  { id: "starter", name: "Starter", price: 499, features: ["5 AI Agents", "10,000 calls/month", "Email support"] },
  { id: "professional", name: "Professional", price: 1999, features: ["25 AI Agents", "50,000 calls/month", "Priority support", "Custom scripts"] },
  { id: "enterprise", name: "Enterprise", price: 2499, features: ["Unlimited Agents", "Unlimited calls", "24/7 support", "Custom integrations", "Dedicated manager"] },
];

export default function Settings() {
  // Dialog states
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [serviceConfigOpen, setServiceConfigOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  
  // Data states
  const [apiKeys, setApiKeys] = useState<APIKey[]>(initialAPIKeys);
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("enterprise");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
  // Form states
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"]);
  const [serviceApiKey, setServiceApiKey] = useState("");
  const [serviceWebhook, setServiceWebhook] = useState("");
  
  // Delete confirmation states
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<APIKey | null>(null);

  const [services, setServices] = useState<ServiceConfig[]>([
    { name: "Twilio", status: "Connected", apiKey: "twilio_xxxxx", lastSync: "2 min ago" },
    { name: "Stripe", status: "Connected", apiKey: "stripe_xxxxx", lastSync: "5 min ago" },
    { name: "Salesforce", status: "Not Connected" },
    { name: "HubSpot", status: "Not Connected" },
  ]);

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  const handleCreateAPIKey = () => {
    if (!newKeyName) {
      toast.error("Please enter a key name");
      return;
    }
    
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `mk_${newKeyPermissions.includes("write") ? "live" : "test"}_${Math.random().toString(36).substring(2, 26)}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      permissions: newKeyPermissions,
    };
    
    setApiKeys([...apiKeys, newKey]);
    setCreateKeyOpen(false);
    setNewKeyName("");
    setNewKeyPermissions(["read"]);
    toast.success("API key created", {
      description: "Your new API key has been generated. Copy it now - you won't be able to see it again.",
    });
  };

  const handleDeleteAPIKey = (key: APIKey) => {
    setKeyToDelete(key);
    setDeleteKeyDialogOpen(true);
  };

  const confirmDeleteAPIKey = () => {
    if (keyToDelete) {
      setApiKeys(apiKeys.filter(k => k.id !== keyToDelete.id));
      toast.success("API key deleted", {
        description: `"${keyToDelete.name}" has been permanently removed.`
      });
      setKeyToDelete(null);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleServiceConfig = (service: ServiceConfig) => {
    setSelectedService(service);
    setServiceApiKey(service.apiKey || "");
    setServiceWebhook(service.webhookUrl || "");
    setServiceConfigOpen(true);
  };

  const handleSaveServiceConfig = () => {
    if (!selectedService) return;
    
    setServices(services.map(s => 
      s.name === selectedService.name 
        ? { ...s, status: "Connected" as const, apiKey: serviceApiKey, webhookUrl: serviceWebhook, lastSync: "Just now" }
        : s
    ));
    setServiceConfigOpen(false);
    toast.success(`${selectedService.name} configured`, {
      description: "Integration settings have been saved.",
    });
  };

  const handleDisconnectService = () => {
    if (!selectedService) return;
    
    setServices(services.map(s => 
      s.name === selectedService.name 
        ? { ...s, status: "Not Connected" as const, apiKey: undefined, webhookUrl: undefined, lastSync: undefined }
        : s
    ));
    setServiceConfigOpen(false);
    toast.success(`${selectedService.name} disconnected`);
  };

  const handleChangePlan = () => {
    toast.success("Plan updated", {
      description: `You are now on the ${plans.find(p => p.id === selectedPlan)?.name} plan.`,
    });
    setChangePlanOpen(false);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    toast.success("Downloading invoice", {
      description: `${invoice.id}.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-neon-blue" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your MOJAVOX platform settings
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-neon-blue" />
                Organization
              </CardTitle>
              <CardDescription>Manage your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" defaultValue="Acme Collections Inc." className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" defaultValue="Financial Services" className="bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue="+1 (555) 123-4567" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue="contact@acmecollections.com" className="bg-background" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-neon-blue" />
                Regional Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input defaultValue="America/New_York (EST)" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input defaultValue="USD ($)" className="bg-background" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-neon-yellow" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: "Payment Received", desc: "Get notified when a payment is received", icon: CreditCard },
                { title: "High-Value Calls", desc: "Alerts for calls exceeding $10,000", icon: Phone },
                { title: "Agent Alerts", desc: "Notifications when agents need assistance", icon: Bell },
                { title: "Daily Summary", desc: "Receive daily performance summary", icon: Mail },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-neon-pink" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neon-green" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                </div>
                <Link href="/2fa">
                  <Button variant="outline" size="sm">Configure</Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-neon-blue" />
                  <div>
                    <p className="font-medium">API Keys</p>
                    <p className="text-sm text-muted-foreground">Manage your API access keys ({apiKeys.length} active)</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setApiKeysOpen(true)}>
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-neon-blue" />
                Connected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className={`text-sm ${service.status === "Connected" ? "text-neon-green" : "text-muted-foreground"}`}>
                      {service.status}
                      {service.lastSync && ` • Last sync: ${service.lastSync}`}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleServiceConfig(service)}
                  >
                    {service.status === "Connected" ? "Configure" : "Connect"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-neon-green" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6 rounded-lg bg-gradient-to-br from-neon-green/10 to-neon-blue/10 border border-neon-green/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-display font-bold">Enterprise Plan</h3>
                    <p className="text-sm text-muted-foreground">Unlimited agents, priority support</p>
                  </div>
                  <span className="text-3xl font-display font-bold text-neon-green">$2,499/mo</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setChangePlanOpen(true)}>
                    Change Plan
                  </Button>
                  <Button variant="outline" onClick={() => setInvoicesOpen(true)}>
                    View Invoices
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help & Tour Section */}
      <Card className="data-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-neon-cyan" />
            Help & Onboarding
          </CardTitle>
          <CardDescription>Get help with using MOJAVOX</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-neon-green" />
              <div>
                <p className="font-medium">Guided Tour</p>
                <p className="text-sm text-muted-foreground">Take a guided tour of MOJAVOX features</p>
              </div>
            </div>
            <TourTriggerButton />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-neon-blue" />
              <div>
                <p className="font-medium">Documentation</p>
                <p className="text-sm text-muted-foreground">Access detailed documentation and guides</p>
              </div>
            </div>
            <Link href="/docs">
              <Button variant="outline" size="sm">View Docs</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-neon-green text-background hover:bg-neon-green/90">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* API Keys Management Dialog */}
      <Dialog open={apiKeysOpen} onOpenChange={setApiKeysOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-neon-blue" />
              API Keys
            </DialogTitle>
            <DialogDescription>
              Manage your API keys for programmatic access to MOJAVOX.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-end">
              <Button 
                size="sm" 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={() => setCreateKeyOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Key
              </Button>
            </div>
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground">Created: {key.created} • Last used: {key.lastUsed}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.permissions.map(p => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-background text-sm font-mono">
                      {showKeys[key.id] ? key.key : key.key.replace(/./g, "•").substring(0, 32) + "..."}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowKeys({ ...showKeys, [key.id]: !showKeys[key.id] })}
                    >
                      {showKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleCopyKey(key.key)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-400 hover:text-red-500"
                      onClick={() => handleDeleteAPIKey(key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for your application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input 
                placeholder="e.g., Production API"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={newKeyPermissions.includes("read")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewKeyPermissions([...newKeyPermissions, "read"]);
                      } else {
                        setNewKeyPermissions(newKeyPermissions.filter(p => p !== "read"));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Read</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={newKeyPermissions.includes("write")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewKeyPermissions([...newKeyPermissions, "write"]);
                      } else {
                        setNewKeyPermissions(newKeyPermissions.filter(p => p !== "write"));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Write</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateKeyOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleCreateAPIKey}
            >
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Configuration Dialog */}
      <Dialog open={serviceConfigOpen} onOpenChange={setServiceConfigOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-neon-blue" />
              {selectedService?.status === "Connected" ? "Configure" : "Connect"} {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedService?.status === "Connected" 
                ? "Update your integration settings."
                : "Enter your credentials to connect this service."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key / Secret</Label>
              <Input 
                type="password"
                placeholder="Enter your API key"
                value={serviceApiKey}
                onChange={(e) => setServiceApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL (Optional)</Label>
              <Input 
                placeholder="https://your-webhook-url.com"
                value={serviceWebhook}
                onChange={(e) => setServiceWebhook(e.target.value)}
              />
            </div>
            {selectedService?.status === "Connected" && (
              <div className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/20">
                <div className="flex items-center gap-2 text-neon-green text-sm">
                  <Check className="w-4 h-4" />
                  Connected • Last sync: {selectedService.lastSync}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            {selectedService?.status === "Connected" && (
              <Button 
                variant="outline" 
                className="text-red-400 hover:text-red-500"
                onClick={handleDisconnectService}
              >
                Disconnect
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setServiceConfigOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleSaveServiceConfig}
              >
                {selectedService?.status === "Connected" ? "Save Changes" : "Connect"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-neon-yellow" />
              Change Plan
            </DialogTitle>
            <DialogDescription>
              Select a plan that fits your needs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? "border-neon-green bg-neon-green/10" 
                    : "border-border hover:border-neon-green/50"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <h4 className="font-display font-bold">{plan.name}</h4>
                <p className="text-2xl font-bold text-neon-green my-2">${plan.price}<span className="text-sm text-muted-foreground">/mo</span></p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-neon-green" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleChangePlan}
            >
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoices Dialog */}
      <Dialog open={invoicesOpen} onOpenChange={setInvoicesOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-neon-green" />
              Invoice History
            </DialogTitle>
            <DialogDescription>
              View and download your past invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {initialInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{invoice.id}</p>
                  <p className="text-sm text-muted-foreground">{invoice.description}</p>
                  <p className="text-xs text-muted-foreground">{invoice.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">${invoice.amount.toLocaleString()}</p>
                    <Badge className={invoice.status === "paid" ? "bg-neon-green/20 text-neon-green" : "bg-yellow-500/20 text-yellow-500"}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete API Key Confirmation */}
      <ConfirmDialog
        open={deleteKeyDialogOpen}
        onOpenChange={setDeleteKeyDialogOpen}
        title="Delete API Key?"
        description={keyToDelete ? `Are you sure you want to delete "${keyToDelete.name}"? This action cannot be undone and any applications using this key will stop working.` : ""}
        confirmText="Delete Key"
        variant="danger"
        onConfirm={confirmDeleteAPIKey}
      />
    </div>
  );
}
