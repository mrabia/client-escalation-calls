/**
 * MOJAVOX Debtor Segments Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Automatic segmentation based on behavior
 * - Custom segment creation
 * - Segment performance metrics
 * - Bulk actions on segments
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Filter,
  Layers,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/ui/page-transition";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Segment {
  id: string;
  name: string;
  description: string;
  type: "auto" | "custom";
  criteria: string[];
  debtorCount: number;
  totalBalance: number;
  avgRiskScore: number;
  conversionRate: number;
  color: string;
  trend: "up" | "down" | "stable";
}

const mockSegments: Segment[] = [
  {
    id: "seg_1",
    name: "High Value - Likely to Pay",
    description: "Debtors with balance > $2000 and risk score > 70",
    type: "auto",
    criteria: ["Balance > $2,000", "Risk Score > 70", "Previous payment history"],
    debtorCount: 234,
    totalBalance: 892000,
    avgRiskScore: 78,
    conversionRate: 45,
    color: "neon-green",
    trend: "up",
  },
  {
    id: "seg_2",
    name: "Payment Plan Candidates",
    description: "Debtors who responded positively to payment plan offers",
    type: "auto",
    criteria: ["Expressed interest in payment plans", "Stable contact history", "Moderate balance"],
    debtorCount: 456,
    totalBalance: 654000,
    avgRiskScore: 62,
    conversionRate: 38,
    color: "neon-blue",
    trend: "up",
  },
  {
    id: "seg_3",
    name: "Needs Follow-up",
    description: "Debtors with no contact in 14+ days",
    type: "auto",
    criteria: ["Last contact > 14 days", "No payment in 30 days", "Active account"],
    debtorCount: 189,
    totalBalance: 423000,
    avgRiskScore: 45,
    conversionRate: 22,
    color: "amber",
    trend: "down",
  },
  {
    id: "seg_4",
    name: "At Risk - Low Response",
    description: "Debtors with multiple failed contact attempts",
    type: "auto",
    criteria: ["3+ failed contact attempts", "No response to SMS/email", "Risk score < 40"],
    debtorCount: 312,
    totalBalance: 567000,
    avgRiskScore: 28,
    conversionRate: 12,
    color: "red",
    trend: "stable",
  },
  {
    id: "seg_5",
    name: "VIP Accounts",
    description: "Custom segment for priority handling",
    type: "custom",
    criteria: ["Manual selection", "High-value clients", "Special handling required"],
    debtorCount: 45,
    totalBalance: 234000,
    avgRiskScore: 65,
    conversionRate: 52,
    color: "purple",
    trend: "up",
  },
];

export default function DebtorSegments() {
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>(mockSegments);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDebtorsDialogOpen, setViewDebtorsDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    startDate: "",
    priority: "medium",
  });
  const [newSegment, setNewSegment] = useState({
    name: "",
    description: "",
    balanceMin: "",
    balanceMax: "",
    riskScoreMin: "",
    riskScoreMax: "",
    lastContactDays: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateSegment = () => {
    if (!newSegment.name) {
      toast.error("Please enter a segment name");
      return;
    }

    const criteria: string[] = [];
    if (newSegment.balanceMin) criteria.push(`Balance >= $${newSegment.balanceMin}`);
    if (newSegment.balanceMax) criteria.push(`Balance <= $${newSegment.balanceMax}`);
    if (newSegment.riskScoreMin) criteria.push(`Risk Score >= ${newSegment.riskScoreMin}`);
    if (newSegment.riskScoreMax) criteria.push(`Risk Score <= ${newSegment.riskScoreMax}`);
    if (newSegment.lastContactDays) criteria.push(`Last contact > ${newSegment.lastContactDays} days`);

    const segment: Segment = {
      id: `seg_${Date.now()}`,
      name: newSegment.name,
      description: newSegment.description || "Custom segment",
      type: "custom",
      criteria: criteria.length > 0 ? criteria : ["Custom selection"],
      debtorCount: Math.floor(Math.random() * 100) + 20,
      totalBalance: Math.floor(Math.random() * 500000) + 100000,
      avgRiskScore: Math.floor(Math.random() * 40) + 40,
      conversionRate: Math.floor(Math.random() * 30) + 20,
      color: "purple",
      trend: "stable",
    };

    setSegments([...segments, segment]);
    setCreateDialogOpen(false);
    setNewSegment({
      name: "",
      description: "",
      balanceMin: "",
      balanceMax: "",
      riskScoreMin: "",
      riskScoreMax: "",
      lastContactDays: "",
    });
    toast.success("Segment created", { description: `${segment.debtorCount} debtors matched` });
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<Segment | null>(null);

  const handleDeleteSegment = (segment: Segment) => {
    setSegmentToDelete(segment);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSegment = () => {
    if (segmentToDelete) {
      setSegments(segments.filter(s => s.id !== segmentToDelete.id));
      toast.success("Segment deleted", {
        description: `"${segmentToDelete.name}" has been removed.`
      });
      setSegmentToDelete(null);
    }
  };

  const handleRefreshSegments = () => {
    toast.success("Segments refreshed", { description: "All automatic segments updated" });
  };

  const handleViewDebtors = (segment: Segment) => {
    setSelectedSegment(segment);
    setViewDebtorsDialogOpen(true);
  };

  const handleStartCampaign = (segment: Segment) => {
    setSelectedSegment(segment);
    setCampaignForm({ name: `Campaign - ${segment.name}`, startDate: "", priority: "medium" });
    setCampaignDialogOpen(true);
  };

  const handleCreateCampaign = () => {
    if (!campaignForm.name || !campaignForm.startDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Campaign created", {
      description: `Campaign for ${selectedSegment?.debtorCount} debtors will start on ${campaignForm.startDate}`,
    });
    setCampaignDialogOpen(false);
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "neon-green": return { bg: "bg-neon-green/10", text: "text-neon-green", border: "border-neon-green/30" };
      case "neon-blue": return { bg: "bg-neon-blue/10", text: "text-neon-blue", border: "border-neon-blue/30" };
      case "amber": return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
      case "red": return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };
      case "purple": return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    }
  };

  const totalDebtors = segments.reduce((sum, s) => sum + s.debtorCount, 0);
  const totalBalance = segments.reduce((sum, s) => sum + s.totalBalance, 0);
  const autoSegments = segments.filter(s => s.type === "auto").length;
  const customSegments = segments.filter(s => s.type === "custom").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
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
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                <Layers className="w-6 h-6 text-background" />
              </div>
              Debtor Segments
            </h1>
            <p className="text-muted-foreground mt-1">Automatic and custom debtor segmentation</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefreshSegments}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Segment
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Segments</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={segments.length} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Segmented Debtors</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={totalDebtors} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    $<AnimatedCounter value={Math.round(totalBalance / 1000)} />K
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auto / Custom</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {autoSegments} / {customSegments}
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Segments Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => {
            const colors = getColorClasses(segment.color);
            return (
              <Card key={segment.id} className={cn("bg-card border-border hover:border-opacity-50 transition-colors", colors.border)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors.bg)}>
                        <Layers className={cn("w-5 h-5", colors.text)} />
                      </div>
                      <div>
                        <CardTitle className="text-foreground text-base">{segment.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {segment.type === "auto" ? "Automatic" : "Custom"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {segment.trend === "up" && <TrendingUp className="w-4 h-4 text-neon-green" />}
                      {segment.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                      {segment.trend === "stable" && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{segment.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Debtors</p>
                      <p className="text-lg font-semibold text-foreground">{segment.debtorCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Balance</p>
                      <p className="text-lg font-semibold text-foreground">${(segment.totalBalance / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Risk Score</p>
                      <p className={cn("text-lg font-semibold", segment.avgRiskScore >= 60 ? "text-neon-green" : segment.avgRiskScore >= 40 ? "text-amber-400" : "text-red-400")}>
                        {segment.avgRiskScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversion Rate</p>
                      <p className="text-lg font-semibold text-foreground">{segment.conversionRate}%</p>
                    </div>
                  </div>

                  {/* Criteria */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Criteria</p>
                    <div className="flex flex-wrap gap-1">
                      {segment.criteria.slice(0, 3).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                      {segment.criteria.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{segment.criteria.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewDebtors(segment)}>
                      <Users className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStartCampaign(segment)}>
                      <Target className="w-4 h-4 mr-1" />
                      Campaign
                    </Button>
                    {segment.type === "custom" && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSegment(segment)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Create Segment Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Custom Segment</DialogTitle>
              <DialogDescription>
                Define criteria to create a custom debtor segment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Segment Name</Label>
                <Input
                  placeholder="e.g., High Priority Q1"
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of this segment"
                  value={newSegment.description}
                  onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Balance ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newSegment.balanceMin}
                    onChange={(e) => setNewSegment({ ...newSegment, balanceMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Balance ($)</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={newSegment.balanceMax}
                    onChange={(e) => setNewSegment({ ...newSegment, balanceMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Risk Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    value={newSegment.riskScoreMin}
                    onChange={(e) => setNewSegment({ ...newSegment, riskScoreMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Risk Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="100"
                    value={newSegment.riskScoreMax}
                    onChange={(e) => setNewSegment({ ...newSegment, riskScoreMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Last Contact (days ago)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 14 for no contact in 14+ days"
                  value={newSegment.lastContactDays}
                  onChange={(e) => setNewSegment({ ...newSegment, lastContactDays: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleCreateSegment}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Segment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Debtors Dialog */}
        <Dialog open={viewDebtorsDialogOpen} onOpenChange={setViewDebtorsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-blue" />
                {selectedSegment?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedSegment?.debtorCount} debtors in this segment
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {/* Segment Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                  <p className="text-lg font-bold text-neon-green">
                    ${selectedSegment?.totalBalance.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Avg Risk Score</p>
                  <p className="text-lg font-bold">{selectedSegment?.avgRiskScore}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  <p className="text-lg font-bold text-neon-blue">{selectedSegment?.conversionRate}%</p>
                </div>
              </div>

              {/* Sample Debtors List */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Sample Debtors</p>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="font-medium">Debtor #{1000 + i}</p>
                      <p className="text-xs text-muted-foreground">Last contact: {i + 2} days ago</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-neon-green">${(Math.random() * 5000 + 1000).toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Risk: {Math.floor(Math.random() * 30) + 50}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDebtorsDialogOpen(false)}>
                Close
              </Button>
              <Button 
                className="bg-neon-blue text-white hover:bg-neon-blue/90"
                onClick={() => {
                  setViewDebtorsDialogOpen(false);
                  toast.success("Exporting debtor list", { description: "CSV file will download shortly" });
                }}
              >
                Export List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Start Campaign Dialog */}
        <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-neon-green" />
                Start Campaign
              </DialogTitle>
              <DialogDescription>
                Create a campaign for {selectedSegment?.debtorCount} debtors in "{selectedSegment?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  placeholder="Enter campaign name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={campaignForm.startDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={campaignForm.priority} onValueChange={(v) => setCampaignForm({ ...campaignForm, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target Debtors:</span>
                  <span className="font-medium">{selectedSegment?.debtorCount}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Total Balance:</span>
                  <span className="font-mono text-neon-green">${selectedSegment?.totalBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleCreateCampaign}
              >
                <Target className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Segment Confirmation */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Segment?"
          description={segmentToDelete ? `Are you sure you want to delete "${segmentToDelete.name}"? This will remove the segment but not the debtors within it.` : ""}
          confirmText="Delete Segment"
          variant="danger"
          onConfirm={confirmDeleteSegment}
        />
      </div>
    </PageTransition>
  );
}
