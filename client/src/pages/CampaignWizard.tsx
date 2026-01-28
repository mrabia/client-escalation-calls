/**
 * MOJAVOX Campaign Creation Wizard
 * Style: Cyberpunk Corporate
 * 
 * Multi-step wizard for creating new collection campaigns:
 * 1. Basic Configuration - Name, dates, goals (with templates)
 * 2. Target Selection - Upload or select debtor lists
 * 3. Agent Assignment - Choose AI agents for the campaign
 * 4. Collection Parameters - Configure call scripts and rules (with script preview)
 * 5. Review & Launch - Final review with results estimation
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Bookmark,
  BookmarkPlus,
  Calendar,
  Check,
  ChevronLeft,
  Copy,
  DollarSign,
  Eye,
  FileSpreadsheet,
  FileText,
  Home,
  Loader2,
  MessageSquare,
  Phone,
  Play,
  Rocket,
  Save,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

// Step configuration
const steps = [
  { id: 1, title: "Basic Info", icon: Settings, description: "Campaign name and schedule" },
  { id: 2, title: "Targets", icon: Target, description: "Select debtor lists" },
  { id: 3, title: "Agents", icon: Bot, description: "Assign AI agents" },
  { id: 4, title: "Parameters", icon: Phone, description: "Configure call settings" },
  { id: 5, title: "Review", icon: Rocket, description: "Review and launch" },
];

// Campaign Templates
interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  priority: string;
  callScript: string;
  maxCallsPerDay: string;
  callHoursStart: string;
  callHoursEnd: string;
  maxAttempts: string;
  daysBetweenAttempts: string;
  enableVoicemail: boolean;
  enableSMS: boolean;
  estimatedSuccessRate: number;
}

const campaignTemplates: CampaignTemplate[] = [
  {
    id: "high_value",
    name: "High Value Recovery",
    description: "Aggressive approach for accounts over $5,000 with negotiation focus",
    icon: "💎",
    priority: "high",
    callScript: "negotiation",
    maxCallsPerDay: "300",
    callHoursStart: "09:00",
    callHoursEnd: "20:00",
    maxAttempts: "5",
    daysBetweenAttempts: "1",
    enableVoicemail: true,
    enableSMS: true,
    estimatedSuccessRate: 72,
  },
  {
    id: "friendly_reminder",
    name: "Friendly Reminder",
    description: "Soft approach for first-time late payments under 30 days",
    icon: "🤝",
    priority: "low",
    callScript: "friendly",
    maxCallsPerDay: "500",
    callHoursStart: "10:00",
    callHoursEnd: "18:00",
    maxAttempts: "2",
    daysBetweenAttempts: "3",
    enableVoicemail: true,
    enableSMS: false,
    estimatedSuccessRate: 85,
  },
  {
    id: "urgent_collection",
    name: "Urgent Collection",
    description: "Firm approach for accounts 60+ days overdue",
    icon: "⚡",
    priority: "urgent",
    callScript: "urgent",
    maxCallsPerDay: "400",
    callHoursStart: "08:00",
    callHoursEnd: "21:00",
    maxAttempts: "6",
    daysBetweenAttempts: "1",
    enableVoicemail: true,
    enableSMS: true,
    estimatedSuccessRate: 58,
  },
  {
    id: "payment_plan",
    name: "Payment Plan Outreach",
    description: "Flexible approach focusing on setting up payment arrangements",
    icon: "📅",
    priority: "medium",
    callScript: "negotiation",
    maxCallsPerDay: "350",
    callHoursStart: "09:00",
    callHoursEnd: "19:00",
    maxAttempts: "4",
    daysBetweenAttempts: "2",
    enableVoicemail: true,
    enableSMS: true,
    estimatedSuccessRate: 78,
  },
];

// Mock data
const mockDebtorLists = [
  { id: "list_1", name: "Q1 2026 High Value", count: 1250, totalDebt: 5000000, avgDebt: 4000, avgDaysOverdue: 45 },
  { id: "list_2", name: "Payment Reminder 30 Days", count: 3500, totalDebt: 1500000, avgDebt: 428, avgDaysOverdue: 25 },
  { id: "list_3", name: "Legacy Accounts", count: 450, totalDebt: 800000, avgDebt: 1777, avgDaysOverdue: 120 },
  { id: "list_4", name: "New Accounts Jan 2026", count: 890, totalDebt: 2100000, avgDebt: 2359, avgDaysOverdue: 15 },
];

const mockAgents = [
  { id: "nova_01", name: "NOVA-01", type: "Negotiator", successRate: 78, callsToday: 245, status: "available", avgCallDuration: 4.2 },
  { id: "apex_02", name: "APEX-02", type: "Collector", successRate: 82, callsToday: 312, status: "available", avgCallDuration: 3.8 },
  { id: "pulse_04", name: "PULSE-04", type: "Reminder", successRate: 71, callsToday: 189, status: "busy", avgCallDuration: 2.5 },
  { id: "echo_03", name: "ECHO-03", type: "Follow-up", successRate: 75, callsToday: 156, status: "available", avgCallDuration: 3.2 },
  { id: "vega_05", name: "VEGA-05", type: "Negotiator", successRate: 80, callsToday: 278, status: "available", avgCallDuration: 4.5 },
];

// Call Scripts with full conversation preview
interface CallScript {
  id: string;
  name: string;
  description: string;
  preview: {
    opening: string;
    identification: string;
    purpose: string;
    negotiation: string;
    closing: string;
  };
}

const callScripts: CallScript[] = [
  {
    id: "standard",
    name: "Standard Collection",
    description: "Professional approach for general collection",
    preview: {
      opening: "Good [morning/afternoon], this is [Agent Name] calling from ACME Collections on a recorded line.",
      identification: "Am I speaking with [Debtor Name]? I need to verify your identity. Can you please confirm your date of birth and the last four digits of your Social Security number?",
      purpose: "I'm calling regarding your account with [Creditor Name]. Our records show an outstanding balance of $[Amount] that is currently [X] days past due.",
      negotiation: "We'd like to help you resolve this matter today. Are you able to make a payment toward this balance? We can discuss payment options that work within your budget.",
      closing: "Thank you for your time today. As a reminder, your payment of $[Amount] is due by [Date]. You'll receive a confirmation email shortly. Have a good day.",
    },
  },
  {
    id: "friendly",
    name: "Friendly Reminder",
    description: "Soft approach for first-time contacts",
    preview: {
      opening: "Hi there! This is [Agent Name] from ACME Collections. I hope I'm not catching you at a bad time.",
      identification: "Is this [Debtor Name]? Great! I just need to quickly verify a couple of details before we continue.",
      purpose: "I'm reaching out because we noticed your account with [Creditor Name] has a balance of $[Amount] that's a little overdue. It happens to the best of us!",
      negotiation: "I wanted to check in and see if everything is okay, and if there's anything we can do to help you get this sorted out. Would you like to take care of it today, or would a payment plan work better for you?",
      closing: "Perfect! I've got that all set up for you. You're all set, and you'll get an email confirmation shortly. Thanks so much for taking care of this, and have a wonderful day!",
    },
  },
  {
    id: "urgent",
    name: "Urgent Notice",
    description: "Firm approach for overdue accounts",
    preview: {
      opening: "This is [Agent Name] calling from ACME Collections regarding an urgent matter. This call is being recorded.",
      identification: "I need to speak with [Debtor Name] immediately. Please confirm your identity by providing your date of birth.",
      purpose: "I'm calling about your seriously delinquent account with [Creditor Name]. The outstanding balance of $[Amount] is now [X] days past due, and this matter requires immediate attention.",
      negotiation: "To avoid further collection activity and potential impact to your credit report, we need to establish a payment arrangement today. What is the maximum amount you can commit to paying right now?",
      closing: "I've documented our conversation and your commitment to pay $[Amount] by [Date]. Failure to honor this agreement may result in escalated collection efforts. You'll receive written confirmation. Thank you.",
    },
  },
  {
    id: "negotiation",
    name: "Payment Negotiation",
    description: "Flexible approach for payment plans",
    preview: {
      opening: "Hello, this is [Agent Name] with ACME Collections. I'm calling to discuss some options that might help you with your account.",
      identification: "May I please speak with [Debtor Name]? Before we continue, I'll need to verify your identity for security purposes.",
      purpose: "I see you have an outstanding balance of $[Amount] with [Creditor Name]. I understand that financial situations can be challenging, and I'm here to work with you to find a solution.",
      negotiation: "We have several flexible options available. We can set up a monthly payment plan, discuss a potential settlement offer, or explore hardship programs if you're experiencing financial difficulties. What would work best for your situation?",
      closing: "Excellent! I've set up your payment plan for $[Amount] per month starting on [Date]. You'll receive all the details via email. Remember, I'm here to help, so don't hesitate to reach out if anything changes. Take care!",
    },
  },
];

// Form data type
interface CampaignFormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetGoal: string;
  priority: string;
  templateId: string | null;
  
  // Step 2: Targets
  selectedLists: string[];
  uploadedFile: File | null;
  
  // Step 3: Agents
  selectedAgents: string[];
  
  // Step 4: Parameters
  callScript: string;
  maxCallsPerDay: string;
  callHoursStart: string;
  callHoursEnd: string;
  maxAttempts: string;
  daysBetweenAttempts: string;
  enableVoicemail: boolean;
  enableSMS: boolean;
}

// Saved templates from localStorage
interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  data: Partial<CampaignFormData>;
}

export default function CampaignWizard() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  
  // New state for features
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SavedTemplate | null>(null);

  // Load saved templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("mojavox_campaign_templates");
    if (stored) {
      try {
        setSavedTemplates(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load saved templates");
      }
    }
  }, []);

  // Form state
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    targetGoal: "",
    priority: "medium",
    templateId: null,
    selectedLists: [],
    uploadedFile: null,
    selectedAgents: [],
    callScript: "standard",
    maxCallsPerDay: "500",
    callHoursStart: "09:00",
    callHoursEnd: "18:00",
    maxAttempts: "3",
    daysBetweenAttempts: "2",
    enableVoicemail: true,
    enableSMS: false,
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate totals for selected lists
  const selectedListsData = mockDebtorLists.filter(l => formData.selectedLists.includes(l.id));
  const totalDebtors = selectedListsData.reduce((sum, l) => sum + l.count, 0);
  const totalDebt = selectedListsData.reduce((sum, l) => sum + l.totalDebt, 0);
  const avgDaysOverdue = selectedListsData.length > 0 
    ? Math.round(selectedListsData.reduce((sum, l) => sum + l.avgDaysOverdue * l.count, 0) / totalDebtors)
    : 0;

  // Calculate results estimation
  const resultsEstimation = useMemo(() => {
    if (totalDebtors === 0 || formData.selectedAgents.length === 0) {
      return null;
    }

    // Get selected agents' average success rate
    const selectedAgentsData = mockAgents.filter(a => formData.selectedAgents.includes(a.id));
    const avgAgentSuccessRate = selectedAgentsData.reduce((sum, a) => sum + a.successRate, 0) / selectedAgentsData.length;
    
    // Get script effectiveness modifier
    const scriptModifiers: Record<string, number> = {
      standard: 1.0,
      friendly: 1.1,
      urgent: 0.85,
      negotiation: 1.05,
    };
    const scriptModifier = scriptModifiers[formData.callScript] || 1.0;
    
    // Days overdue impact (older = harder to collect)
    const overdueModifier = avgDaysOverdue < 30 ? 1.15 : avgDaysOverdue < 60 ? 1.0 : avgDaysOverdue < 90 ? 0.85 : 0.7;
    
    // Calculate estimated success rate
    const baseSuccessRate = avgAgentSuccessRate * scriptModifier * overdueModifier;
    const estimatedSuccessRate = Math.min(Math.max(baseSuccessRate, 35), 95);
    
    // Calculate estimated recovery
    const contactRate = 0.65; // Estimated contact rate
    const estimatedContacts = Math.round(totalDebtors * contactRate);
    const estimatedSuccessfulCalls = Math.round(estimatedContacts * (estimatedSuccessRate / 100));
    const avgRecoveryPerSuccess = totalDebt / totalDebtors * 0.7; // 70% of avg debt recovered
    const estimatedRecovery = Math.round(estimatedSuccessfulCalls * avgRecoveryPerSuccess);
    
    // Calculate campaign duration estimate
    const callsPerDay = parseInt(formData.maxCallsPerDay) || 500;
    const totalCallsNeeded = totalDebtors * parseInt(formData.maxAttempts);
    const estimatedDays = Math.ceil(totalCallsNeeded / callsPerDay);
    
    // Confidence level based on data quality
    const confidenceLevel = selectedListsData.length >= 2 && formData.selectedAgents.length >= 2 ? "High" : 
                           selectedListsData.length >= 1 && formData.selectedAgents.length >= 1 ? "Medium" : "Low";

    return {
      estimatedSuccessRate: Math.round(estimatedSuccessRate),
      estimatedContacts,
      estimatedSuccessfulCalls,
      estimatedRecovery,
      estimatedDays,
      confidenceLevel,
      recoveryPercentage: Math.round((estimatedRecovery / totalDebt) * 100),
    };
  }, [totalDebtors, totalDebt, avgDaysOverdue, formData.selectedAgents, formData.callScript, formData.maxCallsPerDay, formData.maxAttempts, selectedListsData.length]);

  // Apply template
  const applyTemplate = (template: CampaignTemplate) => {
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      priority: template.priority,
      callScript: template.callScript,
      maxCallsPerDay: template.maxCallsPerDay,
      callHoursStart: template.callHoursStart,
      callHoursEnd: template.callHoursEnd,
      maxAttempts: template.maxAttempts,
      daysBetweenAttempts: template.daysBetweenAttempts,
      enableVoicemail: template.enableVoicemail,
      enableSMS: template.enableSMS,
    }));
    setFormTouched(true);
    toast.success(`Template "${template.name}" applied`, {
      description: "Settings have been pre-filled based on the template.",
    });
  };

  // Apply saved template
  const applySavedTemplate = (template: SavedTemplate) => {
    setFormData(prev => ({
      ...prev,
      ...template.data,
    }));
    setFormTouched(true);
    toast.success(`Template "${template.name}" loaded`, {
      description: "Your saved settings have been applied.",
    });
  };

  // Save current settings as template
  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const newTemplate: SavedTemplate = {
      id: `saved_${Date.now()}`,
      name: newTemplateName.trim(),
      createdAt: new Date().toISOString(),
      data: {
        priority: formData.priority,
        callScript: formData.callScript,
        maxCallsPerDay: formData.maxCallsPerDay,
        callHoursStart: formData.callHoursStart,
        callHoursEnd: formData.callHoursEnd,
        maxAttempts: formData.maxAttempts,
        daysBetweenAttempts: formData.daysBetweenAttempts,
        enableVoicemail: formData.enableVoicemail,
        enableSMS: formData.enableSMS,
      },
    };

    const updatedTemplates = [...savedTemplates, newTemplate];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem("mojavox_campaign_templates", JSON.stringify(updatedTemplates));
    
    setShowSaveTemplateDialog(false);
    setNewTemplateName("");
    toast.success("Template saved!", {
      description: `"${newTemplate.name}" is now available for future campaigns.`,
    });
  };

  // Delete saved template
  const handleDeleteTemplate = (template: SavedTemplate) => {
    setTemplateToDelete(template);
    setDeleteTemplateDialogOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      const updatedTemplates = savedTemplates.filter(t => t.id !== templateToDelete.id);
      setSavedTemplates(updatedTemplates);
      localStorage.setItem("mojavox_campaign_templates", JSON.stringify(updatedTemplates));
      toast.success("Template deleted", {
        description: `"${templateToDelete.name}" has been removed.`
      });
      setTemplateToDelete(null);
    }
  };

  // Update form data
  const updateFormData = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormTouched(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Toggle list selection
  const toggleListSelection = (listId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLists: prev.selectedLists.includes(listId)
        ? prev.selectedLists.filter(id => id !== listId)
        : [...prev.selectedLists, listId],
    }));
    setFormTouched(true);
  };

  // Toggle agent selection
  const toggleAgentSelection = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAgents: prev.selectedAgents.includes(agentId)
        ? prev.selectedAgents.filter(id => id !== agentId)
        : [...prev.selectedAgents, agentId],
    }));
    setFormTouched(true);
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = "Campaign name is required";
        if (!formData.startDate) newErrors.startDate = "Start date is required";
        if (!formData.endDate) newErrors.endDate = "End date is required";
        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
          newErrors.endDate = "End date must be after start date";
        }
        if (!formData.targetGoal || parseFloat(formData.targetGoal) <= 0) {
          newErrors.targetGoal = "Target goal must be greater than 0";
        }
        break;
      case 2:
        if (formData.selectedLists.length === 0 && !formData.uploadedFile) {
          newErrors.selectedLists = "Select at least one debtor list or upload a file";
        }
        break;
      case 3:
        if (formData.selectedAgents.length === 0) {
          newErrors.selectedAgents = "Select at least one AI agent";
        }
        break;
      case 4:
        if (!formData.callScript) newErrors.callScript = "Select a call script";
        if (!formData.maxCallsPerDay || parseInt(formData.maxCallsPerDay) <= 0) {
          newErrors.maxCallsPerDay = "Max calls must be greater than 0";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate to next step
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Handle exit
  const handleExit = () => {
    if (formTouched) {
      setShowExitDialog(true);
    } else {
      navigate("/campaigns");
    }
  };

  // Submit campaign
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    
    toast.success("Campaign created successfully!", {
      description: `"${formData.name}" is now active and will begin on ${new Date(formData.startDate).toLocaleDateString()}.`,
    });
    
    navigate("/campaigns");
  };

  // Get min date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // Get current script for preview
  const currentScript = callScripts.find(s => s.id === formData.callScript);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExit}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-neon-green" />
                    Create New Campaign
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveTemplateDialog(true)}
                  className="border-border hidden sm:flex"
                >
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="border-border"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExit}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Progress Steps */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                          isCompleted && "bg-neon-green border-neon-green text-background",
                          isActive && "bg-neon-green/20 border-neon-green text-neon-green",
                          !isActive && !isCompleted && "bg-background border-border text-muted-foreground"
                        )}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className={cn(
                        "text-xs mt-2 font-medium hidden sm:block",
                        isActive ? "text-neon-green" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-12 sm:w-24 h-0.5 mx-2",
                        isCompleted ? "bg-neon-green" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Step 1: Basic Info with Templates */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Templates Section */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-neon-yellow" />
                      Quick Start with Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {campaignTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className={cn(
                            "p-4 rounded-lg border text-left transition-all hover:border-neon-green/50",
                            formData.templateId === template.id
                              ? "bg-neon-green/10 border-neon-green/50"
                              : "bg-background border-border"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{template.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green">
                                  ~{template.estimatedSuccessRate}% success
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Saved Templates */}
                    {savedTemplates.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Bookmark className="w-4 h-4" />
                          Your Saved Templates
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {savedTemplates.map((template) => (
                            <div
                              key={template.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border"
                            >
                              <button
                                onClick={() => applySavedTemplate(template)}
                                className="text-sm text-foreground hover:text-neon-green transition-colors"
                              >
                                {template.name}
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template)}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Basic Info Form */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Settings className="w-5 h-5 text-neon-green" />
                      Campaign Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Campaign Name */}
                    <div className="space-y-2">
                      <Label className="text-foreground">Campaign Name *</Label>
                      <Input
                        placeholder="e.g., Q1 2026 High Value Recovery"
                        value={formData.name}
                        onChange={(e) => updateFormData("name", e.target.value)}
                        className={cn("bg-background border-border", errors.name && "border-red-500")}
                      />
                      {errors.name && (
                        <p className="text-red-400 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-foreground">Description (Optional)</Label>
                      <Textarea
                        placeholder="Describe the campaign objectives and strategy..."
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                        className="bg-background border-border min-h-[100px] resize-none"
                      />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Start Date *</Label>
                        <Input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => updateFormData("startDate", e.target.value)}
                          min={getMinDate()}
                          className={cn("bg-background border-border", errors.startDate && "border-red-500")}
                        />
                        {errors.startDate && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.startDate}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">End Date *</Label>
                        <Input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => updateFormData("endDate", e.target.value)}
                          min={formData.startDate || getMinDate()}
                          className={cn("bg-background border-border", errors.endDate && "border-red-500")}
                        />
                        {errors.endDate && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.endDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Target Goal and Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Recovery Target ($) *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="1000000"
                            value={formData.targetGoal}
                            onChange={(e) => updateFormData("targetGoal", e.target.value)}
                            className={cn("bg-background border-border pl-10 font-mono", errors.targetGoal && "border-red-500")}
                            min="0"
                            step="1000"
                          />
                        </div>
                        {errors.targetGoal && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.targetGoal}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Priority Level</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) => updateFormData("priority", value)}
                        >
                          <SelectTrigger className="bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Target Selection */}
            {currentStep === 2 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Target className="w-5 h-5 text-neon-green" />
                    Select Target Debtors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {errors.selectedLists && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errors.selectedLists}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-foreground mb-3 block">Available Debtor Lists</Label>
                    <StaggerContainer className="space-y-3">
                      {mockDebtorLists.map((list) => {
                        const isSelected = formData.selectedLists.includes(list.id);
                        return (
                          <StaggerItem key={list.id}>
                            <button
                              type="button"
                              onClick={() => toggleListSelection(list.id)}
                              className={cn(
                                "w-full p-4 rounded-lg border text-left transition-all",
                                isSelected
                                  ? "bg-neon-green/10 border-neon-green/50"
                                  : "bg-background border-border hover:border-muted-foreground/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                    isSelected ? "bg-neon-green border-neon-green" : "border-muted-foreground"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3 text-background" />}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{list.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {list.count.toLocaleString()} debtors • Avg. ${list.avgDebt.toLocaleString()} • {list.avgDaysOverdue} days overdue
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-bold text-foreground">
                                    ${(list.totalDebt / 1000000).toFixed(2)}M
                                  </p>
                                  <p className="text-xs text-muted-foreground">Total Debt</p>
                                </div>
                              </div>
                            </button>
                          </StaggerItem>
                        );
                      })}
                    </StaggerContainer>
                  </div>

                  <Separator className="bg-border" />

                  <div>
                    <Label className="text-foreground mb-3 block">Or Upload a New List</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-foreground font-medium mb-1">Drop your file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports CSV, XLSX (max 10MB)</p>
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => updateFormData("uploadedFile", e.target.files?.[0] || null)}
                      />
                      <Button
                        variant="outline"
                        className="mt-4 border-border"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Select File
                      </Button>
                    </div>
                  </div>

                  {formData.selectedLists.length > 0 && (
                    <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {formData.selectedLists.length} list{formData.selectedLists.length > 1 ? "s" : ""} selected
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {totalDebtors.toLocaleString()} total debtors • Avg. {avgDaysOverdue} days overdue
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-neon-green text-xl">
                            ${(totalDebt / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-xs text-muted-foreground">Total Debt Value</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Agent Assignment */}
            {currentStep === 3 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Bot className="w-5 h-5 text-neon-green" />
                    Assign AI Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {errors.selectedAgents && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errors.selectedAgents}
                      </p>
                    </div>
                  )}

                  <p className="text-muted-foreground">
                    Select the AI agents that will handle calls for this campaign. You can assign multiple agents for better coverage.
                  </p>

                  <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {mockAgents.map((agent) => {
                      const isSelected = formData.selectedAgents.includes(agent.id);
                      const isAvailable = agent.status === "available";
                      
                      return (
                        <StaggerItem key={agent.id}>
                          <button
                            type="button"
                            onClick={() => isAvailable && toggleAgentSelection(agent.id)}
                            disabled={!isAvailable}
                            className={cn(
                              "w-full p-4 rounded-lg border text-left transition-all",
                              isSelected && "bg-neon-green/10 border-neon-green/50",
                              !isSelected && isAvailable && "bg-background border-border hover:border-muted-foreground/50",
                              !isAvailable && "bg-background/50 border-border/50 opacity-60 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all shrink-0",
                                isSelected ? "bg-neon-green border-neon-green" : "border-muted-foreground"
                              )}>
                                {isSelected && <Check className="w-3 h-3 text-background" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-mono font-bold text-foreground">{agent.name}</p>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    isAvailable ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                                  )}>
                                    {isAvailable ? "Available" : "Busy"}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{agent.type}</p>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-muted-foreground">
                                    <Zap className="w-3 h-3 inline mr-1 text-neon-green" />
                                    {agent.successRate}% success
                                  </span>
                                  <span className="text-muted-foreground">
                                    <Phone className="w-3 h-3 inline mr-1" />
                                    {agent.avgCallDuration}min avg
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        </StaggerItem>
                      );
                    })}
                  </StaggerContainer>

                  {formData.selectedAgents.length > 0 && (
                    <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                      <p className="font-medium text-foreground">
                        {formData.selectedAgents.length} agent{formData.selectedAgents.length > 1 ? "s" : ""} assigned
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mockAgents
                          .filter(a => formData.selectedAgents.includes(a.id))
                          .map(a => a.name)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Collection Parameters with Script Preview */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Phone className="w-5 h-5 text-neon-green" />
                      Collection Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Call Script with Preview Button */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-foreground">Call Script *</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowScriptPreview(true)}
                          className="border-border"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Script
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {callScripts.map((script) => {
                          const isSelected = formData.callScript === script.id;
                          return (
                            <button
                              key={script.id}
                              type="button"
                              onClick={() => updateFormData("callScript", script.id)}
                              className={cn(
                                "p-4 rounded-lg border text-left transition-all",
                                isSelected
                                  ? "bg-neon-green/10 border-neon-green/50"
                                  : "bg-background border-border hover:border-muted-foreground/50"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={cn(
                                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                  isSelected ? "border-neon-green" : "border-muted-foreground"
                                )}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-neon-green" />}
                                </div>
                                <p className="font-medium text-foreground">{script.name}</p>
                              </div>
                              <p className="text-sm text-muted-foreground ml-6">{script.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Call Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Max Calls Per Day</Label>
                        <Input
                          type="number"
                          value={formData.maxCallsPerDay}
                          onChange={(e) => updateFormData("maxCallsPerDay", e.target.value)}
                          className={cn("bg-background border-border", errors.maxCallsPerDay && "border-red-500")}
                          min="1"
                          max="10000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Max Attempts Per Debtor</Label>
                        <Input
                          type="number"
                          value={formData.maxAttempts}
                          onChange={(e) => updateFormData("maxAttempts", e.target.value)}
                          className="bg-background border-border"
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Call Hours Start</Label>
                        <Input
                          type="time"
                          value={formData.callHoursStart}
                          onChange={(e) => updateFormData("callHoursStart", e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Call Hours End</Label>
                        <Input
                          type="time"
                          value={formData.callHoursEnd}
                          onChange={(e) => updateFormData("callHoursEnd", e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground">Days Between Attempts</Label>
                      <Input
                        type="number"
                        value={formData.daysBetweenAttempts}
                        onChange={(e) => updateFormData("daysBetweenAttempts", e.target.value)}
                        className="bg-background border-border"
                        min="1"
                        max="30"
                      />
                    </div>

                    <Separator className="bg-border" />

                    <div className="space-y-3">
                      <Label className="text-foreground">Additional Options</Label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.enableVoicemail}
                            onChange={(e) => updateFormData("enableVoicemail", e.target.checked)}
                            className="w-4 h-4 rounded border-border bg-background text-neon-green focus:ring-neon-green"
                          />
                          <span className="text-foreground">Leave voicemail if no answer</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.enableSMS}
                            onChange={(e) => updateFormData("enableSMS", e.target.checked)}
                            className="w-4 h-4 rounded border-border bg-background text-neon-green focus:ring-neon-green"
                          />
                          <span className="text-foreground">Send SMS follow-up after calls</span>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Review & Launch with Results Estimation */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Results Estimation Card */}
                {resultsEstimation && (
                  <Card className="bg-gradient-to-br from-neon-green/10 to-neon-blue/10 border-neon-green/30">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-neon-green" />
                        Projected Results
                        <span className={cn(
                          "ml-auto text-xs px-2 py-1 rounded-full",
                          resultsEstimation.confidenceLevel === "High" ? "bg-emerald-500/20 text-emerald-400" :
                          resultsEstimation.confidenceLevel === "Medium" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {resultsEstimation.confidenceLevel} Confidence
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg bg-background/50">
                          <p className="text-3xl font-bold font-mono text-neon-green">
                            ${(resultsEstimation.estimatedRecovery / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Est. Recovery</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-background/50">
                          <p className="text-3xl font-bold font-mono text-foreground">
                            {resultsEstimation.estimatedSuccessRate}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-background/50">
                          <p className="text-3xl font-bold font-mono text-foreground">
                            {resultsEstimation.estimatedSuccessfulCalls.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Successful Calls</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-background/50">
                          <p className="text-3xl font-bold font-mono text-foreground">
                            ~{resultsEstimation.estimatedDays}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Days to Complete</p>
                        </div>
                      </div>
                      
                      {/* Recovery Progress Bar */}
                      <div className="mt-4 p-4 rounded-lg bg-background/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Projected Recovery vs Target</span>
                          <span className="text-sm font-mono text-foreground">
                            {resultsEstimation.recoveryPercentage}% of total debt
                          </span>
                        </div>
                        <div className="h-3 bg-background rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-neon-green to-neon-blue rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(resultsEstimation.recoveryPercentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Based on historical data from similar campaigns and selected agent performance
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Campaign Summary */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-neon-green" />
                      Review Campaign
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">CAMPAIGN DETAILS</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium text-foreground">{formData.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Priority</p>
                          <p className="font-medium text-foreground capitalize">{formData.priority}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium text-foreground">
                            {formData.startDate && new Date(formData.startDate).toLocaleDateString()} - {formData.endDate && new Date(formData.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Recovery Target</p>
                          <p className="font-medium text-foreground font-mono">
                            ${parseFloat(formData.targetGoal || "0").toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">TARGET DEBTORS</h3>
                      <div className="p-4 rounded-lg bg-background border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {formData.selectedLists.length} list{formData.selectedLists.length > 1 ? "s" : ""} selected
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedListsData.map(l => l.name).join(", ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-neon-green">{totalDebtors.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Total Debtors</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">ASSIGNED AGENTS</h3>
                      <div className="flex flex-wrap gap-2">
                        {mockAgents
                          .filter(a => formData.selectedAgents.includes(a.id))
                          .map(agent => (
                            <span
                              key={agent.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-blue/20 text-neon-blue text-sm font-mono"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              {agent.name}
                            </span>
                          ))}
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">CALL PARAMETERS</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Script</p>
                          <p className="font-medium text-foreground">
                            {callScripts.find(s => s.id === formData.callScript)?.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Max Calls/Day</p>
                          <p className="font-medium text-foreground">{formData.maxCallsPerDay}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Call Hours</p>
                          <p className="font-medium text-foreground">
                            {formData.callHoursStart} - {formData.callHoursEnd}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Max Attempts</p>
                          <p className="font-medium text-foreground">{formData.maxAttempts}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3">
                        {formData.enableVoicemail && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Check className="w-4 h-4 text-neon-green" />
                            Voicemail enabled
                          </span>
                        )}
                        {formData.enableSMS && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Check className="w-4 h-4 text-neon-green" />
                            SMS follow-up enabled
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Launch Notice */}
                <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                  <div className="flex items-start gap-3">
                    <Rocket className="w-5 h-5 text-neon-green mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Ready to Launch</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Once launched, the campaign will begin processing calls on {formData.startDate && new Date(formData.startDate).toLocaleDateString()}. 
                        You can pause or modify the campaign at any time from the Campaign Manager.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-border"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < 5 ? (
                <Button
                  onClick={nextStep}
                  className="bg-neon-green hover:bg-neon-green/90 text-background"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-neon-green hover:bg-neon-green/90 text-background"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Campaign...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Launch Campaign
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Script Preview Dialog */}
        <Dialog open={showScriptPreview} onOpenChange={setShowScriptPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-neon-green" />
                Script Preview: {currentScript?.name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This is how the AI agent will conduct calls using this script.
              </DialogDescription>
            </DialogHeader>
            
            {currentScript && (
              <div className="space-y-4 mt-4">
                {Object.entries(currentScript.preview).map(([phase, text]) => (
                  <div key={phase} className="p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-neon-green/20 text-neon-green uppercase">
                        {phase.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <p className="text-foreground text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowScriptPreview(false)} className="border-border">
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Template Dialog */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-neon-green" />
                Save as Template
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Save your current settings as a reusable template for future campaigns.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Template Name</Label>
                <Input
                  placeholder="e.g., My High Value Strategy"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              
              <div className="p-3 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-2">Settings to be saved:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Priority: {formData.priority}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Script: {callScripts.find(s => s.id === formData.callScript)?.name}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Max Calls: {formData.maxCallsPerDay}/day
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Hours: {formData.callHoursStart}-{formData.callHoursEnd}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)} className="border-border">
                Cancel
              </Button>
              <Button onClick={saveAsTemplate} className="bg-neon-green hover:bg-neon-green/90 text-background">
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exit Confirmation Dialog */}
        <ConfirmDialog
          open={showExitDialog}
          onOpenChange={setShowExitDialog}
          title="Exit Campaign Wizard?"
          description="You have unsaved changes. Are you sure you want to exit? All progress will be lost."
          confirmText="Exit Wizard"
          variant="warning"
          onConfirm={() => navigate("/campaigns")}
        />

        {/* Delete Template Confirmation */}
        <ConfirmDialog
          open={deleteTemplateDialogOpen}
          onOpenChange={setDeleteTemplateDialogOpen}
          title="Delete Template?"
          description={templateToDelete ? `Are you sure you want to delete "${templateToDelete.name}"? This action cannot be undone.` : ""}
          confirmText="Delete Template"
          variant="danger"
          onConfirm={confirmDeleteTemplate}
        />
      </div>
    </PageTransition>
  );
}
