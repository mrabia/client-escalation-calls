/**
 * Guided Tour Component
 * Interactive demo mode for new users with step-by-step feature walkthrough
 */

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  SkipForward,
  CheckCircle2,
  Sparkles,
  Bot,
  BarChart3,
  Phone,
  Users,
  Settings,
  CreditCard,
  Target,
  Zap,
} from 'lucide-react';
import { useLocation } from 'wouter';

// Tour step interface
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  targetPath?: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
  action?: string;
}

// Tour steps configuration
const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MOJAVOX',
    description: 'Your AI-powered debt collection platform. Let us show you around the key features that will help you maximize recovery rates.',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Command Center',
    description: 'Your real-time dashboard shows key metrics: total recovered, active calls, success rates, and AI agent status. All data updates in real-time.',
    icon: BarChart3,
    targetPath: '/dashboard',
    position: 'center',
  },
  {
    id: 'ai-fleet',
    title: 'AI Agent Fleet',
    description: 'Manage your AI voice agents here. Each agent has unique personalities and can handle thousands of calls simultaneously with human-like conversations.',
    icon: Bot,
    targetPath: '/fleet',
    position: 'center',
  },
  {
    id: 'campaigns',
    title: 'Campaign Manager',
    description: 'Create and manage collection campaigns. Set targets, assign agents, configure scripts, and track performance with our intuitive wizard.',
    icon: Target,
    targetPath: '/campaigns',
    position: 'center',
  },
  {
    id: 'live-monitor',
    title: 'Live Call Monitor',
    description: 'Watch AI agents in action! Monitor live calls, see real-time transcripts, sentiment analysis, and intervene when needed.',
    icon: Phone,
    targetPath: '/live-monitor',
    position: 'center',
  },
  {
    id: 'debtors',
    title: 'Debtor Management',
    description: 'View and manage all debtor accounts. Filter by status, balance, or risk score. Access complete contact history and payment records.',
    icon: Users,
    targetPath: '/debtors',
    position: 'center',
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    description: 'Deep dive into your performance data. Track recovery trends, agent efficiency, campaign ROI, and generate detailed reports.',
    icon: BarChart3,
    targetPath: '/analytics',
    position: 'center',
  },
  {
    id: 'payments',
    title: 'Payment Portal',
    description: 'Secure payment processing for debtors. Multiple payment methods, recurring payments, and automatic receipt generation.',
    icon: CreditCard,
    targetPath: '/payment-portal',
    position: 'center',
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    description: 'Customize your experience. Configure notifications, security settings, branding, and API integrations.',
    icon: Settings,
    targetPath: '/settings',
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You\'ve completed the tour! Start by creating your first campaign or exploring the dashboard. Need help? Check our documentation or contact support.',
    icon: CheckCircle2,
    position: 'center',
  },
];

// Context for tour state
interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  hasCompletedTour: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

// Tour Provider
interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    return localStorage.getItem('mojavox_tour_completed') === 'true';
  });
  const [, setLocation] = useLocation();

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setHasCompletedTour(true);
    localStorage.setItem('mojavox_tour_completed', 'true');
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      const nextStepData = tourSteps[currentStep + 1];
      if (nextStepData.targetPath) {
        setLocation(nextStepData.targetPath);
      }
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, endTour, setLocation]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepData = tourSteps[currentStep - 1];
      if (prevStepData.targetPath) {
        setLocation(prevStepData.targetPath);
      }
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, setLocation]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < tourSteps.length) {
      const stepData = tourSteps[step];
      if (stepData.targetPath) {
        setLocation(stepData.targetPath);
      }
      setCurrentStep(step);
    }
  }, [setLocation]);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  // Auto-start tour for new users
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mojavox_tour_seen');
    if (!hasSeenTour && !hasCompletedTour) {
      // Show tour prompt after a short delay
      const timer = setTimeout(() => {
        localStorage.setItem('mojavox_tour_seen', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: tourSteps.length,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        hasCompletedTour,
      }}
    >
      {children}
      <TourOverlay />
      <TourStartPrompt />
    </TourContext.Provider>
  );
}

// Tour Overlay Component
function TourOverlay() {
  const { isActive, currentStep, totalSteps, nextStep, prevStep, skipTour, endTour } = useTour();
  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  if (!isActive) return null;

  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Tour Card */}
        <motion.div
          className="relative z-10 w-full max-w-lg mx-4"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Card className="border-neon-green/30 bg-card/95 backdrop-blur-md shadow-2xl shadow-neon-green/10">
            <CardContent className="p-6">
              {/* Close button */}
              <button
                onClick={skipTour}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Step {currentStep + 1} of {totalSteps}</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <motion.div
                  className="p-4 rounded-full bg-neon-green/10 border border-neon-green/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <Icon className="w-10 h-10 text-neon-green" />
                </motion.div>
              </div>

              {/* Content */}
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center mb-6"
              >
                <h3 className="text-xl font-display font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>

              {/* Step indicators */}
              <div className="flex justify-center gap-1.5 mb-6">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'bg-neon-green w-6'
                        : index < currentStep
                        ? 'bg-neon-green/50'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>

                {isLastStep ? (
                  <Button
                    onClick={endTour}
                    className="flex-1 bg-neon-green text-background hover:bg-neon-green/90"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Get Started
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    className="flex-1 bg-neon-green text-background hover:bg-neon-green/90"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              {/* Skip link */}
              {!isLastStep && (
                <button
                  onClick={skipTour}
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip tour
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Tour Start Prompt
function TourStartPrompt() {
  const { isActive, hasCompletedTour, startTour } = useTour();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('mojavox_tour_prompt_dismissed') === 'true';
  });

  useEffect(() => {
    if (!isActive && !hasCompletedTour && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, hasCompletedTour, dismissed]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('mojavox_tour_prompt_dismissed', 'true');
  };

  const handleStart = () => {
    setShowPrompt(false);
    startTour();
  };

  if (!showPrompt || isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <Card className="w-80 border-neon-green/30 bg-card/95 backdrop-blur-md shadow-xl">
          <CardContent className="p-4">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-neon-green/10">
                <Zap className="w-6 h-6 text-neon-green" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">New to MOJAVOX?</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Take a quick tour to discover all the powerful features.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleStart}
                    className="bg-neon-green text-background hover:bg-neon-green/90"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start Tour
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Tour Trigger Button (for manual restart)
export function TourTriggerButton({ className = '' }: { className?: string }) {
  const { startTour, isActive } = useTour();

  if (isActive) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startTour}
      className={className}
    >
      <Play className="w-4 h-4 mr-2" />
      Start Tour
    </Button>
  );
}

// Reset tour (for testing)
export function resetTour() {
  localStorage.removeItem('mojavox_tour_completed');
  localStorage.removeItem('mojavox_tour_seen');
  localStorage.removeItem('mojavox_tour_prompt_dismissed');
}
