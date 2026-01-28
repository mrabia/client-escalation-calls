/**
 * MOJAVOX Interactive Tutorial Component
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Step-by-step guided tours
 * - Highlight elements
 * - Progress tracking
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useState, useEffect, createContext, useContext } from "react";
import { useLocation } from "wouter";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetPath?: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTutorial: (tutorialId: string) => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completedTutorials: string[];
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}

const tutorials: Record<string, TutorialStep[]> = {
  dashboard: [
    {
      id: "welcome",
      title: "Welcome to MOJAVOX",
      description: "Let's take a quick tour of your AI-powered collection platform. This dashboard gives you an overview of all your collection activities.",
      targetPath: "/dashboard",
    },
    {
      id: "live-monitor",
      title: "Live Monitor",
      description: "Watch your AI agents in action! The Live Monitor shows real-time calls, agent status, and allows you to intervene when needed.",
      targetPath: "/live-monitor",
    },
    {
      id: "campaigns",
      title: "Campaign Management",
      description: "Create and manage collection campaigns. Set targets, assign agents, and track recovery progress in real-time.",
      targetPath: "/campaigns",
    },
    {
      id: "fleet",
      title: "AI Fleet",
      description: "Your army of AI agents. Monitor their performance, configure voice settings, and manage their workload.",
      targetPath: "/fleet",
    },
    {
      id: "analytics",
      title: "Analytics & Reports",
      description: "Deep dive into your performance metrics. Track recovery rates, agent efficiency, and generate detailed reports.",
      targetPath: "/analytics",
    },
    {
      id: "complete",
      title: "You're All Set!",
      description: "You've completed the tour. Explore the platform and don't hesitate to check the Help section if you need assistance.",
      targetPath: "/dashboard",
    },
  ],
  campaign: [
    {
      id: "start",
      title: "Creating a Campaign",
      description: "Let's walk through creating your first collection campaign. Click 'New Campaign' to get started.",
      targetPath: "/campaigns",
    },
    {
      id: "wizard",
      title: "Campaign Wizard",
      description: "The wizard guides you through 5 steps: Basic Info, Targets, Agents, Parameters, and Review.",
      targetPath: "/campaign-wizard",
    },
  ],
};

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("mojavox_completed_tutorials");
    if (saved) {
      setCompletedTutorials(JSON.parse(saved));
    }
  }, []);

  const steps = currentTutorial ? tutorials[currentTutorial] || [] : [];
  const totalSteps = steps.length;

  const startTutorial = (tutorialId: string) => {
    if (tutorials[tutorialId]) {
      setCurrentTutorial(tutorialId);
      setCurrentStep(0);
      setIsActive(true);
      const firstStep = tutorials[tutorialId][0];
      if (firstStep.targetPath) {
        setLocation(firstStep.targetPath);
      }
    }
  };

  const endTutorial = () => {
    if (currentTutorial && currentStep === totalSteps - 1) {
      const newCompleted = [...completedTutorials, currentTutorial];
      setCompletedTutorials(newCompleted);
      localStorage.setItem("mojavox_completed_tutorials", JSON.stringify(newCompleted));
    }
    setIsActive(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      const nextStepData = steps[currentStep + 1];
      setCurrentStep(currentStep + 1);
      if (nextStepData.targetPath) {
        setLocation(nextStepData.targetPath);
      }
    } else {
      endTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStepData = steps[currentStep - 1];
      setCurrentStep(currentStep - 1);
      if (prevStepData.targetPath) {
        setLocation(prevStepData.targetPath);
      }
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
        completedTutorials,
      }}
    >
      {children}
      {isActive && currentTutorial && steps[currentStep] && (
        <TutorialOverlay
          step={steps[currentStep]}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={endTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
}

interface TutorialOverlayProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function TutorialOverlay({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onClose,
}: TutorialOverlayProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
      
      {/* Tutorial Card */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <Card className="bg-card border-neon-green/30 shadow-lg shadow-neon-green/10">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {totalSteps}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-1 mb-4" />

            {/* Content */}
            <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
            <p className="text-muted-foreground mb-6">{step.description}</p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={onPrev}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={onNext}
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default TutorialProvider;
