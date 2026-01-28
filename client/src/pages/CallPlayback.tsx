/**
 * MOJAVOX Call Playback Page
 * Style: Cyberpunk Corporate
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Clock,
  Download,
  FileAudio,
  FileText,
  Flag,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const transcript = [
  { time: "0:00", speaker: "AI", text: "Good morning, this is Sarah from Acme Collections regarding your account.", sentiment: "neutral" },
  { time: "0:08", speaker: "Debtor", text: "Yes, I know why you're calling.", sentiment: "negative" },
  { time: "0:12", speaker: "AI", text: "I understand this can be stressful. I'm here to help find a solution that works for you.", sentiment: "positive" },
  { time: "0:20", speaker: "Debtor", text: "I just lost my job last month. I can't pay the full amount.", sentiment: "negative" },
  { time: "0:28", speaker: "AI", text: "I'm sorry to hear that. Let me see what options we have available for your situation.", sentiment: "positive" },
  { time: "0:35", speaker: "Debtor", text: "What kind of options?", sentiment: "neutral" },
  { time: "0:38", speaker: "AI", text: "We can set up a payment plan. Would $200 per month for 12 months work for you?", sentiment: "positive" },
  { time: "0:48", speaker: "Debtor", text: "That's still a lot. Can we do $150?", sentiment: "neutral" },
  { time: "0:52", speaker: "AI", text: "Let me check... Yes, I can approve $150 per month for 16 months. Does that work?", sentiment: "positive" },
  { time: "1:02", speaker: "Debtor", text: "Yes, that would be much better. Thank you for understanding.", sentiment: "positive" },
];

export default function CallPlayback() {
  const [, setLocation] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  
  // Dialog states
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Form states
  const [flagForm, setFlagForm] = useState({
    reason: "review",
    notes: "",
  });
  const [exportFormat, setExportFormat] = useState("mp3");
  
  const handleFlag = () => {
    toast.success("Call flagged", {
      description: `This call has been flagged for ${flagForm.reason === "review" ? "review" : flagForm.reason === "compliance" ? "compliance check" : "training purposes"}.`,
    });
    setFlagDialogOpen(false);
    setFlagForm({ reason: "review", notes: "" });
  };
  
  const handleExport = () => {
    toast.success("Export started", {
      description: `Downloading call recording as ${exportFormat.toUpperCase()}...`,
    });
    setExportDialogOpen(false);
  };
  
  const handleSkipBack = () => {
    setProgress(Math.max(0, progress - 10));
  };
  
  const handleSkipForward = () => {
    setProgress(Math.min(100, progress + 10));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/debtors")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Call Recording #4521</h1>
          <p className="text-muted-foreground">John Smith • Jan 15, 2026 at 10:32 AM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waveform & Controls */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="data-card">
            <CardContent className="p-6">
              {/* Waveform Visualization */}
              <div className="h-24 bg-muted/50 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-center gap-0.5 px-4">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full transition-all",
                        i < progress ? "bg-neon-green" : "bg-muted-foreground/30"
                      )}
                      style={{ height: `${Math.random() * 60 + 20}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Slider
                  value={[progress]}
                  onValueChange={(v) => setProgress(v[0])}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-sm text-muted-foreground font-mono">
                  <span>0:42</span>
                  <span>2:05</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button variant="ghost" size="icon" onClick={handleSkipBack}>
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  className="w-14 h-14 rounded-full bg-neon-green text-background hover:bg-neon-green/90"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSkipForward}>
                  <SkipForward className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 ml-4">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Slider defaultValue={[80]} max={100} className="w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="text-sm">Transcript</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto space-y-3">
              {transcript.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg",
                    line.speaker === "AI" ? "bg-neon-blue/10 ml-0 mr-12" : "bg-muted ml-12 mr-0"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{line.time}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      line.speaker === "AI" ? "text-neon-blue" : "text-foreground"
                    )}>
                      {line.speaker}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      line.sentiment === "positive" && "bg-neon-green/20 text-neon-green",
                      line.sentiment === "negative" && "bg-neon-pink/20 text-neon-pink",
                      line.sentiment === "neutral" && "bg-muted text-muted-foreground"
                    )}>
                      {line.sentiment}
                    </span>
                  </div>
                  <p className="text-sm">{line.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Call Details */}
        <div className="space-y-4">
          <Card className="data-card">
            <CardHeader>
              <CardTitle className="text-sm">Call Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-mono">2:05</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agent</span>
                <span className="text-neon-blue">NOVA-01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outcome</span>
                <span className="text-neon-green">Payment Plan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono">$2,400</span>
              </div>
            </CardContent>
          </Card>

          <Card className="data-card">
            <CardHeader>
              <CardTitle className="text-sm">AI Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Empathy Score</span>
                  <span className="text-neon-green">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Compliance</span>
                  <span className="text-neon-green">100%</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Negotiation</span>
                  <span className="text-neon-blue">85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setFlagDialogOpen(true)}>
              <Flag className="w-4 h-4 mr-2" />
              Flag
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setExportDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-neon-yellow" />
              Flag Call Recording
            </DialogTitle>
            <DialogDescription>
              Flag this call for review or training purposes
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Flag Reason</Label>
              <Select value={flagForm.reason} onValueChange={(v) => setFlagForm({ ...flagForm, reason: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="review">Quality Review</SelectItem>
                  <SelectItem value="compliance">Compliance Issue</SelectItem>
                  <SelectItem value="training">Training Example</SelectItem>
                  <SelectItem value="escalation">Needs Escalation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any additional notes about why this call is being flagged..."
                value={flagForm.notes}
                onChange={(e) => setFlagForm({ ...flagForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">
                Flagged calls will be reviewed by a supervisor within 24 hours.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-yellow text-background hover:bg-neon-yellow/90"
              onClick={handleFlag}
            >
              <Flag className="w-4 h-4 mr-2" />
              Flag Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-neon-blue" />
              Export Call Recording
            </DialogTitle>
            <DialogDescription>
              Choose export format and options
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={exportFormat === "mp3" ? "default" : "outline"}
                  className={exportFormat === "mp3" ? "bg-neon-blue text-white" : ""}
                  onClick={() => setExportFormat("mp3")}
                >
                  <FileAudio className="w-4 h-4 mr-2" />
                  MP3 Audio
                </Button>
                <Button
                  variant={exportFormat === "wav" ? "default" : "outline"}
                  className={exportFormat === "wav" ? "bg-neon-blue text-white" : ""}
                  onClick={() => setExportFormat("wav")}
                >
                  <FileAudio className="w-4 h-4 mr-2" />
                  WAV Audio
                </Button>
                <Button
                  variant={exportFormat === "txt" ? "default" : "outline"}
                  className={exportFormat === "txt" ? "bg-neon-blue text-white" : ""}
                  onClick={() => setExportFormat("txt")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Transcript
                </Button>
                <Button
                  variant={exportFormat === "pdf" ? "default" : "outline"}
                  className={exportFormat === "pdf" ? "bg-neon-blue text-white" : ""}
                  onClick={() => setExportFormat("pdf")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Report
                </Button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Call ID:</span>
                <span className="font-mono">#4521</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-mono">2:05</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
