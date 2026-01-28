/**
 * MOJAVOX Recurring Payments Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - View active recurring payments
 * - Set up new recurring payment schedules
 * - Pause/resume recurring payments
 * - Cancel recurring payments
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  CreditCard,
  DollarSign,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
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

// Recurring payment type
interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  nextPaymentDate: string;
  paymentMethod: {
    type: string;
    last4: string;
  };
  status: "active" | "paused" | "cancelled";
  startDate: string;
  totalPaid: number;
  paymentsCompleted: number;
  accountNumber: string;
}

// Mock recurring payments
const mockRecurringPayments: RecurringPayment[] = [
  {
    id: "rec_1",
    name: "Monthly Payment Plan",
    amount: 150.0,
    frequency: "monthly",
    nextPaymentDate: "2026-02-15",
    paymentMethod: { type: "Visa", last4: "4521" },
    status: "active",
    startDate: "2025-11-15",
    totalPaid: 450.0,
    paymentsCompleted: 3,
    accountNumber: "****4521",
  },
  {
    id: "rec_2",
    name: "Quarterly Settlement",
    amount: 600.0,
    frequency: "quarterly",
    nextPaymentDate: "2026-04-01",
    paymentMethod: { type: "Mastercard", last4: "8832" },
    status: "paused",
    startDate: "2025-10-01",
    totalPaid: 600.0,
    paymentsCompleted: 1,
    accountNumber: "****7890",
  },
];

// Frequency labels
const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

// Status badge component
function StatusBadge({ status }: { status: RecurringPayment["status"] }) {
  const config = {
    active: {
      icon: Play,
      label: "Active",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    paused: {
      icon: Pause,
      label: "Paused",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    cancelled: {
      icon: X,
      label: "Cancelled",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function RecurringPayments() {
  const [loading, setLoading] = useState(true);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<RecurringPayment | null>(null);
  const [saving, setSaving] = useState(false);

  // New recurring payment form
  const [newPayment, setNewPayment] = useState({
    amount: "",
    frequency: "monthly",
    startDate: "",
    paymentMethod: "card_1",
  });

  // Mock saved cards for selection
  const savedCards = [
    { id: "card_1", type: "Visa", last4: "4521" },
    { id: "card_2", type: "Mastercard", last4: "8832" },
  ];

  // Load recurring payments
  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setRecurringPayments(mockRecurringPayments);
      setLoading(false);
    };
    loadPayments();
  }, []);

  const handleSetupRecurring = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!newPayment.startDate) {
      toast.error("Please select a start date");
      return;
    }

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const selectedCard = savedCards.find(c => c.id === newPayment.paymentMethod);
    const newRecurring: RecurringPayment = {
      id: `rec_${Date.now()}`,
      name: `${frequencyLabels[newPayment.frequency]} Payment`,
      amount: parseFloat(newPayment.amount),
      frequency: newPayment.frequency as RecurringPayment["frequency"],
      nextPaymentDate: newPayment.startDate,
      paymentMethod: selectedCard || { type: "Card", last4: "****" },
      status: "active",
      startDate: newPayment.startDate,
      totalPaid: 0,
      paymentsCompleted: 0,
      accountNumber: "****4521",
    };

    setRecurringPayments(prev => [...prev, newRecurring]);
    setSaving(false);
    setSetupDialogOpen(false);
    
    // Reset form
    setNewPayment({
      amount: "",
      frequency: "monthly",
      startDate: "",
      paymentMethod: "card_1",
    });

    toast.success("Recurring payment set up", {
      description: `${frequencyLabels[newPayment.frequency]} payment of $${parseFloat(newPayment.amount).toFixed(2)} will start on ${new Date(newPayment.startDate).toLocaleDateString()}.`,
    });
  };

  const handleTogglePause = async (payment: RecurringPayment) => {
    const newStatus = payment.status === "active" ? "paused" : "active";
    setRecurringPayments(prev => prev.map(p => 
      p.id === payment.id ? { ...p, status: newStatus } : p
    ));
    
    toast.success(newStatus === "paused" ? "Payment paused" : "Payment resumed", {
      description: newStatus === "paused" 
        ? `${payment.name} has been paused. No payments will be processed until resumed.`
        : `${payment.name} has been resumed. Next payment on ${new Date(payment.nextPaymentDate).toLocaleDateString()}.`,
    });
  };

  const handleCancelPayment = (payment: RecurringPayment) => {
    setPaymentToCancel(payment);
    setCancelDialogOpen(true);
  };

  const confirmCancelPayment = async () => {
    if (!paymentToCancel) return;
    
    setRecurringPayments(prev => prev.map(p => 
      p.id === paymentToCancel.id ? { ...p, status: "cancelled" as const } : p
    ));
    
    toast.success("Recurring payment cancelled", {
      description: `${paymentToCancel.name} has been cancelled. No further payments will be processed.`,
    });
    
    setCancelDialogOpen(false);
    setPaymentToCancel(null);
  };

  // Calculate next payment date based on frequency
  const getMinStartDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // Calculate totals
  const activePayments = recurringPayments.filter(p => p.status === "active");
  const monthlyTotal = activePayments.reduce((sum, p) => {
    let monthlyAmount = p.amount;
    switch (p.frequency) {
      case "weekly": monthlyAmount = p.amount * 4.33; break;
      case "biweekly": monthlyAmount = p.amount * 2.17; break;
      case "quarterly": monthlyAmount = p.amount / 3; break;
      case "annually": monthlyAmount = p.amount / 12; break;
    }
    return sum + monthlyAmount;
  }, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Recurring Payments</h1>
            <p className="text-muted-foreground mt-1">Manage your automatic payment schedules</p>
          </div>
          <Button
            onClick={() => setSetupDialogOpen(true)}
            className="bg-neon-green hover:bg-neon-green/90 text-background"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set Up Recurring Payment
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-green/20">
                  <RefreshCw className="w-5 h-5 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Schedules</p>
                  <p className="text-xl font-bold text-foreground">{activePayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-blue/20">
                  <DollarSign className="w-5 h-5 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Monthly</p>
                  <p className="text-xl font-bold text-foreground font-mono">${monthlyTotal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Payment</p>
                  <p className="text-xl font-bold text-foreground">
                    {activePayments.length > 0
                      ? new Date(Math.min(...activePayments.map(p => new Date(p.nextPaymentDate).getTime()))).toLocaleDateString()
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Payments List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-neon-blue" />
              Payment Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50">
                      <div className="w-12 h-12 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                      <div className="h-8 bg-muted rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recurringPayments.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No recurring payments</h3>
                <p className="text-muted-foreground mb-4">
                  Set up automatic payments to never miss a due date.
                </p>
                <Button
                  onClick={() => setSetupDialogOpen(true)}
                  className="bg-neon-green hover:bg-neon-green/90 text-background"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Set Up Your First Schedule
                </Button>
              </div>
            ) : (
              <StaggerContainer className="space-y-3">
                {recurringPayments.map((payment) => (
                  <StaggerItem key={payment.id}>
                    <div className={cn(
                      "flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-lg border transition-all",
                      payment.status === "active" 
                        ? "bg-background/50 border-border" 
                        : "bg-background/30 border-border/50 opacity-75"
                    )}>
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                        payment.status === "active" ? "bg-neon-green/20" : "bg-muted"
                      )}>
                        <RefreshCw className={cn(
                          "w-6 h-6",
                          payment.status === "active" ? "text-neon-green" : "text-muted-foreground"
                        )} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{payment.name}</p>
                          <StatusBadge status={payment.status} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${payment.amount.toFixed(2)} {frequencyLabels[payment.frequency].toLowerCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {payment.paymentMethod.type} •••• {payment.paymentMethod.last4}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Next: {new Date(payment.nextPaymentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {payment.paymentsCompleted} payments completed • ${payment.totalPaid.toFixed(2)} total paid
                        </p>
                      </div>

                      {/* Actions */}
                      {payment.status !== "cancelled" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePause(payment)}
                            className="border-border"
                          >
                            {payment.status === "active" ? (
                              <>
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelPayment(payment)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </CardContent>
        </Card>

        {/* Setup Dialog */}
        <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-neon-green" />
                Set Up Recurring Payment
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Configure automatic payments to be processed on a schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-foreground">Payment Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-background border-border pl-10 font-mono"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label className="text-foreground">Payment Frequency</Label>
                <Select
                  value={newPayment.frequency}
                  onValueChange={(value) => setNewPayment(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={newPayment.startDate}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background border-border"
                  min={getMinStartDate()}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-foreground">Payment Method</Label>
                <Select
                  value={newPayment.paymentMethod}
                  onValueChange={(value) => setNewPayment(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {savedCards.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.type} •••• {card.last4}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                <p className="text-sm text-neon-blue flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    You can pause or cancel recurring payments at any time. 
                    Payments will be processed automatically on the scheduled dates.
                  </span>
                </p>
              </div>

              <Separator className="bg-border" />

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => setSetupDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-neon-green hover:bg-neon-green/90 text-background"
                  onClick={handleSetupRecurring}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                      Setting Up...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Set Up Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <ConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          title="Cancel Recurring Payment?"
          description={paymentToCancel ? `Are you sure you want to cancel "${paymentToCancel.name}"? No further automatic payments will be processed. This action cannot be undone.` : ""}
          confirmText="Cancel Payment"
          variant="danger"
          onConfirm={confirmCancelPayment}
        />
      </div>
    </PageTransition>
  );
}
