/**
 * MOJAVOX A/B Testing Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Create A/B tests for different scripts
 * - Monitor test performance in real-time
 * - Statistical significance indicators
 * - Winner declaration
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRight,
  BarChart3,
  Beaker,
  CheckCircle,
  Clock,
  Copy,
  FlaskConical,
  Pause,
  Play,
  Plus,
  Target,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/ui/page-transition";

interface ABTest {
  id: string;
  name: string;
  status: "running" | "paused" | "completed";
  campaign: string;
  startDate: string;
  variants: {
    id: string;
    name: string;
    script: string;
    calls: number;
    conversions: number;
    conversionRate: number;
    avgRecovery: number;
    isWinner?: boolean;
  }[];
  trafficSplit: number;
  significance: number;
  minSampleSize: number;
}

const mockTests: ABTest[] = [
  {
    id: "test_1",
    name: "Friendly vs Professional Tone",
    status: "running",
    campaign: "Q1 2026 - High Value Recovery",
    startDate: "2026-01-20",
    variants: [
      {
        id: "A",
        name: "Variant A - Friendly",
        script: "Hi! This is a friendly reminder about your account...",
        calls: 450,
        conversions: 126,
        conversionRate: 28,
        avgRecovery: 1850,
      },
      {
        id: "B",
        name: "Variant B - Professional",
        script: "Good day. We are contacting you regarding your outstanding balance...",
        calls: 448,
        conversions: 112,
        conversionRate: 25,
        avgRecovery: 2100,
      },
    ],
    trafficSplit: 50,
    significance: 78,
    minSampleSize: 1000,
  },
  {
    id: "test_2",
    name: "Payment Plan Emphasis",
    status: "completed",
    campaign: "Payment Reminder - 30 Days",
    startDate: "2026-01-10",
    variants: [
      {
        id: "A",
        name: "Variant A - Full Payment Focus",
        script: "We encourage you to settle your balance in full today...",
        calls: 1200,
        conversions: 288,
        conversionRate: 24,
        avgRecovery: 2400,
      },
      {
        id: "B",
        name: "Variant B - Payment Plan Focus",
        script: "We have flexible payment plans available for you...",
        calls: 1198,
        conversions: 359,
        conversionRate: 30,
        avgRecovery: 1800,
        isWinner: true,
      },
    ],
    trafficSplit: 50,
    significance: 95,
    minSampleSize: 1000,
  },
];

export default function ABTesting() {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<ABTest[]>(mockTests);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [newTest, setNewTest] = useState({
    name: "",
    campaign: "",
    variantAName: "Variant A",
    variantAScript: "",
    variantBName: "Variant B",
    variantBScript: "",
    trafficSplit: 50,
    minSampleSize: 1000,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateTest = () => {
    if (!newTest.name || !newTest.campaign || !newTest.variantAScript || !newTest.variantBScript) {
      toast.error("Please fill in all required fields");
      return;
    }

    const test: ABTest = {
      id: `test_${Date.now()}`,
      name: newTest.name,
      status: "running",
      campaign: newTest.campaign,
      startDate: new Date().toISOString().split("T")[0],
      variants: [
        {
          id: "A",
          name: newTest.variantAName,
          script: newTest.variantAScript,
          calls: 0,
          conversions: 0,
          conversionRate: 0,
          avgRecovery: 0,
        },
        {
          id: "B",
          name: newTest.variantBName,
          script: newTest.variantBScript,
          calls: 0,
          conversions: 0,
          conversionRate: 0,
          avgRecovery: 0,
        },
      ],
      trafficSplit: newTest.trafficSplit,
      significance: 0,
      minSampleSize: newTest.minSampleSize,
    };

    setTests([test, ...tests]);
    setCreateDialogOpen(false);
    setNewTest({
      name: "",
      campaign: "",
      variantAName: "Variant A",
      variantAScript: "",
      variantBName: "Variant B",
      variantBScript: "",
      trafficSplit: 50,
      minSampleSize: 1000,
    });
    toast.success("A/B test created", { description: "Test is now running" });
  };

  const handlePauseTest = (testId: string) => {
    setTests(tests.map(t => 
      t.id === testId ? { ...t, status: t.status === "running" ? "paused" : "running" } : t
    ));
    toast.success("Test status updated");
  };

  const handleDeclareWinner = (testId: string, variantId: string) => {
    setTests(tests.map(t => {
      if (t.id === testId) {
        return {
          ...t,
          status: "completed" as const,
          variants: t.variants.map(v => ({ ...v, isWinner: v.id === variantId })),
        };
      }
      return t;
    }));
    toast.success("Winner declared", { description: `Variant ${variantId} has been declared the winner` });
  };

  const runningTests = tests.filter(t => t.status === "running").length;
  const completedTests = tests.filter(t => t.status === "completed").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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
                <FlaskConical className="w-6 h-6 text-background" />
              </div>
              A/B Testing
            </h1>
            <p className="text-muted-foreground mt-1">Test different scripts to optimize campaign performance</p>
          </div>
          <Button 
            className="bg-neon-green text-background hover:bg-neon-green/90"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New A/B Test
          </Button>
        </div>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
                  <Beaker className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Running Tests</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={runningTests} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={completedTests} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Improvement</p>
                  <p className="text-2xl font-display font-bold text-neon-green">+18%</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Tests List */}
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-foreground">{test.name}</CardTitle>
                    <Badge className={cn(
                      test.status === "running" ? "bg-neon-green/20 text-neon-green border-neon-green/30" :
                      test.status === "completed" ? "bg-neon-blue/20 text-neon-blue border-neon-blue/30" :
                      "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    )}>
                      {test.status === "running" && <Play className="w-3 h-3 mr-1" />}
                      {test.status === "paused" && <Pause className="w-3 h-3 mr-1" />}
                      {test.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {test.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.status !== "completed" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePauseTest(test.id)}
                      >
                        {test.status === "running" ? (
                          <><Pause className="w-4 h-4 mr-1" /> Pause</>
                        ) : (
                          <><Play className="w-4 h-4 mr-1" /> Resume</>
                        )}
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedTest(test)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Campaign: {test.campaign} • Started: {test.startDate}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {test.variants.map((variant) => (
                    <div 
                      key={variant.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        variant.isWinner 
                          ? "border-neon-green bg-neon-green/5" 
                          : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                            variant.id === "A" ? "bg-neon-blue/20 text-neon-blue" : "bg-purple-500/20 text-purple-400"
                          )}>
                            {variant.id}
                          </span>
                          <span className="font-medium text-foreground">{variant.name}</span>
                          {variant.isWinner && (
                            <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">
                              <Trophy className="w-3 h-3 mr-1" />
                              Winner
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Calls</p>
                          <p className="text-lg font-semibold text-foreground">{variant.calls.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                          <p className="text-lg font-semibold text-foreground">{variant.conversions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Conversion Rate</p>
                          <p className={cn(
                            "text-lg font-semibold",
                            variant.conversionRate >= 28 ? "text-neon-green" : "text-foreground"
                          )}>
                            {variant.conversionRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Recovery</p>
                          <p className="text-lg font-semibold text-foreground">${variant.avgRecovery.toLocaleString()}</p>
                        </div>
                      </div>

                      {test.status !== "completed" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleDeclareWinner(test.id, variant.id)}
                        >
                          <Trophy className="w-4 h-4 mr-1" />
                          Declare Winner
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Statistical Significance */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Statistical Significance</span>
                    <span className={cn(
                      "text-sm font-medium",
                      test.significance >= 95 ? "text-neon-green" : 
                      test.significance >= 80 ? "text-amber-400" : "text-muted-foreground"
                    )}>
                      {test.significance}%
                    </span>
                  </div>
                  <Progress value={test.significance} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {test.significance >= 95 
                      ? "Results are statistically significant. You can confidently declare a winner."
                      : `Need ${test.minSampleSize - Math.max(...test.variants.map(v => v.calls))} more samples for 95% confidence.`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Test Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New A/B Test</DialogTitle>
              <DialogDescription>
                Set up a new A/B test to compare different script variations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Test Name</Label>
                  <Input
                    placeholder="e.g., Friendly vs Professional"
                    value={newTest.name}
                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campaign</Label>
                  <Select 
                    value={newTest.campaign} 
                    onValueChange={(v) => setNewTest({ ...newTest, campaign: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2026 - High Value Recovery">Q1 2026 - High Value Recovery</SelectItem>
                      <SelectItem value="Payment Reminder - 30 Days">Payment Reminder - 30 Days</SelectItem>
                      <SelectItem value="Legacy Accounts">Legacy Accounts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Variant A Name</Label>
                  <Input
                    value={newTest.variantAName}
                    onChange={(e) => setNewTest({ ...newTest, variantAName: e.target.value })}
                  />
                  <Label>Script</Label>
                  <Textarea
                    placeholder="Enter the script for Variant A..."
                    value={newTest.variantAScript}
                    onChange={(e) => setNewTest({ ...newTest, variantAScript: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Variant B Name</Label>
                  <Input
                    value={newTest.variantBName}
                    onChange={(e) => setNewTest({ ...newTest, variantBName: e.target.value })}
                  />
                  <Label>Script</Label>
                  <Textarea
                    placeholder="Enter the script for Variant B..."
                    value={newTest.variantBScript}
                    onChange={(e) => setNewTest({ ...newTest, variantBScript: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Traffic Split (%)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={90}
                    value={newTest.trafficSplit}
                    onChange={(e) => setNewTest({ ...newTest, trafficSplit: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {newTest.trafficSplit}% to A, {100 - newTest.trafficSplit}% to B
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Min Sample Size</Label>
                  <Input
                    type="number"
                    min={100}
                    value={newTest.minSampleSize}
                    onChange={(e) => setNewTest({ ...newTest, minSampleSize: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum calls per variant for statistical significance
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleCreateTest}
              >
                <Zap className="w-4 h-4 mr-2" />
                Start Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
