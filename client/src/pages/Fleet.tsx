/**
 * MOJAVOX AI Fleet Hangar
 * Style: Cyberpunk Corporate
 * 
 * AI Agent management and configuration.
 * Enhanced with confirmation modals, loading states, and animations.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedProgress } from "@/components/ui/page-transition";
import { AgentCardSkeleton, KPICardSkeleton } from "@/components/ui/skeleton-loaders";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockAgents } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Bot,
  ChevronRight,
  Mic,
  Phone,
  Play,
  Plus,
  Power,
  PowerOff,
  Settings,
  Sliders,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

function AgentCard({
  agent,
  isSelected,
  onClick,
  onActivate,
  onDeactivate,
  onSettings,
}: {
  agent: (typeof mockAgents)[0];
  isSelected: boolean;
  onClick: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onSettings: () => void;
}) {
  const statusColors = {
    online: "border-neon-green text-neon-green",
    busy: "border-neon-yellow text-neon-yellow",
    offline: "border-muted-foreground text-muted-foreground",
  };

  const personalityColors = {
    empathetic: "bg-neon-blue/20 text-neon-blue",
    assertive: "bg-neon-pink/20 text-neon-pink",
    neutral: "bg-muted text-muted-foreground",
    friendly: "bg-neon-green/20 text-neon-green",
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "data-card cursor-pointer transition-all hover:scale-[1.02]",
        isSelected && "border-neon-green glow-green"
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-neon-blue">{agent.name}</h3>
              <Badge
                variant="outline"
                className={cn("text-xs", personalityColors[agent.personality as keyof typeof personalityColors])}
              >
                {agent.personality}
              </Badge>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[agent.status as keyof typeof statusColors]}>
            <span className={cn("status-dot mr-1", agent.status)} />
            {agent.status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-display font-bold">{agent.callsToday}</p>
            <p className="text-xs text-muted-foreground">Calls Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-neon-green">{agent.successRate}%</p>
            <p className="text-xs text-muted-foreground">Success</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold">{agent.avgCallDuration}m</p>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {agent.status === "online" || agent.status === "busy" ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-neon-yellow border-neon-yellow hover:bg-neon-yellow/10"
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate();
              }}
            >
              <PowerOff className="w-3 h-3 mr-1" />
              Deactivate
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-neon-green border-neon-green hover:bg-neon-green/10"
              onClick={(e) => {
                e.stopPropagation();
                onActivate();
              }}
            >
              <Power className="w-3 h-3 mr-1" />
              Activate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSettings(); }}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentConfigPanel({ 
  agent, 
  onSave,
  onDelete,
  saving 
}: { 
  agent: (typeof mockAgents)[0] | null;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [empathy, setEmpathy] = useState(70);
  const [authority, setAuthority] = useState(30);
  const [speed, setSpeed] = useState(50);

  if (!agent) {
    return (
      <Card className="data-card h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select an agent to configure</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="data-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-neon-blue" />
            Agent Configuration
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="personality">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="personality" className="flex-1">Personality</TabsTrigger>
            <TabsTrigger value="voice" className="flex-1">Voice</TabsTrigger>
            <TabsTrigger value="limits" className="flex-1">Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="personality" className="space-y-6">
            {/* Empathy Slider */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Empathy Level</span>
                <span className="text-sm font-mono text-neon-blue">{empathy}%</span>
              </div>
              <Slider
                value={[empathy]}
                onValueChange={(v) => setEmpathy(v[0])}
                max={100}
                step={1}
                className="[&_[role=slider]]:bg-neon-blue"
              />
              <p className="text-xs text-muted-foreground">
                Higher empathy makes the agent more understanding and patient
              </p>
            </div>

            {/* Authority Slider */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Authority Level</span>
                <span className="text-sm font-mono text-neon-pink">{authority}%</span>
              </div>
              <Slider
                value={[authority]}
                onValueChange={(v) => setAuthority(v[0])}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Higher authority makes the agent more firm and direct
              </p>
            </div>

            {/* Personality Preview */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="text-sm font-medium mb-2">Personality Preview</h4>
              <p className="text-sm text-muted-foreground">
                {empathy > 60 && authority < 40
                  ? "This agent will be understanding and patient, focusing on building rapport with debtors."
                  : empathy < 40 && authority > 60
                  ? "This agent will be direct and firm, focusing on efficient resolution."
                  : "This agent will balance empathy and authority based on the situation."}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-6">
            {/* Voice Engine */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Voice Engine</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={agent.voiceEngine === "elevenlabs" ? "default" : "outline"}
                  className={agent.voiceEngine === "elevenlabs" ? "bg-neon-blue" : ""}
                >
                  ElevenLabs
                </Button>
                <Button variant="outline" onClick={() => toast.info("Voice engine", { description: "Switching to Google TTS..." })}>Google TTS</Button>
              </div>
            </div>

            {/* Voice Sample */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Voice Sample</span>
              <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center gap-4">
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => toast.info("Playing sample", { description: "Playing voice sample..." })}>
                  <Play className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{agent.voiceId}</p>
                  <p className="text-xs text-muted-foreground">Professional, clear, neutral accent</p>
                </div>
                <Mic className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Speech Speed</span>
                <span className="text-sm font-mono">{speed}%</span>
              </div>
              <Slider
                value={[speed]}
                onValueChange={(v) => setSpeed(v[0])}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            {/* Max Discount */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Maximum Discount</span>
                <span className="text-lg font-display font-bold text-neon-green">
                  {agent.maxDiscount}%
                </span>
              </div>
              <AnimatedProgress value={(agent.maxDiscount / 30) * 100} />
              <p className="text-xs text-muted-foreground mt-2">
                Agent can offer up to {agent.maxDiscount}% discount without approval
              </p>
            </div>

            {/* Max Payment Plan */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Max Payment Plan</span>
                <span className="text-lg font-display font-bold text-neon-blue">
                  {agent.maxPaymentPlan} months
                </span>
              </div>
              <AnimatedProgress value={(agent.maxPaymentPlan / 24) * 100} />
              <p className="text-xs text-muted-foreground mt-2">
                Agent can offer payment plans up to {agent.maxPaymentPlan} months
              </p>
            </div>

            {/* Approval Required */}
            <div className="p-4 rounded-lg border border-neon-yellow/30 bg-neon-yellow/5">
              <p className="text-sm text-neon-yellow">
                ⚠️ Any offer exceeding these limits will require supervisor approval
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t border-border">
          <Button 
            className="w-full bg-neon-green text-background hover:bg-neon-green/90"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Fleet() {
  const [, navigate] = useLocation();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(mockAgents[0]?.id || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Confirmation dialogs
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  
  // Agent settings dialog
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsAgent, setSettingsAgent] = useState<(typeof mockAgents)[0] | null>(null);
  const [agentSettings, setAgentSettings] = useState({
    name: "",
    personality: "empathetic",
    voiceEngine: "elevenlabs",
    voiceId: "professional_male",
    maxDiscount: 15,
    maxPaymentPlan: 12,
  });
  
  // Voice sample dialog
  const [voiceSampleDialogOpen, setVoiceSampleDialogOpen] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);
  
  // View all agents dialog
  const [viewAllDialogOpen, setViewAllDialogOpen] = useState(false);

  const selectedAgent = mockAgents.find((a) => a.id === selectedAgentId) || null;
  const onlineCount = mockAgents.filter((a) => a.status === "online").length;
  const busyCount = mockAgents.filter((a) => a.status === "busy").length;

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleActivate = (agentId: string) => {
    setPendingAgentId(agentId);
    setActivateDialogOpen(true);
  };

  const handleDeactivate = (agentId: string) => {
    setPendingAgentId(agentId);
    setDeactivateDialogOpen(true);
  };

  const confirmActivate = () => {
    toast.success("Agent activated successfully", {
      description: `Agent is now online and ready to make calls.`,
    });
  };

  const confirmDeactivate = () => {
    toast.success("Agent deactivated", {
      description: "Agent has been taken offline.",
    });
  };

  const confirmDelete = () => {
    toast.success("Agent deleted", {
      description: "Agent has been permanently removed from the fleet.",
    });
    setSelectedAgentId(mockAgents[0]?.id || null);
  };

  const handleSaveConfig = () => {
    setSaveDialogOpen(true);
  };

  const confirmSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Configuration saved", {
        description: "Agent settings have been updated successfully.",
      });
    }, 1500);
  };

  const handleDeployNew = () => {
    setDeployDialogOpen(true);
  };

  const confirmDeploy = () => {
    navigate("/agent-wizard");
  };

  const handleOpenSettings = (agent: (typeof mockAgents)[0]) => {
    setSettingsAgent(agent);
    setAgentSettings({
      name: agent.name,
      personality: agent.personality,
      voiceEngine: agent.voiceEngine,
      voiceId: agent.voiceId,
      maxDiscount: agent.maxDiscount,
      maxPaymentPlan: agent.maxPaymentPlan,
    });
    setSettingsDialogOpen(true);
  };

  const handleSaveAgentSettings = () => {
    toast.success("Agent settings saved", {
      description: `Settings for ${agentSettings.name} have been updated.`,
    });
    setSettingsDialogOpen(false);
  };

  const handlePlayVoiceSample = () => {
    setPlayingVoice(true);
    setVoiceSampleDialogOpen(true);
    setTimeout(() => setPlayingVoice(false), 3000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <AgentCardSkeleton key={i} />
              ))}
            </div>
          </div>
          <div>
            <div className="h-[500px] bg-card border border-border rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-neon-blue" />
              AI Fleet Hangar
            </h1>
            <p className="text-muted-foreground">
              Configure and manage your AI collection agents
            </p>
          </div>
          <Button 
            className="bg-neon-green text-background hover:bg-neon-green/90"
            onClick={handleDeployNew}
          >
            <Plus className="w-4 h-4 mr-2" />
            Deploy New Agent
          </Button>
        </div>

        {/* Stats Row */}
        <StaggerContainer className="grid grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-neon-green" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-neon-green">{onlineCount}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-neon-yellow" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-neon-yellow">{busyCount}</p>
                  <p className="text-xs text-muted-foreground">On Calls</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-neon-blue" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">68%</p>
                  <p className="text-xs text-muted-foreground">Avg Success</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{mockAgents.length}</p>
                  <p className="text-xs text-muted-foreground">Total Agents</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Agent Fleet</h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setViewAllDialogOpen(true)}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockAgents.map((agent) => (
                <StaggerItem key={agent.id}>
                  <AgentCard
                    agent={agent}
                    isSelected={selectedAgentId === agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    onActivate={() => handleActivate(agent.id)}
                    onDeactivate={() => handleDeactivate(agent.id)}
                    onSettings={() => handleOpenSettings(agent)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Config Panel */}
          <div>
            <AgentConfigPanel 
              agent={selectedAgent} 
              onSave={handleSaveConfig}
              onDelete={() => setDeleteDialogOpen(true)}
              saving={saving}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={activateDialogOpen}
        onOpenChange={setActivateDialogOpen}
        title="Activate Agent"
        description="This agent will be brought online and will start accepting calls. Are you sure you want to activate this agent?"
        confirmText="Activate"
        variant="success"
        onConfirm={confirmActivate}
      />

      <ConfirmDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title="Deactivate Agent"
        description="This agent will be taken offline and will stop accepting new calls. Any ongoing calls will be completed. Are you sure?"
        confirmText="Deactivate"
        variant="warning"
        onConfirm={confirmDeactivate}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Agent"
        description="This action cannot be undone. The agent and all its configuration will be permanently deleted. Are you absolutely sure?"
        confirmText="Delete Agent"
        variant="danger"
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        title="Deploy New Agent"
        description="You will be redirected to the Agent Deployment Wizard to configure and deploy a new AI agent. Continue?"
        confirmText="Continue"
        variant="default"
        onConfirm={confirmDeploy}
      />

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Save Configuration"
        description="The agent's configuration will be updated. This may affect ongoing calls. Do you want to save these changes?"
        confirmText="Save Changes"
        variant="success"
        onConfirm={confirmSave}
      />

      {/* Agent Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-neon-blue" />
              Agent Settings
            </DialogTitle>
            <DialogDescription>
              Configure settings for {settingsAgent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input
                  value={agentSettings.name}
                  onChange={(e) => setAgentSettings({ ...agentSettings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Personality</Label>
                <Select value={agentSettings.personality} onValueChange={(v) => setAgentSettings({ ...agentSettings, personality: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                    <SelectItem value="assertive">Assertive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voice Engine</Label>
                <Select value={agentSettings.voiceEngine} onValueChange={(v) => setAgentSettings({ ...agentSettings, voiceEngine: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="google">Google TTS</SelectItem>
                    <SelectItem value="azure">Azure Speech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voice ID</Label>
                <Select value={agentSettings.voiceId} onValueChange={(v) => setAgentSettings({ ...agentSettings, voiceId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional_male">Professional Male</SelectItem>
                    <SelectItem value="professional_female">Professional Female</SelectItem>
                    <SelectItem value="friendly_male">Friendly Male</SelectItem>
                    <SelectItem value="friendly_female">Friendly Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Discount (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={agentSettings.maxDiscount}
                  onChange={(e) => setAgentSettings({ ...agentSettings, maxDiscount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Payment Plan (months)</Label>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={agentSettings.maxPaymentPlan}
                  onChange={(e) => setAgentSettings({ ...agentSettings, maxPaymentPlan: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleSaveAgentSettings}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voice Sample Dialog */}
      <Dialog open={voiceSampleDialogOpen} onOpenChange={setVoiceSampleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-neon-blue" />
              Voice Sample
            </DialogTitle>
            <DialogDescription>
              Preview the agent's voice
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="p-6 rounded-lg bg-muted/50 border border-border text-center">
              {playingVoice ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-neon-blue/20 flex items-center justify-center animate-pulse">
                    <Activity className="w-8 h-8 text-neon-blue" />
                  </div>
                  <p className="text-sm text-muted-foreground">Playing voice sample...</p>
                  <p className="text-sm font-medium">"Hello, this is your AI collection agent. How may I assist you today?"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Click play to hear the voice sample</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiceSampleDialogOpen(false)}>
              Close
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={() => {
                setPlayingVoice(true);
                setTimeout(() => setPlayingVoice(false), 3000);
              }}
              disabled={playingVoice}
            >
              <Play className="w-4 h-4 mr-2" />
              {playingVoice ? "Playing..." : "Play Sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View All Agents Dialog */}
      <Dialog open={viewAllDialogOpen} onOpenChange={setViewAllDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-neon-blue" />
              All AI Agents ({mockAgents.length})
            </DialogTitle>
            <DialogDescription>
              Complete list of all deployed AI agents
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              {mockAgents.map((agent) => (
                <div 
                  key={agent.id}
                  className="p-4 rounded-lg border border-border hover:border-neon-green/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setViewAllDialogOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-mono font-bold text-neon-blue">{agent.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{agent.personality} • {agent.voiceEngine}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{agent.callsToday} calls</p>
                        <p className="text-xs text-neon-green">{agent.successRate}% success</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          agent.status === "online" && "border-neon-green text-neon-green",
                          agent.status === "busy" && "border-neon-yellow text-neon-yellow",
                          agent.status === "offline" && "border-muted-foreground text-muted-foreground"
                        )}
                      >
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewAllDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
