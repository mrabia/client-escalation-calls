/**
 * MOJAVOX Live Monitor
 * Style: Cyberpunk Corporate
 * 
 * Real-time call supervision with transcript and AI brain visualization.
 * Enhanced with loading states, animations, and confirmation modals.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedProgress } from "@/components/ui/page-transition";
import { CallCardSkeleton } from "@/components/ui/skeleton-loaders";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockLiveCalls, mockTranscript } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneOff,
  Play,
  Volume2,
} from "lucide-react";
import { useState, useEffect } from "react";

function CallCard({
  call,
  isSelected,
  onClick,
}: {
  call: (typeof mockLiveCalls)[0];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all duration-150 hover:scale-[1.02]",
        isSelected
          ? "bg-neon-green/10 border-neon-green"
          : "bg-card border-border hover:border-neon-green/30"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-neon-blue" />
          <span className="font-mono text-sm text-neon-blue">{call.agentName}</span>
        </div>
        <Badge variant="outline" className="border-neon-green text-neon-green">
          <Activity className="w-3 h-3 mr-1 animate-pulse" />
          Live
        </Badge>
      </div>

      <h3 className="font-medium mb-1">{call.debtorName}</h3>
      <p className="text-sm text-muted-foreground mb-3">{call.contactName}</p>

      <div className="flex items-center justify-between text-sm">
        <span className="font-mono">
          {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, "0")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Sentiment:</span>
          <div
            className={cn(
              "w-16 h-2 rounded-full overflow-hidden bg-muted"
            )}
          >
            <div
              className={cn(
                "h-full transition-all duration-500",
                call.sentiment > 0.6 ? "bg-neon-green" : call.sentiment > 0.4 ? "bg-neon-yellow" : "bg-neon-pink"
              )}
              style={{ width: `${call.sentiment * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TranscriptPanel({ call }: { call: (typeof mockLiveCalls)[0] | null }) {
  const [transcriptLoading, setTranscriptLoading] = useState(true);

  useEffect(() => {
    setTranscriptLoading(true);
    const timer = setTimeout(() => setTranscriptLoading(false), 800);
    return () => clearTimeout(timer);
  }, [call?.id]);

  if (!call) {
    return (
      <Card className="data-card h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[500px]">
          <div className="text-center text-muted-foreground">
            <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a call to view transcript</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="data-card h-full flex flex-col">
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Live Transcript
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Volume control", { description: "Adjusting call volume..." })}>
              <Volume2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Microphone", { description: "Supervisor mic is muted" })}>
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] p-4">
          {transcriptLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "flex-row" : "flex-row-reverse")}>
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className={cn("flex-1 p-3 rounded-lg bg-muted/50 animate-pulse", i % 2 === 0 ? "mr-12" : "ml-12")}>
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-3 w-1/4 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {mockTranscript.map((entry, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                    entry.speaker === "agent" ? "flex-row" : "flex-row-reverse"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      entry.speaker === "agent"
                        ? "bg-neon-blue/20"
                        : "bg-muted"
                    )}
                  >
                    {entry.speaker === "agent" ? (
                      <Bot className="w-4 h-4 text-neon-blue" />
                    ) : (
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 p-3 rounded-lg",
                      entry.speaker === "agent"
                        ? "bg-neon-blue/10 border border-neon-blue/20"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{entry.text}</p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {entry.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AIBrainPanel({ call }: { call: (typeof mockLiveCalls)[0] | null }) {
  const [brainLoading, setBrainLoading] = useState(true);

  useEffect(() => {
    setBrainLoading(true);
    const timer = setTimeout(() => setBrainLoading(false), 600);
    return () => clearTimeout(timer);
  }, [call?.id]);

  if (!call) return null;

  const decisions = [
    { label: "Strategy", value: "Empathetic Negotiation", confidence: 85 },
    { label: "Next Action", value: "Offer Payment Plan", confidence: 92 },
    { label: "Discount Limit", value: "Up to 15%", confidence: 100 },
    { label: "Risk Assessment", value: "Medium", confidence: 78 },
  ];

  return (
    <Card className="data-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="w-4 h-4 text-neon-purple" />
          AI Brain
          <span className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {brainLoading ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-5 w-32 bg-muted rounded" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-3 w-8 bg-muted rounded" />
                </div>
                <div className="h-1 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Topic */}
            <div className="p-3 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
              <span className="text-xs text-muted-foreground">Current Topic</span>
              <p className="font-medium text-neon-purple capitalize">
                {call.currentTopic.replace("_", " ")}
              </p>
            </div>

            {/* Decisions */}
            <div className="space-y-3">
              {decisions.map((decision, index) => (
                <div 
                  key={index} 
                  className="space-y-1 animate-in fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{decision.label}</span>
                    <span className="font-mono text-xs">{decision.confidence}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AnimatedProgress value={decision.confidence} />
                    <span className="text-sm font-medium min-w-[100px] text-right">
                      {decision.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Amount Being Discussed */}
            <div className="pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">Amount Discussed</span>
              <p className="text-2xl font-display font-bold text-neon-green">
                ${call.amountDiscussed.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ControlPanel({ 
  call, 
  onTakeOver,
  onEndCall,
  onFlag,
}: { 
  call: (typeof mockLiveCalls)[0] | null;
  onTakeOver: () => void;
  onEndCall: () => void;
  onFlag: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  if (!call) return null;

  const handleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Call unmuted" : "Call muted", {
      description: isMuted ? "You can now hear the conversation." : "The call audio has been muted.",
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? "AI resumed" : "AI paused", {
      description: isPaused ? "AI agent has resumed the conversation." : "AI agent is paused. Manual intervention may be needed.",
    });
  };

  return (
    <Card className="data-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Call Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className={cn(
              "h-16 flex-col gap-1 transition-all",
              isMuted && "bg-neon-pink/10 border-neon-pink text-neon-pink"
            )}
            onClick={handleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-xs">{isMuted ? "Unmute" : "Mute"}</span>
          </Button>

          <Button
            variant="outline"
            className={cn(
              "h-16 flex-col gap-1 transition-all",
              isPaused && "bg-neon-yellow/10 border-neon-yellow text-neon-yellow"
            )}
            onClick={handlePause}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            <span className="text-xs">{isPaused ? "Resume" : "Pause"}</span>
          </Button>

          <Button
            variant="outline"
            className="h-16 flex-col gap-1 hover:bg-neon-blue/10 hover:border-neon-blue hover:text-neon-blue"
            onClick={onTakeOver}
          >
            <Phone className="w-5 h-5" />
            <span className="text-xs">Take Over</span>
          </Button>

          <Button
            variant="outline"
            className="h-16 flex-col gap-1 hover:bg-neon-pink/10 hover:border-neon-pink hover:text-neon-pink"
            onClick={onEndCall}
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs">End Call</span>
          </Button>
        </div>

        {/* Alert Button */}
        <Button
          variant="outline"
          className="w-full mt-3 border-neon-yellow text-neon-yellow hover:bg-neon-yellow/10"
          onClick={onFlag}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Flag for Review
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LiveMonitor() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(
    mockLiveCalls[0]?.id || null
  );
  const [loading, setLoading] = useState(true);

  // Confirmation dialogs
  const [takeOverDialogOpen, setTakeOverDialogOpen] = useState(false);
  const [endCallDialogOpen, setEndCallDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

  const selectedCall = mockLiveCalls.find((c) => c.id === selectedCallId) || null;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const confirmTakeOver = () => {
    toast.success("Call transferred", {
      description: "You have taken over the call. The AI agent has been disconnected.",
    });
  };

  const confirmEndCall = () => {
    toast.success("Call ended", {
      description: "The call has been terminated. A summary will be generated.",
    });
  };

  const confirmFlag = () => {
    toast.warning("Call flagged", {
      description: "This call has been flagged for supervisor review.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CallCardSkeleton key={i} />
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="h-[500px] bg-card border border-border rounded-lg animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
            <div className="h-48 bg-card border border-border rounded-lg animate-pulse" />
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
              <Activity className="w-6 h-6 text-neon-green pulse-live" />
              Live Monitor
            </h1>
            <p className="text-muted-foreground">
              Real-time supervision of active calls
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2 border-neon-green text-neon-green">
            {mockLiveCalls.length} Active Calls
          </Badge>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Call List */}
          <StaggerContainer className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Active Calls</h2>
            {mockLiveCalls.map((call) => (
              <StaggerItem key={call.id}>
                <CallCard
                  call={call}
                  isSelected={selectedCallId === call.id}
                  onClick={() => setSelectedCallId(call.id)}
                />
              </StaggerItem>
            ))}

            {mockLiveCalls.length === 0 && (
              <Card className="data-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No active calls</p>
                </CardContent>
              </Card>
            )}
          </StaggerContainer>

          {/* Transcript */}
          <div className="lg:col-span-2">
            <TranscriptPanel call={selectedCall} />
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <AIBrainPanel call={selectedCall} />
            <ControlPanel 
              call={selectedCall} 
              onTakeOver={() => setTakeOverDialogOpen(true)}
              onEndCall={() => setEndCallDialogOpen(true)}
              onFlag={() => setFlagDialogOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={takeOverDialogOpen}
        onOpenChange={setTakeOverDialogOpen}
        title="Take Over Call"
        description="You are about to take over this call from the AI agent. The debtor will be transferred to you directly. Make sure you are ready to continue the conversation. Proceed?"
        confirmText="Take Over"
        variant="default"
        onConfirm={confirmTakeOver}
      />

      <ConfirmDialog
        open={endCallDialogOpen}
        onOpenChange={setEndCallDialogOpen}
        title="End Call"
        description="This will immediately terminate the call. The debtor will hear a disconnect tone. A call summary and transcript will be saved. Are you sure you want to end this call?"
        confirmText="End Call"
        variant="danger"
        onConfirm={confirmEndCall}
      />

      <ConfirmDialog
        open={flagDialogOpen}
        onOpenChange={setFlagDialogOpen}
        title="Flag for Review"
        description="This call will be flagged for supervisor review. The recording and transcript will be highlighted in the review queue. Add any notes?"
        confirmText="Flag Call"
        variant="warning"
        onConfirm={confirmFlag}
      />
    </PageTransition>
  );
}
