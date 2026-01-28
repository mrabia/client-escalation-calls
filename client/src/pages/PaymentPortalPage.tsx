/**
 * MOJAVOX Payment Portal Page (Integrated with Dashboard Layout)
 * Style: Cyberpunk Corporate - Consistent with main app
 * 
 * This page wraps the payment functionality within the main dashboard layout
 * for consistent navigation and user experience.
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

// Saved card type
interface SavedCard {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  cardholderName: string;
  isDefault: boolean;
  color: string;
}

// Mock saved cards (in real app, would come from API)
const mockSavedCards: SavedCard[] = [
  {
    id: "card_1",
    type: "Visa",
    last4: "4521",
    expiry: "12/27",
    cardholderName: "John Smith",
    isDefault: true,
    color: "bg-blue-500",
  },
  {
    id: "card_2",
    type: "Mastercard",
    last4: "8832",
    expiry: "08/26",
    cardholderName: "John Smith",
    isDefault: false,
    color: "bg-orange-500",
  },
];

export default function PaymentPortalPage() {
  const [, setLocation] = useLocation();
  const [paymentOption, setPaymentOption] = useState("full");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [currentStep, setCurrentStep] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savedCards] = useState<SavedCard[]>(mockSavedCards);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  
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

  // Check if card form is valid (either saved card selected or new card form filled)
  const isCardFormValid = paymentMethod !== "card" || 
    (selectedSavedCard && !useNewCard) || // Saved card selected
    ( // New card form filled
      !errors.cardNumber && !errors.expiry && !errors.cvv && !errors.nameOnCard &&
      !errors.billingStreet && !errors.billingCity && !errors.billingState && !errors.billingZip &&
      formData.cardNumber && formData.expiry && formData.cvv && formData.nameOnCard &&
      formData.billingStreet && formData.billingCity && formData.billingState && formData.billingZip
    );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-background" />
            </div>
            Secure Payment Portal
          </h1>
          <p className="text-muted-foreground mt-1">Process payments securely with multiple payment options</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 text-neon-green" />
          <span>256-bit SSL Encrypted</span>
        </div>
      </div>

      {/* Progress Indicator */}
      <Card className="bg-card/50 border-border">
        <CardContent className="py-4">
          <div className="flex items-center justify-center max-w-xl mx-auto">
            {paymentSteps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
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
                  <span className={cn(
                    "text-xs mt-2 hidden sm:block whitespace-nowrap",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
                {i < paymentSteps.length - 1 && (
                  <div className={cn(
                    "w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 transition-all duration-500",
                    currentStep > step.id ? "bg-neon-green" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-neon-green animate-spin mx-auto mb-4" />
            <p className="text-foreground text-lg font-medium">Processing Payment...</p>
            <p className="text-muted-foreground text-sm">Please do not close this window</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Payment Option */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Account Summary */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number</span>
                <span className="text-foreground font-mono">****4521</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Balance</span>
                <span className="text-foreground font-mono">$2,400.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payments Made</span>
                <span className="text-neon-green font-mono">-$0.00</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between text-lg">
                <span className="text-foreground font-medium">Current Balance</span>
                <span className="text-foreground font-bold font-mono">$2,400.00</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Payment Options</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentOption} onValueChange={setPaymentOption} className="space-y-3">
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  paymentOption === "full" ? "border-neon-green bg-neon-green/10" : "border-border hover:border-muted-foreground"
                )}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="full" id="full" />
                    <div>
                      <Label htmlFor="full" className="text-foreground font-medium cursor-pointer">Pay in Full</Label>
                      <p className="text-sm text-muted-foreground">Clear your balance today</p>
                    </div>
                  </div>
                  <span className="text-foreground font-bold font-mono">$2,400.00</span>
                </div>

                <div className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  paymentOption === "plan" ? "border-neon-green bg-neon-green/10" : "border-border hover:border-muted-foreground"
                )}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="plan" id="plan" />
                    <div>
                      <Label htmlFor="plan" className="text-foreground font-medium cursor-pointer">Payment Plan</Label>
                      <p className="text-sm text-muted-foreground">16 monthly payments</p>
                    </div>
                  </div>
                  <span className="text-foreground font-bold font-mono">$150/mo</span>
                </div>

                <div className={cn(
                  "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                  paymentOption === "custom" ? "border-neon-green bg-neon-green/10" : "border-border hover:border-muted-foreground"
                )}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="custom" id="custom" />
                    <div>
                      <Label htmlFor="custom" className="text-foreground font-medium cursor-pointer">Custom Amount</Label>
                      <p className="text-sm text-muted-foreground">Pay what you can today</p>
                    </div>
                  </div>
                  {paymentOption === "custom" ? (
                    <Input
                      type="text"
                      placeholder="$0.00"
                      value={formData.customAmount}
                      onChange={(e) => handleInputChange("customAmount", e.target.value)}
                      className="w-24 text-right bg-background border-border"
                    />
                  ) : (
                    <span className="text-muted-foreground font-mono">$0.00</span>
                  )}
                </div>
              </RadioGroup>

              <Button 
                className="w-full mt-6 bg-neon-green hover:bg-neon-green/90 text-background"
                onClick={goToNextStep}
              >
                Continue to Payment Method
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Payment Method Selection */}
      {currentStep === 2 && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Select Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      paymentMethod === method.id ? "border-neon-green bg-neon-green/10" : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value={method.id} id={method.id} />
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <method.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor={method.id} className="text-foreground font-medium cursor-pointer">{method.name}</Label>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={goToPrevStep} className="border-border">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  className="flex-1 bg-neon-green hover:bg-neon-green/90 text-background"
                  onClick={goToNextStep}
                >
                  Continue to Payment Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Payment Details */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Payment Form */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethod === "card" && (
                <>
                  {/* Saved Cards Section */}
                  {savedCards.length > 0 && !useNewCard && (
                    <div className="space-y-3 mb-4">
                      <Label className="text-foreground">Saved Cards</Label>
                      <div className="space-y-2">
                        {savedCards.map((card) => (
                          <div
                            key={card.id}
                            onClick={() => setSelectedSavedCard(card.id)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              selectedSavedCard === card.id
                                ? "border-neon-green bg-neon-green/10"
                                : "border-border hover:border-muted-foreground"
                            )}
                          >
                            <div className={cn("w-10 h-6 rounded flex items-center justify-center text-white text-xs font-bold", card.color)}>
                              {card.type.slice(0, 4)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">•••• •••• •••• {card.last4}</p>
                              <p className="text-xs text-muted-foreground">{card.cardholderName} • Expires {card.expiry}</p>
                            </div>
                            {card.isDefault && (
                              <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-0.5 rounded">Default</span>
                            )}
                            {selectedSavedCard === card.id && (
                              <Check className="w-5 h-5 text-neon-green" />
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => { setUseNewCard(true); setSelectedSavedCard(null); }}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Use a different card
                      </Button>
                    </div>
                  )}

                  {/* New Card Form */}
                  {(useNewCard || savedCards.length === 0) && (
                    <>
                      {savedCards.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mb-2 text-muted-foreground"
                          onClick={() => { setUseNewCard(false); setSelectedSavedCard(savedCards.find(c => c.isDefault)?.id || savedCards[0]?.id || null); }}
                        >
                          ← Back to saved cards
                        </Button>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-foreground">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                        onBlur={() => handleBlur("cardNumber")}
                        className={cn(
                          "bg-background border-border pl-10",
                          touched.cardNumber && errors.cardNumber && "border-destructive"
                        )}
                      />
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      {formData.cardNumber && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCardType(formData.cardNumber)}
                        </span>
                      )}
                    </div>
                    {touched.cardNumber && errors.cardNumber && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.cardNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry" className="text-foreground">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={formData.expiry}
                        onChange={(e) => handleInputChange("expiry", e.target.value)}
                        onBlur={() => handleBlur("expiry")}
                        className={cn(
                          "bg-background border-border",
                          touched.expiry && errors.expiry && "border-destructive"
                        )}
                      />
                      {touched.expiry && errors.expiry && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.expiry}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="text-foreground">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={formData.cvv}
                        onChange={(e) => handleInputChange("cvv", e.target.value)}
                        onBlur={() => handleBlur("cvv")}
                        className={cn(
                          "bg-background border-border",
                          touched.cvv && errors.cvv && "border-destructive"
                        )}
                      />
                      {touched.cvv && errors.cvv && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.cvv}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nameOnCard" className="text-foreground">Name on Card</Label>
                    <Input
                      id="nameOnCard"
                      placeholder="John Smith"
                      value={formData.nameOnCard}
                      onChange={(e) => handleInputChange("nameOnCard", e.target.value)}
                      onBlur={() => handleBlur("nameOnCard")}
                      className={cn(
                        "bg-background border-border",
                        touched.nameOnCard && errors.nameOnCard && "border-destructive"
                      )}
                    />
                    {touched.nameOnCard && errors.nameOnCard && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.nameOnCard}
                      </p>
                    )}
                  </div>

                  <Separator className="bg-border my-4" />

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Billing Address</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="billingStreet" className="text-foreground">Street Address</Label>
                      <Input
                        id="billingStreet"
                        placeholder="123 Main Street"
                        value={formData.billingStreet}
                        onChange={(e) => handleInputChange("billingStreet", e.target.value)}
                        onBlur={() => handleBlur("billingStreet")}
                        className={cn(
                          "bg-background border-border",
                          touched.billingStreet && errors.billingStreet && "border-destructive"
                        )}
                      />
                      {touched.billingStreet && errors.billingStreet && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.billingStreet}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="billingCity" className="text-foreground">City</Label>
                        <Input
                          id="billingCity"
                          placeholder="New York"
                          value={formData.billingCity}
                          onChange={(e) => handleInputChange("billingCity", e.target.value)}
                          onBlur={() => handleBlur("billingCity")}
                          className={cn(
                            "bg-background border-border",
                            touched.billingCity && errors.billingCity && "border-destructive"
                          )}
                        />
                        {touched.billingCity && errors.billingCity && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.billingCity}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="billingState" className="text-foreground">State</Label>
                        <Input
                          id="billingState"
                          placeholder="NY"
                          value={formData.billingState}
                          onChange={(e) => handleInputChange("billingState", e.target.value)}
                          onBlur={() => handleBlur("billingState")}
                          className={cn(
                            "bg-background border-border",
                            touched.billingState && errors.billingState && "border-destructive"
                          )}
                        />
                        {touched.billingState && errors.billingState && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.billingState}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billingZip" className="text-foreground">ZIP Code</Label>
                      <Input
                        id="billingZip"
                        placeholder="10001"
                        value={formData.billingZip}
                        onChange={(e) => handleInputChange("billingZip", e.target.value)}
                        onBlur={() => handleBlur("billingZip")}
                        className={cn(
                          "bg-background border-border",
                          touched.billingZip && errors.billingZip && "border-destructive"
                        )}
                      />
                      {touched.billingZip && errors.billingZip && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.billingZip}
                        </p>
                      )}
                    </div>
                  </div>
                    </>
                  )}
                </>
              )}

              {paymentMethod === "paypal" && (
                <div className="text-center py-8">
                  <Wallet className="w-16 h-16 text-[#0070ba] mx-auto mb-4" />
                  <p className="text-foreground mb-2">You will be redirected to PayPal</p>
                  <p className="text-sm text-muted-foreground">Complete your payment securely with PayPal</p>
                </div>
              )}

              {paymentMethod === "applepay" && (
                <div className="text-center py-8">
                  <Smartphone className="w-16 h-16 text-foreground mx-auto mb-4" />
                  <p className="text-foreground mb-2">Apple Pay</p>
                  <p className="text-sm text-muted-foreground">Use Face ID or Touch ID to complete payment</p>
                </div>
              )}

              {paymentMethod === "bank" && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">Bank Transfer Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="text-foreground font-mono">First National Bank</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Routing Number:</span>
                        <span className="text-foreground font-mono">021000021</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="text-foreground font-mono">1234567890</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reference:</span>
                        <span className="text-foreground font-mono">ACC-4521</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Please include your account reference when making the transfer. 
                    Payments typically take 2-3 business days to process.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={goToPrevStep} className="border-border">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  className="flex-1 bg-neon-green hover:bg-neon-green/90 text-background"
                  onClick={handlePayment}
                  disabled={paymentMethod === "card" && !isCardFormValid}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Pay {getPaymentAmount()}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="bg-card border-border h-fit">
            <CardHeader>
              <CardTitle className="text-foreground">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Option</span>
                <span className="text-foreground capitalize">{paymentOption === "full" ? "Pay in Full" : paymentOption === "plan" ? "Payment Plan" : "Custom Amount"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="text-foreground">{paymentMethods.find(m => m.id === paymentMethod)?.name}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between text-lg">
                <span className="text-foreground font-medium">Total Due Today</span>
                <span className="text-neon-green font-bold font-mono">{getPaymentAmount()}</span>
              </div>

              <div className="p-4 bg-muted rounded-lg mt-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-neon-green shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure Payment</p>
                    <p className="text-xs text-muted-foreground">Your payment information is encrypted and secure. We never store your full card details.</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>Need help? Call us at <span className="text-neon-green">1-800-555-0123</span></p>
                <p>or email <span className="text-neon-green">support@mojavox.ai</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <div className="max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-500">
          <Card className="bg-card border-border text-center">
            <CardContent className="py-12">
              <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-neon-green" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for your payment. A confirmation email has been sent to your registered email address.
              </p>
              
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="text-foreground font-mono">TXN-{Date.now().toString(36).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="text-neon-green font-mono">{getPaymentAmount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 border-border"
                  onClick={() => toast.info("Receipt download coming soon")}
                >
                  Download Receipt
                </Button>
                <Button 
                  className="flex-1 bg-neon-green hover:bg-neon-green/90 text-background"
                  onClick={() => setLocation("/payment-history")}
                >
                  View Payment History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Payment?"
        description="Your progress will be saved. You can return anytime to complete your payment."
        confirmText="Yes, Cancel"
        cancelText="Continue Payment"
        variant="warning"
        onConfirm={() => {
          toast.info("Payment cancelled", {
            description: "Your progress has been saved.",
          });
          setCancelDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmPaymentDialogOpen}
        onOpenChange={setConfirmPaymentDialogOpen}
        title="Confirm Payment"
        description={`You are about to pay ${getPaymentAmount()}. This action cannot be undone.`}
        confirmText="Confirm Payment"
        cancelText="Review Details"
        variant="default"
        onConfirm={confirmPayment}
      />

      <ConfirmDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        title="Resume Previous Session?"
        description="We found a saved payment session. Would you like to continue where you left off?"
        confirmText="Resume"
        cancelText="Start Fresh"
        variant="default"
        onConfirm={resumeProgress}
        onCancel={startFresh}
      />
    </div>
  );
}
