/**
 * MOJAVOX Payment Portal (Debtor-Facing)
 * Style: Clean, Professional, Reassuring
 * Enhanced with:
 * - Field validation for card number, expiry, CVV
 * - Progress persistence with localStorage
 * - Alternative payment methods (PayPal, Apple Pay, Bank Transfer)
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Lock,
  RefreshCw,
  Shield,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Payment process steps
const paymentSteps = [
  { id: 1, title: "Select Option", icon: FileText },
  { id: 2, title: "Payment Method", icon: Wallet },
  { id: 3, title: "Payment Details", icon: CreditCard },
  { id: 4, title: "Confirmation", icon: CheckCircle },
];

// Payment methods
const paymentMethods = [
  { id: "card", name: "Credit/Debit Card", icon: CreditCard, description: "Visa, Mastercard, Amex" },
  { id: "paypal", name: "PayPal", icon: Wallet, description: "Pay with your PayPal account" },
  { id: "applepay", name: "Apple Pay", icon: Smartphone, description: "Quick checkout with Apple Pay" },
  { id: "bank", name: "Bank Transfer", icon: Building2, description: "Direct bank transfer (ACH)" },
];

// localStorage key for saving progress
const STORAGE_KEY = "mojavox_payment_progress";

// Validation helpers
const validateCardNumber = (value: string): { valid: boolean; error: string } => {
  const cleaned = value.replace(/\s/g, "");
  if (!cleaned) return { valid: false, error: "Card number is required" };
  if (!/^\d+$/.test(cleaned)) return { valid: false, error: "Card number must contain only digits" };
  if (cleaned.length < 13 || cleaned.length > 19) return { valid: false, error: "Card number must be 13-19 digits" };
  
  // Luhn algorithm check
  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  if (sum % 10 !== 0) return { valid: false, error: "Invalid card number" };
  
  return { valid: true, error: "" };
};

const validateExpiry = (value: string): { valid: boolean; error: string } => {
  if (!value) return { valid: false, error: "Expiry date is required" };
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return { valid: false, error: "Format must be MM/YY" };
  
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  
  if (month < 1 || month > 12) return { valid: false, error: "Invalid month" };
  
  const now = new Date();
  const expiry = new Date(year, month - 1);
  if (expiry < now) return { valid: false, error: "Card has expired" };
  
  return { valid: true, error: "" };
};

const validateCVV = (value: string): { valid: boolean; error: string } => {
  if (!value) return { valid: false, error: "CVV is required" };
  if (!/^\d{3,4}$/.test(value)) return { valid: false, error: "CVV must be 3-4 digits" };
  return { valid: true, error: "" };
};

const validateName = (value: string): { valid: boolean; error: string } => {
  if (!value.trim()) return { valid: false, error: "Name is required" };
  if (value.trim().length < 2) return { valid: false, error: "Name is too short" };
  return { valid: true, error: "" };
};

// Billing address validators
const validateStreet = (value: string): { valid: boolean; error: string } => {
  if (!value.trim()) return { valid: false, error: "Street address is required" };
  if (value.trim().length < 5) return { valid: false, error: "Please enter a valid street address" };
  return { valid: true, error: "" };
};

const validateCity = (value: string): { valid: boolean; error: string } => {
  if (!value.trim()) return { valid: false, error: "City is required" };
  if (value.trim().length < 2) return { valid: false, error: "Please enter a valid city" };
  return { valid: true, error: "" };
};

const validateState = (value: string): { valid: boolean; error: string } => {
  if (!value.trim()) return { valid: false, error: "State is required" };
  return { valid: true, error: "" };
};

const validateZip = (value: string): { valid: boolean; error: string } => {
  if (!value.trim()) return { valid: false, error: "ZIP code is required" };
  // US ZIP code format: 12345 or 12345-6789
  if (!/^\d{5}(-\d{4})?$/.test(value.trim())) {
    return { valid: false, error: "Please enter a valid ZIP code" };
  }
  return { valid: true, error: "" };
};

// Format card number with spaces
const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 16);
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleaned;
};

// Format expiry date
const formatExpiry = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 4);
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
  }
  return cleaned;
};

interface FormData {
  cardNumber: string;
  expiry: string;
  cvv: string;
  nameOnCard: string;
  customAmount: string;
  // Billing address
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
}

interface FormErrors {
  cardNumber: string;
  expiry: string;
  cvv: string;
  nameOnCard: string;
  // Billing address
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
}

interface SavedProgress {
  paymentOption: string;
  paymentMethod: string;
  currentStep: number;
  formData: FormData;
  timestamp: number;
}

export default function PaymentPortal() {
  const [, setLocation] = useLocation();
  const [paymentOption, setPaymentOption] = useState("full");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [currentStep, setCurrentStep] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
    customAmount: "",
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "United States",
  });

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
  });

  const [touched, setTouched] = useState({
    cardNumber: false,
    expiry: false,
    cvv: false,
    nameOnCard: false,
    billingStreet: false,
    billingCity: false,
    billingState: false,
    billingZip: false,
  });

  const hasFormData = Object.values(formData).some(v => v.trim() !== "");

  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress: SavedProgress = JSON.parse(saved);
        // Check if saved within last 24 hours
        const isRecent = Date.now() - progress.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && progress.currentStep > 1) {
          setResumeDialogOpen(true);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    const progress: SavedProgress = {
      paymentOption,
      paymentMethod,
      currentStep,
      formData,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [paymentOption, paymentMethod, currentStep, formData]);

  // Auto-save on changes
  useEffect(() => {
    if (currentStep > 1 || hasFormData) {
      saveProgress();
    }
  }, [currentStep, formData, paymentOption, paymentMethod, hasFormData, saveProgress]);

  const resumeProgress = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const progress: SavedProgress = JSON.parse(saved);
        setPaymentOption(progress.paymentOption);
        setPaymentMethod(progress.paymentMethod);
        setCurrentStep(progress.currentStep);
        setFormData(progress.formData);
        toast.success("Progress restored", {
          description: "Your previous payment progress has been restored.",
        });
      } catch {
        toast.error("Could not restore progress");
      }
    }
    setResumeDialogOpen(false);
  };

  const startFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    setResumeDialogOpen(false);
  };

  const clearProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Validation
  const validateField = (field: keyof FormErrors, value: string) => {
    let result = { valid: true, error: "" };
    switch (field) {
      case "cardNumber":
        result = validateCardNumber(value);
        break;
      case "expiry":
        result = validateExpiry(value);
        break;
      case "cvv":
        result = validateCVV(value);
        break;
      case "nameOnCard":
        result = validateName(value);
        break;
      case "billingStreet":
        result = validateStreet(value);
        break;
      case "billingCity":
        result = validateCity(value);
        break;
      case "billingState":
        result = validateState(value);
        break;
      case "billingZip":
        result = validateZip(value);
        break;
    }
    setErrors(prev => ({ ...prev, [field]: result.error }));
    return result.valid;
  };

  const validateAllFields = (): boolean => {
    const cardValid = validateField("cardNumber", formData.cardNumber);
    const expiryValid = validateField("expiry", formData.expiry);
    const cvvValid = validateField("cvv", formData.cvv);
    const nameValid = validateField("nameOnCard", formData.nameOnCard);
    const streetValid = validateField("billingStreet", formData.billingStreet);
    const cityValid = validateField("billingCity", formData.billingCity);
    const stateValid = validateField("billingState", formData.billingState);
    const zipValid = validateField("billingZip", formData.billingZip);
    
    setTouched({
      cardNumber: true,
      expiry: true,
      cvv: true,
      nameOnCard: true,
      billingStreet: true,
      billingCity: true,
      billingState: true,
      billingZip: true,
    });
    
    return cardValid && expiryValid && cvvValid && nameValid && streetValid && cityValid && stateValid && zipValid;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    let formattedValue = value;
    
    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value);
    } else if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    if (touched[field as keyof typeof touched]) {
      validateField(field as keyof FormErrors, formattedValue);
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleCancel = () => {
    if (hasFormData || currentStep > 1) {
      setCancelDialogOpen(true);
    } else {
      setLocation("/");
    }
  };

  const confirmCancel = () => {
    clearProgress();
    toast.info("Payment cancelled", {
      description: "Your progress has been saved. You can return anytime to complete your payment.",
    });
    setLocation("/");
  };

  const handlePayment = () => {
    if (paymentMethod === "card") {
      if (!validateAllFields()) {
        toast.error("Please fix the errors", {
          description: "Some fields have invalid values.",
        });
        return;
      }
    }
    setConfirmPaymentDialogOpen(true);
  };

  const confirmPayment = () => {
    setProcessing(true);
    setConfirmPaymentDialogOpen(false);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      clearProgress();
      setCurrentStep(4);
      toast.success("Payment successful!", {
        description: "Your payment has been processed. A confirmation email has been sent.",
      });
    }, 2000);
  };

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getPaymentAmount = () => {
    if (paymentOption === "full") return "$2,400.00";
    if (paymentOption === "plan") return "$150.00";
    return formData.customAmount || "$0.00";
  };

  const getCardType = (number: string): string => {
    const cleaned = number.replace(/\s/g, "");
    if (/^4/.test(cleaned)) return "Visa";
    if (/^5[1-5]/.test(cleaned)) return "Mastercard";
    if (/^3[47]/.test(cleaned)) return "Amex";
    if (/^6(?:011|5)/.test(cleaned)) return "Discover";
    return "Card";
  };

  // Check if card form is valid
  const isCardFormValid = paymentMethod !== "card" || (
    !errors.cardNumber && !errors.expiry && !errors.cvv && !errors.nameOnCard &&
    !errors.billingStreet && !errors.billingCity && !errors.billingState && !errors.billingZip &&
    formData.cardNumber && formData.expiry && formData.cvv && formData.nameOnCard &&
    formData.billingStreet && formData.billingCity && formData.billingState && formData.billingZip
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleCancel}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-slate-900" />
              </div>
              <span className="font-semibold text-white">Secure Payment Portal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">256-bit SSL Encrypted</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCancel}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Home className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Home</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="container py-4">
          <div className="flex items-center justify-center max-w-xl mx-auto">
            {paymentSteps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    currentStep > step.id && "bg-emerald-500 border-emerald-500",
                    currentStep === step.id && "border-emerald-500 text-emerald-500 scale-110",
                    currentStep < step.id && "border-slate-600 text-slate-500"
                  )}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-2 hidden sm:block whitespace-nowrap",
                    currentStep >= step.id ? "text-white" : "text-slate-500"
                  )}>
                    {step.title}
                  </span>
                </div>
                {i < paymentSteps.length - 1 && (
                  <div className={cn(
                    "w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 transition-all duration-500",
                    currentStep > step.id ? "bg-emerald-500" : "bg-slate-700"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm flex-wrap">
            <li>
              <button 
                onClick={handleCancel}
                className="text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Dashboard
              </button>
            </li>
            <li className="text-slate-600">/</li>
            <li className="text-white">Payment Portal</li>
            <li className="text-slate-600">/</li>
            <li className="text-emerald-400">{paymentSteps[currentStep - 1]?.title}</li>
          </ol>
        </nav>

        {/* Processing Overlay */}
        {processing && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Processing Payment...</p>
              <p className="text-slate-400 text-sm">Please do not close this window</p>
            </div>
          </div>
        )}

        {/* Step 1: Select Payment Option */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Account Summary */}
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Account Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Number</span>
                    <span className="text-white font-mono">****4521</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Original Balance</span>
                    <span className="text-white font-mono">$2,400.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payments Made</span>
                    <span className="text-emerald-400 font-mono">-$0.00</span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex justify-between text-lg">
                    <span className="text-white font-medium">Current Balance</span>
                    <span className="text-white font-bold font-mono">$2,400.00</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Options */}
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Payment Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentOption} onValueChange={setPaymentOption} className="space-y-3">
                    <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentOption === "full" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="full" id="full" />
                        <div>
                          <p className="text-white font-medium">Pay in Full</p>
                          <p className="text-sm text-slate-400">Clear your balance today</p>
                        </div>
                      </div>
                      <span className="text-white font-bold font-mono">$2,400.00</span>
                    </label>

                    <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentOption === "plan" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="plan" id="plan" />
                        <div>
                          <p className="text-white font-medium">Payment Plan</p>
                          <p className="text-sm text-slate-400">16 monthly payments</p>
                        </div>
                      </div>
                      <span className="text-white font-bold font-mono">$150/mo</span>
                    </label>

                    <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentOption === "custom" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="custom" id="custom" />
                        <div>
                          <p className="text-white font-medium">Custom Amount</p>
                          <p className="text-sm text-slate-400">Pay what you can today</p>
                        </div>
                      </div>
                      <Input
                        placeholder="$0.00"
                        className="w-24 text-right bg-slate-900 border-slate-600"
                        disabled={paymentOption !== "custom"}
                        value={formData.customAmount}
                        onChange={(e) => setFormData({...formData, customAmount: e.target.value})}
                      />
                    </label>
                  </RadioGroup>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={handleCancel}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={goToNextStep}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Payment Method */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Select Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label 
                      key={method.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                        paymentMethod === method.id 
                          ? "border-emerald-500 bg-emerald-500/10" 
                          : "border-slate-700 hover:border-slate-600"
                      )}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        paymentMethod === method.id ? "bg-emerald-500/20" : "bg-slate-700"
                      )}>
                        <method.icon className={cn(
                          "w-6 h-6",
                          paymentMethod === method.id ? "text-emerald-400" : "text-slate-400"
                        )} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{method.name}</p>
                        <p className="text-sm text-slate-400">{method.description}</p>
                      </div>
                      {method.id === "applepay" && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">Fast</span>
                      )}
                    </label>
                  ))}
                </RadioGroup>

                {/* Amount Summary */}
                <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex justify-between text-lg">
                    <span className="text-slate-400">Amount to Pay</span>
                    <span className="text-emerald-400 font-bold font-mono">{getPaymentAmount()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={goToPrevStep}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={goToNextStep}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Details */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Type</span>
                    <span className="text-white capitalize">
                      {paymentOption === "full" ? "Pay in Full" : paymentOption === "plan" ? "Payment Plan" : "Custom Amount"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Method</span>
                    <span className="text-white">
                      {paymentMethods.find(m => m.id === paymentMethod)?.name}
                    </span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex justify-between text-lg">
                    <span className="text-white font-medium">Amount Due Today</span>
                    <span className="text-emerald-400 font-bold font-mono">{getPaymentAmount()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-400">
                    Need help? Call us at <span className="text-emerald-400">1-800-555-0123</span> or email{" "}
                    <span className="text-emerald-400">support@acmecollections.com</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div className="space-y-6">
              {/* Credit Card Form */}
              {paymentMethod === "card" && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Card Details
                      {formData.cardNumber && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded ml-auto">
                          {getCardType(formData.cardNumber)}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Card Number</Label>
                      <Input 
                        placeholder="1234 5678 9012 3456" 
                        className={cn(
                          "bg-slate-900 border-slate-600 font-mono",
                          touched.cardNumber && errors.cardNumber && "border-red-500 focus-visible:ring-red-500"
                        )}
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                        onBlur={() => handleBlur("cardNumber")}
                        maxLength={19}
                      />
                      {touched.cardNumber && errors.cardNumber && (
                        <p className="text-red-400 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.cardNumber}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Expiry Date</Label>
                        <Input 
                          placeholder="MM/YY" 
                          className={cn(
                            "bg-slate-900 border-slate-600",
                            touched.expiry && errors.expiry && "border-red-500 focus-visible:ring-red-500"
                          )}
                          value={formData.expiry}
                          onChange={(e) => handleInputChange("expiry", e.target.value)}
                          onBlur={() => handleBlur("expiry")}
                          maxLength={5}
                        />
                        {touched.expiry && errors.expiry && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.expiry}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">CVV</Label>
                        <Input 
                          placeholder="123" 
                          type="password"
                          className={cn(
                            "bg-slate-900 border-slate-600",
                            touched.cvv && errors.cvv && "border-red-500 focus-visible:ring-red-500"
                          )}
                          value={formData.cvv}
                          onChange={(e) => handleInputChange("cvv", e.target.value)}
                          onBlur={() => handleBlur("cvv")}
                          maxLength={4}
                        />
                        {touched.cvv && errors.cvv && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.cvv}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Name on Card</Label>
                      <Input 
                        placeholder="John Smith" 
                        className={cn(
                          "bg-slate-900 border-slate-600",
                          touched.nameOnCard && errors.nameOnCard && "border-red-500 focus-visible:ring-red-500"
                        )}
                        value={formData.nameOnCard}
                        onChange={(e) => handleInputChange("nameOnCard", e.target.value)}
                        onBlur={() => handleBlur("nameOnCard")}
                      />
                      {touched.nameOnCard && errors.nameOnCard && (
                        <p className="text-red-400 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.nameOnCard}
                        </p>
                      )}
                    </div>

                    <Separator className="bg-slate-700 my-4" />

                    {/* Billing Address */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Billing Address
                      </h4>
                      
                      <div className="space-y-2">
                        <Label className="text-slate-300">Street Address</Label>
                        <Input 
                          placeholder="123 Main Street" 
                          className={cn(
                            "bg-slate-900 border-slate-600",
                            touched.billingStreet && errors.billingStreet && "border-red-500 focus-visible:ring-red-500"
                          )}
                          value={formData.billingStreet}
                          onChange={(e) => handleInputChange("billingStreet", e.target.value)}
                          onBlur={() => handleBlur("billingStreet")}
                        />
                        {touched.billingStreet && errors.billingStreet && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.billingStreet}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">City</Label>
                          <Input 
                            placeholder="New York" 
                            className={cn(
                              "bg-slate-900 border-slate-600",
                              touched.billingCity && errors.billingCity && "border-red-500 focus-visible:ring-red-500"
                            )}
                            value={formData.billingCity}
                            onChange={(e) => handleInputChange("billingCity", e.target.value)}
                            onBlur={() => handleBlur("billingCity")}
                          />
                          {touched.billingCity && errors.billingCity && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.billingCity}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">State</Label>
                          <Input 
                            placeholder="NY" 
                            className={cn(
                              "bg-slate-900 border-slate-600",
                              touched.billingState && errors.billingState && "border-red-500 focus-visible:ring-red-500"
                            )}
                            value={formData.billingState}
                            onChange={(e) => handleInputChange("billingState", e.target.value)}
                            onBlur={() => handleBlur("billingState")}
                          />
                          {touched.billingState && errors.billingState && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.billingState}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">ZIP Code</Label>
                          <Input 
                            placeholder="10001" 
                            className={cn(
                              "bg-slate-900 border-slate-600",
                              touched.billingZip && errors.billingZip && "border-red-500 focus-visible:ring-red-500"
                            )}
                            value={formData.billingZip}
                            onChange={(e) => handleInputChange("billingZip", e.target.value)}
                            onBlur={() => handleBlur("billingZip")}
                          />
                          {touched.billingZip && errors.billingZip && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.billingZip}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Country</Label>
                          <Input 
                            value={formData.billingCountry}
                            onChange={(e) => setFormData({...formData, billingCountry: e.target.value})}
                            className="bg-slate-900 border-slate-600"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-sm text-slate-500 pt-2">
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        PCI Compliant
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Secure Checkout
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PayPal */}
              {paymentMethod === "paypal" && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-white text-lg font-medium mb-2">Pay with PayPal</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      You will be redirected to PayPal to complete your payment securely.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Shield className="w-4 h-4" />
                      Protected by PayPal Buyer Protection
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Apple Pay */}
              {paymentMethod === "applepay" && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
                      <Smartphone className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white text-lg font-medium mb-2">Pay with Apple Pay</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Use Face ID or Touch ID to confirm your payment instantly.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Lock className="w-4 h-4" />
                      Your card details are never shared
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bank Transfer */}
              {paymentMethod === "bank" && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Bank Transfer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-400 text-sm">
                      Transfer the payment to the following account. Your payment will be processed within 1-3 business days.
                    </p>
                    <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank Name</span>
                        <span className="text-white font-mono">First National Bank</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Name</span>
                        <span className="text-white font-mono">ACME Collections LLC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Routing Number</span>
                        <span className="text-white font-mono">021000021</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Number</span>
                        <span className="text-white font-mono">****7890</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reference</span>
                        <span className="text-emerald-400 font-mono">ACC-4521</span>
                      </div>
                    </div>
                    <p className="text-amber-400 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Important: Include the reference number in your transfer
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={goToPrevStep}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white py-6 px-8 disabled:opacity-50"
                  onClick={handlePayment}
                  disabled={paymentMethod === "card" && !isCardFormValid}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {paymentMethod === "bank" ? "Confirm Transfer" : `Pay ${getPaymentAmount()}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-500">
            <Card className="bg-slate-800/50 border-emerald-500/50">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {paymentMethod === "bank" ? "Transfer Initiated!" : "Payment Successful!"}
                </h2>
                <p className="text-slate-400 mb-6">
                  {paymentMethod === "bank" 
                    ? "Please complete the bank transfer using the details provided."
                    : `Your payment of ${getPaymentAmount()} has been processed successfully.`
                  }
                </p>
                
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-left">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Confirmation #</span>
                    <span className="text-white font-mono">TXN-2026-0127-4521</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Date</span>
                    <span className="text-white">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Method</span>
                    <span className="text-white">{paymentMethods.find(m => m.id === paymentMethod)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount</span>
                    <span className="text-emerald-400 font-bold">{getPaymentAmount()}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                  A confirmation email has been sent to your registered email address.
                </p>

                <Button 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => setLocation("/")}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Payment?"
        description="Your progress will be saved. You can return anytime to complete your payment."
        confirmText="Yes, Cancel"
        variant="warning"
        onConfirm={confirmCancel}
      />

      <ConfirmDialog
        open={confirmPaymentDialogOpen}
        onOpenChange={setConfirmPaymentDialogOpen}
        title="Confirm Payment"
        description={
          paymentMethod === "bank"
            ? `Please confirm you will transfer ${getPaymentAmount()} to the account provided.`
            : `You are about to pay ${getPaymentAmount()}. ${paymentMethod === "card" ? `This amount will be charged to your ${getCardType(formData.cardNumber)} ending in ${formData.cardNumber.slice(-4) || "****"}.` : ""} Proceed?`
        }
        confirmText={paymentMethod === "bank" ? "Confirm Transfer" : "Confirm Payment"}
        variant="success"
        onConfirm={confirmPayment}
      />

      <ConfirmDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        title="Resume Previous Session?"
        description="You have an incomplete payment from a previous session. Would you like to continue where you left off?"
        confirmText="Resume"
        cancelText="Start Fresh"
        variant="default"
        onConfirm={resumeProgress}
        onCancel={startFresh}
      />
    </div>
  );
}
