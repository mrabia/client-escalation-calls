/**
 * MOJAVOX Agent Deployment Wizard
 * Style: Cyberpunk Corporate
 * Enhanced with loading states, animations, and confirmation modals.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition, AnimatedProgress } from "@/components/ui/page-transition";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  Check,
  Home,
  Loader2,
  Mic,
  Settings,
  Shield,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const steps = [
  { id: 1, title: "Identity Core", icon: Bot },
  { id: 2, title: "Voice Synthesis", icon: Mic },
  { id: 3, title: "Guardrails", icon: Shield },
  { id: 4, title: "Knowledge", icon: Brain },
];

const archetypes = [
  { id: "empathetic", name: "Empathetic", desc: "Understanding, patient, supportive", color: "neon-green" },
  { id: "professional", name: "Professional", desc: "Formal, efficient, direct", color: "neon-blue" },
  { id: "assertive", name: "Assertive", desc: "Confident, firm, results-driven", color: "neon-yellow" },
];

const voices = [
  { id: "sarah", name: "Sarah", type: "Female • Warm", sample: "Professional" },
  { id: "james", name: "James", type: "Male • Authoritative", sample: "Business" },
  { id: "emma", name: "Emma", type: "Female • Friendly", sample: "Conversational" },
  { id: "david", name: "David", type: "Male • Calm", sample: "Empathetic" },
];

export default function AgentWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedArchetype, setSelectedArchetype] = useState("empathetic");
  const [selectedVoice, setSelectedVoice] = useState("sarah");
  const [speed, setSpeed] = useState([50]);
  const [pitch, setPitch] = useState([50]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);

  // Confirmation dialogs
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  const progress = (currentStep / steps.length) * 100;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleStepChange = (newStep: number) => {
    setStepTransition(true);
    setTimeout(() => {
      setCurrentStep(newStep);
      setStepTransition(false);
    }, 200);
  };

  const handleTestVoice = () => {
    setTestingVoice(true);
    toast.info("Playing voice sample...", {
      description: `Testing ${voices.find(v => v.id === selectedVoice)?.name}'s voice.`,
    });
    setTimeout(() => setTestingVoice(false), 2000);
  };

  const handleExit = () => {
    setExitDialogOpen(true);
  };

  const confirmExit = () => {
    toast.info("Wizard cancelled", {
      description: "Your progress has not been saved.",
    });
    setLocation("/fleet");
  };

  const handleDeploy = () => {
    setDeployDialogOpen(true);
  };

  const confirmDeploy = () => {
    setDeploying(true);
    toast.info("Deploying agent...", {
      description: "This may take a few moments.",
    });
    setTimeout(() => {
      setDeploying(false);
      toast.success("Agent deployed successfully!", {
        description: "Your new AI agent is now online and ready to make calls.",
      });
      setLocation("/fleet");
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border p-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleExit} title="Back to Fleet">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-display font-bold">Deploy New Agent</h1>
                <p className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/")}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <Home className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleExit}
                className="text-muted-foreground hover:text-neon-pink"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <nav className="container py-3 border-b border-border bg-muted/20">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <button 
                onClick={() => setLocation("/")}
                className="text-muted-foreground hover:text-neon-green transition-colors"
              >
                Dashboard
              </button>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li>
              <button 
                onClick={handleExit}
                className="text-muted-foreground hover:text-neon-green transition-colors"
              >
                Agent Fleet
              </button>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li className="text-foreground">Deploy New Agent</li>
          </ol>
        </nav>

        {/* Progress Steps */}
        <div className="border-b border-border bg-muted/30">
          <div className="container py-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    currentStep > step.id && "bg-neon-green border-neon-green",
                    currentStep === step.id && "border-neon-green text-neon-green scale-110",
                    currentStep < step.id && "border-muted text-muted-foreground"
                  )}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5 text-background" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn(
                      "w-16 lg:w-24 h-0.5 mx-2 transition-all duration-500",
                      currentStep > step.id ? "bg-neon-green" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>
            <AnimatedProgress value={progress} className="h-1 mt-4 max-w-2xl mx-auto" />
          </div>
        </div>

        {/* Content */}
        <main className="container py-8">
          <div className={cn(
            "max-w-2xl mx-auto transition-all duration-200",
            stepTransition && "opacity-0 translate-y-4"
          )}>
            {/* Step 1: Identity */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <Bot className="w-12 h-12 text-neon-blue mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold">Identity Core</h2>
                  <p className="text-muted-foreground">Define your agent's personality</p>
                </div>

                <Card className="data-card">
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Agent Designation</Label>
                      <Input placeholder="NOVA-05" className="bg-background font-mono" />
                      <p className="text-xs text-muted-foreground">A unique identifier for your agent</p>
                    </div>

                    <div className="space-y-3">
                      <Label>Personality Archetype</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {archetypes.map((arch, index) => (
                          <button
                            key={arch.id}
                            onClick={() => setSelectedArchetype(arch.id)}
                            className={cn(
                              "p-4 rounded-lg border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                              selectedArchetype === arch.id
                                ? `border-${arch.color} bg-${arch.color}/10`
                                : "border-border hover:border-muted-foreground"
                            )}
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <p className="font-medium">{arch.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{arch.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Voice */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <Mic className="w-12 h-12 text-neon-green mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold">Voice Synthesis</h2>
                  <p className="text-muted-foreground">Select and calibrate voice output</p>
                </div>

                <Card className="data-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Voice Selection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {voices.map((voice, index) => (
                        <button
                          key={voice.id}
                          onClick={() => setSelectedVoice(voice.id)}
                          className={cn(
                            "p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 hover:scale-[1.02]",
                            selectedVoice === voice.id
                              ? "border-neon-green bg-neon-green/10"
                              : "border-border hover:border-muted-foreground"
                          )}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{voice.name}</p>
                            <p className="text-xs text-muted-foreground">{voice.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="data-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Voice Calibration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Speaking Speed</Label>
                        <span className="text-sm text-muted-foreground font-mono">{speed[0]}%</span>
                      </div>
                      <Slider value={speed} onValueChange={setSpeed} max={100} step={1} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slower</span>
                        <span>Faster</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Pitch</Label>
                        <span className="text-sm text-muted-foreground font-mono">{pitch[0]}%</span>
                      </div>
                      <Slider value={pitch} onValueChange={setPitch} max={100} step={1} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Lower</span>
                        <span>Higher</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleTestVoice}
                      disabled={testingVoice}
                    >
                      {testingVoice ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 mr-2" />
                          Test Voice Sample
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Guardrails */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <Shield className="w-12 h-12 text-neon-yellow mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold">Operational Guardrails</h2>
                  <p className="text-muted-foreground">Set limits and compliance rules</p>
                </div>

                <Card className="data-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max Discount (%)</Label>
                        <Input type="number" defaultValue="15" className="bg-background" />
                        <p className="text-xs text-muted-foreground">Maximum discount without approval</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Payment Plan (months)</Label>
                        <Input type="number" defaultValue="24" className="bg-background" />
                        <p className="text-xs text-muted-foreground">Longest payment plan allowed</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Payment Amount ($)</Label>
                        <Input type="number" defaultValue="50" className="bg-background" />
                        <p className="text-xs text-muted-foreground">Minimum acceptable payment</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Call Time Limit (min)</Label>
                        <Input type="number" defaultValue="15" className="bg-background" />
                        <p className="text-xs text-muted-foreground">Maximum call duration</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="data-card border-neon-yellow/30 bg-neon-yellow/5">
                  <CardContent className="p-4">
                    <p className="text-sm text-neon-yellow flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Offers exceeding these limits will require supervisor approval
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Knowledge */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <Brain className="w-12 h-12 text-neon-pink mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold">Knowledge Link</h2>
                  <p className="text-muted-foreground">Connect knowledge bases</p>
                </div>

                <Card className="data-card">
                  <CardContent className="p-6 space-y-4">
                    {["Company FAQ", "Legal Scripts", "Product Catalog", "Compliance Rules"].map((kb, index) => (
                      <div 
                        key={kb} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors animate-in fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <span>{kb}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toast.success(`${kb} connected`, { description: "Knowledge base linked successfully." })}
                        >
                          Connect
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="data-card border-neon-green/30 bg-neon-green/5">
                  <CardContent className="p-6 text-center">
                    <Zap className="w-10 h-10 text-neon-green mx-auto mb-3" />
                    <h3 className="font-display font-bold mb-2">Ready to Deploy</h3>
                    <p className="text-sm text-muted-foreground">Your agent is configured and ready</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  if (currentStep < steps.length) {
                    handleStepChange(currentStep + 1);
                  } else {
                    handleDeploy();
                  }
                }}
                className="bg-neon-green text-background hover:bg-neon-green/90"
                disabled={deploying}
              >
                {deploying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : currentStep === steps.length ? (
                  <>
                    Deploy Agent
                    <Zap className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={exitDialogOpen}
        onOpenChange={setExitDialogOpen}
        title="Exit Wizard"
        description="Your progress will not be saved. Are you sure you want to exit the agent deployment wizard?"
        confirmText="Exit"
        variant="warning"
        onConfirm={confirmExit}
      />

      <ConfirmDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        title="Deploy Agent"
        description="Your AI agent will be deployed and will start accepting calls immediately. Make sure all settings are correct. Deploy now?"
        confirmText="Deploy"
        variant="success"
        onConfirm={confirmDeploy}
      />
    </PageTransition>
  );
}
