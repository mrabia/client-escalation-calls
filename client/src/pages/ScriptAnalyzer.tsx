/**
 * MOJAVOX Script Analyzer Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Script performance metrics
 * - Keyword analysis
 * - Success rate by script section
 * - Recommendations for improvement
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  BarChart3,
  CheckCircle,
  FileText,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Search,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/ui/page-transition";

interface ScriptSection {
  name: string;
  successRate: number;
  avgDuration: string;
  dropOffRate: number;
  sentiment: "positive" | "neutral" | "negative";
}

interface KeywordAnalysis {
  keyword: string;
  frequency: number;
  successCorrelation: number;
  trend: "up" | "down" | "stable";
}

interface ScriptPerformance {
  id: string;
  name: string;
  type: string;
  totalCalls: number;
  successRate: number;
  avgCallDuration: string;
  conversionRate: number;
  sections: ScriptSection[];
}

const mockScripts: ScriptPerformance[] = [
  {
    id: "script_1",
    name: "Standard Collection - Friendly",
    type: "friendly",
    totalCalls: 12450,
    successRate: 68,
    avgCallDuration: "3:45",
    conversionRate: 42,
    sections: [
      { name: "Opening", successRate: 92, avgDuration: "0:25", dropOffRate: 8, sentiment: "positive" },
      { name: "Identification", successRate: 88, avgDuration: "0:35", dropOffRate: 4, sentiment: "neutral" },
      { name: "Purpose Statement", successRate: 75, avgDuration: "0:45", dropOffRate: 13, sentiment: "neutral" },
      { name: "Negotiation", successRate: 58, avgDuration: "1:30", dropOffRate: 17, sentiment: "negative" },
      { name: "Closing", successRate: 85, avgDuration: "0:30", dropOffRate: 2, sentiment: "positive" },
    ],
  },
  {
    id: "script_2",
    name: "Urgent Collection - Firm",
    type: "firm",
    totalCalls: 8320,
    successRate: 54,
    avgCallDuration: "2:58",
    conversionRate: 35,
    sections: [
      { name: "Opening", successRate: 85, avgDuration: "0:20", dropOffRate: 15, sentiment: "neutral" },
      { name: "Identification", successRate: 82, avgDuration: "0:30", dropOffRate: 3, sentiment: "neutral" },
      { name: "Purpose Statement", successRate: 68, avgDuration: "0:40", dropOffRate: 14, sentiment: "negative" },
      { name: "Negotiation", successRate: 45, avgDuration: "1:15", dropOffRate: 23, sentiment: "negative" },
      { name: "Closing", successRate: 78, avgDuration: "0:25", dropOffRate: 5, sentiment: "neutral" },
    ],
  },
  {
    id: "script_3",
    name: "Payment Plan Offer",
    type: "payment_plan",
    totalCalls: 5680,
    successRate: 72,
    avgCallDuration: "4:12",
    conversionRate: 48,
    sections: [
      { name: "Opening", successRate: 94, avgDuration: "0:30", dropOffRate: 6, sentiment: "positive" },
      { name: "Identification", successRate: 90, avgDuration: "0:35", dropOffRate: 4, sentiment: "neutral" },
      { name: "Purpose Statement", successRate: 82, avgDuration: "0:50", dropOffRate: 8, sentiment: "positive" },
      { name: "Plan Options", successRate: 75, avgDuration: "1:45", dropOffRate: 7, sentiment: "positive" },
      { name: "Closing", successRate: 88, avgDuration: "0:35", dropOffRate: 3, sentiment: "positive" },
    ],
  },
];

const mockKeywords: KeywordAnalysis[] = [
  { keyword: "payment plan", frequency: 3420, successCorrelation: 78, trend: "up" },
  { keyword: "understand", frequency: 8950, successCorrelation: 72, trend: "up" },
  { keyword: "help you", frequency: 7230, successCorrelation: 68, trend: "stable" },
  { keyword: "today", frequency: 12400, successCorrelation: 45, trend: "down" },
  { keyword: "immediately", frequency: 2180, successCorrelation: 32, trend: "down" },
  { keyword: "flexible", frequency: 4560, successCorrelation: 75, trend: "up" },
  { keyword: "legal action", frequency: 890, successCorrelation: 18, trend: "down" },
  { keyword: "appreciate", frequency: 5670, successCorrelation: 65, trend: "stable" },
];

const recommendations = [
  {
    type: "success",
    title: "Increase use of 'payment plan' phrase",
    description: "Scripts mentioning payment plans have 78% higher success correlation",
    impact: "High",
  },
  {
    type: "warning",
    title: "Reduce urgency language in opening",
    description: "Words like 'immediately' and 'today' correlate with 23% higher drop-off",
    impact: "Medium",
  },
  {
    type: "success",
    title: "Extend negotiation phase",
    description: "Calls with longer negotiation phases show 15% better conversion",
    impact: "High",
  },
  {
    type: "warning",
    title: "Avoid 'legal action' mentions",
    description: "This phrase has only 18% success correlation and increases hostility",
    impact: "High",
  },
];

export default function ScriptAnalyzer() {
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState<string>("script_1");
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");

  const handleRefreshAnalysis = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
    setRefreshDialogOpen(false);
    toast.success("Analysis refreshed", { description: "All metrics have been updated" });
  };

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setGeneratedScript(`// Optimized Script for ${currentScript?.name || 'Collection'}\n\n[Opening]\nHello, this is {{agent_name}} calling from {{company_name}}.\nI'm reaching out regarding your account ending in {{account_last4}}.\n\n[Verification]\nFor security purposes, may I please verify your date of birth?\n\n[Main Message]\nI see there's a balance of {{balance}} on your account.\nWe have some flexible options available to help you resolve this today.\n\n[Payment Options]\n- Option 1: Pay in full and receive a 10% discount\n- Option 2: Set up a 3-month payment plan\n- Option 3: Make a partial payment today\n\n[Closing - Success]\nThank you for taking care of this today. You'll receive a confirmation email shortly.\n\n[Closing - Follow-up]\nI understand. I'll note this on your account. When would be a better time to discuss your options?`);
    setIsGenerating(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const currentScript = mockScripts.find(s => s.id === selectedScript) || mockScripts[0];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-neon-green";
      case "negative": return "text-red-400";
      default: return "text-amber-400";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <ThumbsUp className="w-4 h-4" />;
      case "negative": return <ThumbsDown className="w-4 h-4" />;
      default: return <ArrowRight className="w-4 h-4" />;
    }
  };

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
                <Search className="w-6 h-6 text-background" />
              </div>
              Script Analyzer
            </h1>
            <p className="text-muted-foreground mt-1">Analyze and optimize AI agent scripts</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedScript} onValueChange={setSelectedScript}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select script" />
              </SelectTrigger>
              <SelectContent>
                {mockScripts.map(script => (
                  <SelectItem key={script.id} value={script.id}>{script.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setRefreshDialogOpen(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Script Stats */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={currentScript.totalCalls} />
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={currentScript.successRate} />%
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    <AnimatedCounter value={currentScript.conversionRate} />%
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
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {currentScript.avgCallDuration}
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        <Tabs defaultValue="sections" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="sections">Script Sections</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Section Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentScript.sections.map((section, index) => (
                    <div key={section.name} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{section.name}</p>
                            <p className="text-sm text-muted-foreground">Avg: {section.avgDuration}</p>
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-1", getSentimentColor(section.sentiment))}>
                          {getSentimentIcon(section.sentiment)}
                          <span className="text-sm capitalize">{section.sentiment}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className="text-foreground">{section.successRate}%</span>
                          </div>
                          <Progress value={section.successRate} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Drop-off Rate</span>
                            <span className={section.dropOffRate > 15 ? "text-red-400" : "text-foreground"}>
                              {section.dropOffRate}%
                            </span>
                          </div>
                          <Progress 
                            value={section.dropOffRate} 
                            className={cn("h-2", section.dropOffRate > 15 && "[&>div]:bg-red-400")} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Keyword Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockKeywords.map((kw) => (
                    <div key={kw.keyword} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">"{kw.keyword}"</Badge>
                        <span className="text-sm text-muted-foreground">{kw.frequency.toLocaleString()} uses</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Success Correlation</p>
                          <p className={cn(
                            "font-semibold",
                            kw.successCorrelation >= 60 ? "text-neon-green" :
                            kw.successCorrelation >= 40 ? "text-amber-400" : "text-red-400"
                          )}>
                            {kw.successCorrelation}%
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {kw.trend === "up" && <TrendingUp className="w-4 h-4 text-neon-green" />}
                          {kw.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                          {kw.trend === "stable" && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "p-4 rounded-lg border",
                        rec.type === "success" 
                          ? "bg-neon-green/5 border-neon-green/30" 
                          : "bg-amber-500/5 border-amber-500/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {rec.type === "success" ? (
                          <CheckCircle className="w-5 h-5 text-neon-green mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{rec.title}</p>
                            <Badge variant={rec.impact === "High" ? "default" : "secondary"}>
                              {rec.impact} Impact
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full mt-4 bg-neon-green text-background hover:bg-neon-green/90"
                  onClick={() => { setGeneratedScript(""); setGenerateDialogOpen(true); }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Optimized Script
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Refresh Analysis Dialog */}
        <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-neon-blue" />
                Refresh Analysis
              </DialogTitle>
              <DialogDescription>
                Re-analyze the script performance with latest call data
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Script:</span>
                  <span className="font-medium">{currentScript.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Calls:</span>
                  <span className="font-mono">{currentScript.totalCalls.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>2 hours ago</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This will fetch the latest call recordings and update all metrics including success rates, keyword analysis, and recommendations.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefreshDialogOpen(false)} disabled={isRefreshing}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-blue text-white hover:bg-neon-blue/90"
                onClick={handleRefreshAnalysis}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Refreshing...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Refresh Now</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Optimized Script Dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-neon-green" />
                Generate Optimized Script
              </DialogTitle>
              <DialogDescription>
                AI-generated script based on performance analysis and recommendations
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {!generatedScript ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">Optimization will include:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Replace low-performing phrases with high-success alternatives</li>
                      <li>• Optimize section flow based on drop-off analysis</li>
                      <li>• Incorporate top-performing keywords</li>
                      <li>• Apply sentiment improvements</li>
                    </ul>
                  </div>
                  <Button 
                    className="w-full bg-neon-green text-background hover:bg-neon-green/90"
                    onClick={handleGenerateScript}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <><Zap className="w-4 h-4 mr-2 animate-pulse" /> Generating Script...</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Generate Script</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-neon-green">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Script Generated Successfully</span>
                  </div>
                  <ScrollArea className="h-[300px] rounded-lg border border-border">
                    <Textarea
                      value={generatedScript}
                      onChange={(e) => setGeneratedScript(e.target.value)}
                      className="min-h-[300px] font-mono text-sm border-0 resize-none"
                    />
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedScript);
                        toast.success("Script copied to clipboard");
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                    <Button 
                      className="flex-1 bg-neon-green text-background hover:bg-neon-green/90"
                      onClick={() => {
                        toast.success("Script saved", { description: "New script has been saved to your library" });
                        setGenerateDialogOpen(false);
                      }}
                    >
                      Save Script
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
