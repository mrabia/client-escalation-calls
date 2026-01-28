/**
 * MOJAVOX Onboarding Wizard
 * Style: Cyberpunk Corporate
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bot,
  Building,
  Check,
  Phone,
  Settings,
  Upload,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const steps = [
  { id: 1, title: "Organization", icon: Building },
  { id: 2, title: "Integration", icon: Phone },
  { id: 3, title: "AI Setup", icon: Bot },
  { id: 4, title: "Launch", icon: Zap },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
              <Bot className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">MOJAVOX</h1>
              <p className="text-xs text-muted-foreground">Setup Wizard</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            Skip Setup
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-border">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  currentStep > step.id && "bg-neon-green border-neon-green",
                  currentStep === step.id && "border-neon-green text-neon-green",
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
                    "w-24 h-0.5 mx-2",
                    currentStep > step.id ? "bg-neon-green" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2">Organization Details</h2>
                <p className="text-muted-foreground">Tell us about your company</p>
              </div>
              <Card className="data-card">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input placeholder="Acme Collections Inc." className="bg-background" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input placeholder="Financial Services" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Size</Label>
                      <Input placeholder="50-200 employees" className="bg-background" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Contact Email</Label>
                    <Input placeholder="admin@company.com" className="bg-background" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2">Telephony Integration</h2>
                <p className="text-muted-foreground">Connect your phone system</p>
              </div>
              <Card className="data-card">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Twilio", "Vonage", "Plivo", "Custom SIP"].map((provider) => (
                      <button
                        key={provider}
                        className="p-4 rounded-lg border border-border hover:border-neon-green hover:bg-neon-green/5 transition-colors text-left"
                      >
                        <Phone className="w-6 h-6 text-neon-blue mb-2" />
                        <p className="font-medium">{provider}</p>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4">
                    <Label>API Key</Label>
                    <Input placeholder="sk_live_..." type="password" className="bg-background" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2">AI Agent Configuration</h2>
                <p className="text-muted-foreground">Set up your first AI agent</p>
              </div>
              <Card className="data-card">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Agent Name</Label>
                    <Input placeholder="NOVA-01" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Voice Profile</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Professional", "Empathetic", "Assertive"].map((voice) => (
                        <button
                          key={voice}
                          className="p-3 rounded-lg border border-border hover:border-neon-green text-sm"
                        >
                          {voice}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Upload Scripts (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-neon-green/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-neon-green" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Ready to Launch!</h2>
                <p className="text-muted-foreground">Your MOJAVOX platform is configured</p>
              </div>
              <Card className="data-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {[
                      "Organization profile created",
                      "Twilio integration connected",
                      "AI agent NOVA-01 configured",
                      "Compliance settings enabled",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-neon-green/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-neon-green" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="bg-neon-green text-background hover:bg-neon-green/90"
            >
              {currentStep === steps.length ? "Launch Dashboard" : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
