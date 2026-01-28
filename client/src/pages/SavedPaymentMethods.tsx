/**
 * MOJAVOX Saved Payment Methods Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - View all saved payment methods
 * - Add new credit cards
 * - Set default payment method
 * - Delete payment methods
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  CreditCard,
  Plus,
  Shield,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

// Card type detection
const getCardType = (number: string): { type: string; icon: string; color: string } => {
  const cleaned = number.replace(/\s/g, "");
  if (/^4/.test(cleaned)) return { type: "Visa", icon: "💳", color: "bg-blue-500" };
  if (/^5[1-5]/.test(cleaned)) return { type: "Mastercard", icon: "💳", color: "bg-orange-500" };
  if (/^3[47]/.test(cleaned)) return { type: "Amex", icon: "💳", color: "bg-green-500" };
  if (/^6(?:011|5)/.test(cleaned)) return { type: "Discover", icon: "💳", color: "bg-purple-500" };
  return { type: "Card", icon: "💳", color: "bg-slate-500" };
};

// Validation functions
const validateCardNumber = (value: string): { valid: boolean; error: string } => {
  const cleaned = value.replace(/\s/g, "");
  if (!cleaned) return { valid: false, error: "Card number is required" };
  if (!/^\d+$/.test(cleaned)) return { valid: false, error: "Card number must contain only digits" };
  if (cleaned.length < 13 || cleaned.length > 19) return { valid: false, error: "Card number must be 13-19 digits" };
  
  // Luhn algorithm
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

const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 16);
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleaned;
};

const formatExpiry = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 4);
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
  }
  return cleaned;
};

// Saved card type
interface SavedCard {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  cardholderName: string;
  isDefault: boolean;
  color: string;
  addedDate: string;
}

// Mock saved cards
const mockSavedCards: SavedCard[] = [
  {
    id: "card_1",
    type: "Visa",
    last4: "4521",
    expiry: "12/27",
    cardholderName: "John Smith",
    isDefault: true,
    color: "bg-blue-500",
    addedDate: "2025-06-15",
  },
  {
    id: "card_2",
    type: "Mastercard",
    last4: "8832",
    expiry: "08/26",
    cardholderName: "John Smith",
    isDefault: false,
    color: "bg-orange-500",
    addedDate: "2025-09-20",
  },
];

export default function SavedPaymentMethods() {
  const [loading, setLoading] = useState(true);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null);
  const [saving, setSaving] = useState(false);

  // New card form
  const [newCard, setNewCard] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
    setAsDefault: false,
  });

  const [errors, setErrors] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  });

  const [touched, setTouched] = useState({
    cardNumber: false,
    expiry: false,
    cvv: false,
    cardholderName: false,
  });

  // Load saved cards
  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setSavedCards(mockSavedCards);
      setLoading(false);
    };
    loadCards();
  }, []);

  const validateField = (field: string, value: string) => {
    let result = { valid: true, error: "" };
    switch (field) {
      case "cardNumber":
        result = validateCardNumber(value);
        break;
      case "expiry":
        result = validateExpiry(value);
        break;
      case "cvv":
        if (!value) result = { valid: false, error: "CVV is required" };
        else if (!/^\d{3,4}$/.test(value)) result = { valid: false, error: "CVV must be 3-4 digits" };
        break;
      case "cardholderName":
        if (!value.trim()) result = { valid: false, error: "Name is required" };
        else if (value.trim().length < 2) result = { valid: false, error: "Name is too short" };
        break;
    }
    setErrors(prev => ({ ...prev, [field]: result.error }));
    return result.valid;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value);
    } else if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }
    setNewCard(prev => ({ ...prev, [field]: formattedValue }));
    
    if (touched[field as keyof typeof touched]) {
      validateField(field, formattedValue);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, newCard[field as keyof typeof newCard] as string);
  };

  const isFormValid = () => {
    return !errors.cardNumber && !errors.expiry && !errors.cvv && !errors.cardholderName &&
      newCard.cardNumber && newCard.expiry && newCard.cvv && newCard.cardholderName;
  };

  const handleAddCard = async () => {
    // Validate all fields
    const cardValid = validateField("cardNumber", newCard.cardNumber);
    const expiryValid = validateField("expiry", newCard.expiry);
    const cvvValid = validateField("cvv", newCard.cvv);
    const nameValid = validateField("cardholderName", newCard.cardholderName);

    setTouched({
      cardNumber: true,
      expiry: true,
      cvv: true,
      cardholderName: true,
    });

    if (!cardValid || !expiryValid || !cvvValid || !nameValid) {
      return;
    }

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const cardInfo = getCardType(newCard.cardNumber);
    const newSavedCard: SavedCard = {
      id: `card_${Date.now()}`,
      type: cardInfo.type,
      last4: newCard.cardNumber.replace(/\s/g, "").slice(-4),
      expiry: newCard.expiry,
      cardholderName: newCard.cardholderName,
      isDefault: newCard.setAsDefault || savedCards.length === 0,
      color: cardInfo.color,
      addedDate: new Date().toISOString().split("T")[0],
    };

    if (newCard.setAsDefault) {
      setSavedCards(prev => prev.map(c => ({ ...c, isDefault: false })));
    }

    setSavedCards(prev => [...prev, newSavedCard]);
    setSaving(false);
    setAddCardOpen(false);
    
    // Reset form
    setNewCard({
      cardNumber: "",
      expiry: "",
      cvv: "",
      cardholderName: "",
      setAsDefault: false,
    });
    setTouched({
      cardNumber: false,
      expiry: false,
      cvv: false,
      cardholderName: false,
    });
    setErrors({
      cardNumber: "",
      expiry: "",
      cvv: "",
      cardholderName: "",
    });

    toast.success("Card added successfully", {
      description: `${cardInfo.type} ending in ${newSavedCard.last4} has been saved.`,
    });
  };

  const handleSetDefault = async (card: SavedCard) => {
    setSavedCards(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === card.id,
    })));
    toast.success("Default card updated", {
      description: `${card.type} ending in ${card.last4} is now your default payment method.`,
    });
  };

  const handleDeleteCard = (card: SavedCard) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;
    
    setSavedCards(prev => {
      const filtered = prev.filter(c => c.id !== cardToDelete.id);
      // If deleted card was default, make first remaining card default
      if (cardToDelete.isDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
    
    toast.success("Card removed", {
      description: `${cardToDelete.type} ending in ${cardToDelete.last4} has been removed.`,
    });
    
    setDeleteDialogOpen(false);
    setCardToDelete(null);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Payment Methods</h1>
            <p className="text-muted-foreground mt-1">Manage your saved cards and payment options</p>
          </div>
          <Button
            onClick={() => setAddCardOpen(true)}
            className="bg-neon-green hover:bg-neon-green/90 text-background"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Card
          </Button>
        </div>

        {/* Saved Cards */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-neon-blue" />
              Saved Cards
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({savedCards.length} {savedCards.length === 1 ? "card" : "cards"})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50">
                      <div className="w-16 h-10 rounded bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                      <div className="h-8 bg-muted rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : savedCards.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No saved cards</h3>
                <p className="text-muted-foreground mb-4">
                  Add a card to make payments faster and easier.
                </p>
                <Button
                  onClick={() => setAddCardOpen(true)}
                  className="bg-neon-green hover:bg-neon-green/90 text-background"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Card
                </Button>
              </div>
            ) : (
              <StaggerContainer className="space-y-3">
                {savedCards.map((card) => (
                  <StaggerItem key={card.id}>
                    <div className={cn(
                      "flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border transition-all",
                      card.isDefault 
                        ? "bg-neon-green/5 border-neon-green/30" 
                        : "bg-background/50 border-border hover:border-muted-foreground/30"
                    )}>
                      {/* Card Visual */}
                      <div className={cn(
                        "w-16 h-10 rounded-md flex items-center justify-center text-white text-xs font-bold",
                        card.color
                      )}>
                        {card.type.slice(0, 4).toUpperCase()}
                      </div>

                      {/* Card Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">
                            {card.type} •••• {card.last4}
                          </p>
                          {card.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neon-green/20 text-neon-green border border-neon-green/30">
                              <Star className="w-3 h-3 fill-current" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {card.cardholderName} • Expires {card.expiry}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!card.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(card)}
                            className="border-border"
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCard(card)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-neon-green/20">
                <Shield className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Your payment information is secure</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  All card details are encrypted using industry-standard 256-bit SSL encryption. 
                  We never store your full card number or CVV.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Card Dialog */}
        <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-neon-green" />
                Add New Card
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter your card details to save it for future payments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Card Number */}
              <div className="space-y-2">
                <Label className="text-foreground">Card Number</Label>
                <div className="relative">
                  <Input
                    placeholder="1234 5678 9012 3456"
                    value={newCard.cardNumber}
                    onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                    onBlur={() => handleBlur("cardNumber")}
                    className={cn(
                      "bg-background border-border font-mono pr-16",
                      touched.cardNumber && errors.cardNumber && "border-red-500"
                    )}
                    maxLength={19}
                  />
                  {newCard.cardNumber && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {getCardType(newCard.cardNumber).type}
                    </span>
                  )}
                </div>
                {touched.cardNumber && errors.cardNumber && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.cardNumber}
                  </p>
                )}
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Expiry Date</Label>
                  <Input
                    placeholder="MM/YY"
                    value={newCard.expiry}
                    onChange={(e) => handleInputChange("expiry", e.target.value)}
                    onBlur={() => handleBlur("expiry")}
                    className={cn(
                      "bg-background border-border",
                      touched.expiry && errors.expiry && "border-red-500"
                    )}
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
                  <Label className="text-foreground">CVV</Label>
                  <Input
                    placeholder="123"
                    type="password"
                    value={newCard.cvv}
                    onChange={(e) => handleInputChange("cvv", e.target.value)}
                    onBlur={() => handleBlur("cvv")}
                    className={cn(
                      "bg-background border-border",
                      touched.cvv && errors.cvv && "border-red-500"
                    )}
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

              {/* Cardholder Name */}
              <div className="space-y-2">
                <Label className="text-foreground">Cardholder Name</Label>
                <Input
                  placeholder="John Smith"
                  value={newCard.cardholderName}
                  onChange={(e) => handleInputChange("cardholderName", e.target.value)}
                  onBlur={() => handleBlur("cardholderName")}
                  className={cn(
                    "bg-background border-border",
                    touched.cardholderName && errors.cardholderName && "border-red-500"
                  )}
                />
                {touched.cardholderName && errors.cardholderName && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.cardholderName}
                  </p>
                )}
              </div>

              {/* Set as Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={newCard.setAsDefault}
                  onChange={(e) => setNewCard(prev => ({ ...prev, setAsDefault: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-background text-neon-green focus:ring-neon-green"
                />
                <Label htmlFor="setAsDefault" className="text-foreground cursor-pointer">
                  Set as default payment method
                </Label>
              </div>

              <Separator className="bg-border" />

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => setAddCardOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-neon-green hover:bg-neon-green/90 text-background"
                  onClick={handleAddCard}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Card
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Remove Payment Method?"
          description={cardToDelete ? `Are you sure you want to remove your ${cardToDelete.type} ending in ${cardToDelete.last4}? This action cannot be undone.` : ""}
          confirmText="Remove Card"
          variant="danger"
          onConfirm={confirmDeleteCard}
        />
      </div>
    </PageTransition>
  );
}
