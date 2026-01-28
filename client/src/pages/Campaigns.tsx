/**
 * MOJAVOX Campaign Manager
 * Style: Cyberpunk Corporate
 * 
 * Campaign management and configuration.
 * Enhanced with loading states, animations, and confirmation modals.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedProgress, AnimatedCounter } from "@/components/ui/page-transition";
import { CampaignCardSkeleton, KPICardSkeleton } from "@/components/ui/skeleton-loaders";
import { Progress } from "@/components/ui/progress";
import { mockCampaigns } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar,
  ChevronRight,
  Pause,
  Play,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function CampaignCard({ 
  campaign, 
  onPause, 
  onResume, 
  onDelete 
}: { 
  campaign: (typeof mockCampaigns)[0];
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}) {
  const progress = (campaign.recovered / campaign.targetAmount) * 100;
  const contactedProgress = (campaign.contacted / campaign.totalDebtors) * 100;

  return (
    <Card className="data-card hover:border-neon-green/30 transition-all cursor-pointer group">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium text-lg mb-1">{campaign.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(campaign.startDate).toLocaleDateString()} -{" "}
                {new Date(campaign.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                campaign.status === "active"
                  ? "border-neon-green text-neon-green"
                  : campaign.status === "paused"
                  ? "border-neon-yellow text-neon-yellow"
                  : "border-muted-foreground text-muted-foreground"
              )}
            >
              {campaign.status === "active" && <Play className="w-3 h-3 mr-1 fill-current" />}
              {campaign.status === "paused" && <Pause className="w-3 h-3 mr-1" />}
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Recovery Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Recovery Progress</span>
            <span className="font-mono text-neon-green">
              {formatCurrency(campaign.recovered)} / {formatCurrency(campaign.targetAmount)}
            </span>
          </div>
          <AnimatedProgress value={progress} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.toFixed(1)}% of target</span>
            <span>{campaign.successRate}% success rate</span>
          </div>
        </div>

        {/* Contact Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contacted</span>
            <span className="font-mono">
              {campaign.contacted.toLocaleString()} / {campaign.totalDebtors.toLocaleString()}
            </span>
          </div>
          <AnimatedProgress value={contactedProgress} barClassName="bg-neon-blue" />
        </div>

        {/* Actions & Assigned Agents */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {campaign.status === "active" ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-neon-yellow border-neon-yellow hover:bg-neon-yellow/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onPause();
                }}
              >
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </Button>
            ) : campaign.status === "paused" ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-neon-green border-neon-green hover:bg-neon-green/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onResume();
                }}
              >
                <Play className="w-3 h-3 mr-1" />
                Resume
              </Button>
            ) : null}
          </div>
          <div className="flex gap-1">
            {campaign.assignedAgents.slice(0, 2).map((agent, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {agent}
              </Badge>
            ))}
            {campaign.assignedAgents.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{campaign.assignedAgents.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewCampaignCard({ onClick }: { onClick: () => void }) {
  return (
    <Card 
      className="data-card border-dashed border-2 hover:border-neon-green/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center mb-4 group-hover:bg-neon-green/20 transition-colors">
          <Plus className="w-8 h-8 text-neon-green" />
        </div>
        <h3 className="font-medium text-lg mb-2">Create New Campaign</h3>
        <p className="text-sm text-muted-foreground text-center">
          Launch a new collection campaign with AI-powered agents
        </p>
      </CardContent>
    </Card>
  );
}

function StatsCard({
  title,
  value,
  numericValue,
  icon: Icon,
  trend,
  format,
}: {
  title: string;
  value: string;
  numericValue?: number;
  icon: React.ElementType;
  trend?: number;
  format?: "currency" | "number" | "percent";
}) {
  return (
    <Card className="data-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-display font-bold">
              {numericValue !== undefined ? (
                <AnimatedCounter 
                  value={numericValue} 
                  formatter={(v) => {
                    if (format === "currency") return formatCurrency(v);
                    if (format === "percent") return `${v}%`;
                    return v.toLocaleString();
                  }}
                />
              ) : (
                value
              )}
            </p>
          </div>
          {trend !== undefined && (
            <div className="ml-auto">
              <Badge
                variant="outline"
                className={cn(
                  trend >= 0
                    ? "border-neon-green text-neon-green"
                    : "border-neon-pink text-neon-pink"
                )}
              >
                <TrendingUp className={cn("w-3 h-3 mr-1", trend < 0 && "rotate-180")} />
                {Math.abs(trend)}%
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Campaigns() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  
  // Confirmation dialogs
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const activeCampaigns = mockCampaigns.filter((c) => c.status === "active").length;
  const totalRecovered = mockCampaigns.reduce((sum, c) => sum + c.recovered, 0);
  const totalDebtors = mockCampaigns.reduce((sum, c) => sum + c.totalDebtors, 0);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handlePause = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setPauseDialogOpen(true);
  };

  const handleResume = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setResumeDialogOpen(true);
  };

  const handleDelete = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setDeleteDialogOpen(true);
  };

  const confirmPause = () => {
    toast.success("Campaign paused", {
      description: "The campaign has been paused. No new calls will be made.",
    });
  };

  const confirmResume = () => {
    toast.success("Campaign resumed", {
      description: "The campaign is now active and making calls.",
    });
  };

  const confirmDelete = () => {
    toast.success("Campaign deleted", {
      description: "The campaign has been permanently removed.",
    });
  };

  const confirmCreate = () => {
    toast.info("Redirecting to campaign wizard...");
    navigate("/campaign-wizard");
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Campaigns Skeleton */}
        <div>
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
            ))}
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
              <Target className="w-6 h-6 text-neon-blue" />
              Campaign Manager
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor your collection campaigns
            </p>
          </div>
          <Button 
            className="bg-neon-green text-background hover:bg-neon-green/90"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Stats Row */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <StatsCard 
              title="Active Campaigns" 
              value={activeCampaigns.toString()} 
              numericValue={activeCampaigns}
              icon={Play} 
            />
          </StaggerItem>
          <StaggerItem>
            <StatsCard
              title="Total Recovered"
              value={formatCurrency(totalRecovered)}
              numericValue={totalRecovered}
              icon={TrendingUp}
              trend={12}
              format="currency"
            />
          </StaggerItem>
          <StaggerItem>
            <StatsCard
              title="Total Debtors"
              value={totalDebtors.toLocaleString()}
              numericValue={totalDebtors}
              icon={Users}
            />
          </StaggerItem>
          <StaggerItem>
            <StatsCard 
              title="Avg Success Rate" 
              value="63%" 
              numericValue={63}
              icon={Target} 
              trend={5} 
              format="percent"
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Campaigns Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">All Campaigns</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toast.info("All campaigns displayed", { description: "Showing all available campaigns" })}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockCampaigns.map((campaign) => (
              <StaggerItem key={campaign.id}>
                <CampaignCard 
                  campaign={campaign} 
                  onPause={() => handlePause(campaign.id)}
                  onResume={() => handleResume(campaign.id)}
                  onDelete={() => handleDelete(campaign.id)}
                />
              </StaggerItem>
            ))}
            <StaggerItem>
              <NewCampaignCard onClick={() => setCreateDialogOpen(true)} />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={pauseDialogOpen}
        onOpenChange={setPauseDialogOpen}
        title="Pause Campaign"
        description="This will stop all outgoing calls for this campaign. Ongoing calls will be completed. Are you sure you want to pause?"
        confirmText="Pause Campaign"
        variant="warning"
        onConfirm={confirmPause}
      />

      <ConfirmDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        title="Resume Campaign"
        description="This will restart outgoing calls for this campaign. AI agents will begin contacting debtors again. Continue?"
        confirmText="Resume Campaign"
        variant="success"
        onConfirm={confirmResume}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Campaign"
        description="This action cannot be undone. All campaign data, call history, and analytics will be permanently deleted. Are you absolutely sure?"
        confirmText="Delete Campaign"
        variant="danger"
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Create New Campaign"
        description="You will be guided through the campaign creation wizard to set up targets, assign agents, and configure collection parameters. Ready to begin?"
        confirmText="Start Wizard"
        variant="default"
        onConfirm={confirmCreate}
      />
    </PageTransition>
  );
}
