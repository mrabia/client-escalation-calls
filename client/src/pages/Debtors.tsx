/**
 * MOJAVOX Debtor 360
 * Style: Cyberpunk Corporate
 * 
 * Comprehensive debtor management and CRM view.
 * Enhanced with loading states, animations, and confirmation modals.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedProgress, AnimatedCounter } from "@/components/ui/page-transition";
import { KPICardSkeleton, TableSkeleton } from "@/components/ui/skeleton-loaders";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockDebtors } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function getRiskColor(score: number): string {
  if (score >= 70) return "text-neon-green";
  if (score >= 40) return "text-neon-yellow";
  return "text-neon-pink";
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    in_progress: "border-neon-blue text-neon-blue",
    escalated: "border-neon-pink text-neon-pink",
    promised: "border-neon-green text-neon-green",
    paid: "border-neon-green text-neon-green bg-neon-green/10",
  };

  const labels: Record<string, string> = {
    in_progress: "In Progress",
    escalated: "Escalated",
    promised: "Payment Promised",
    paid: "Paid",
  };

  return (
    <Badge variant="outline" className={styles[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
}

function DebtorDetailPanel({ 
  debtor, 
  onScheduleCall,
  onSendEmail,
  onEscalate,
  onRecordPayment,
}: { 
  debtor: (typeof mockDebtors)[0] | null;
  onScheduleCall: () => void;
  onSendEmail: () => void;
  onEscalate: () => void;
  onRecordPayment: () => void;
}) {
  if (!debtor) {
    return (
      <Card className="data-card h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[500px]">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a debtor to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="data-card">
      <CardHeader className="border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{debtor.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{debtor.contactName}</p>
          </div>
          {getStatusBadge(debtor.status)}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[500px] pr-4">
          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                <Mail className="w-4 h-4 text-neon-blue" />
                <span className="text-sm truncate">{debtor.email}</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                <Phone className="w-4 h-4 text-neon-green" />
                <span className="text-sm">{debtor.phone}</span>
              </div>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground">Financial Overview</h3>
            <div className="p-4 rounded-lg bg-gradient-to-br from-neon-green/10 to-transparent border border-neon-green/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Owed</span>
                <span className="text-2xl font-display font-bold text-neon-green">
                  {formatCurrency(debtor.totalOwed)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-neon-pink" />
                <span className="text-neon-pink">{debtor.daysOverdue} days overdue</span>
              </div>
            </div>
          </div>

          {/* Risk Score */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground">AI Risk Assessment</h3>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm">Solvability Score</span>
                <span className={cn("text-2xl font-display font-bold", getRiskColor(debtor.riskScore))}>
                  {debtor.riskScore}
                </span>
              </div>
              <AnimatedProgress value={debtor.riskScore} />
              <p className="text-xs text-muted-foreground mt-2">
                {debtor.riskScore >= 70
                  ? "High likelihood of payment - recommend standard approach"
                  : debtor.riskScore >= 40
                  ? "Medium risk - consider flexible payment options"
                  : "High risk - escalation may be required"}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground">Payment History</h3>
            {debtor.paymentHistory.length > 0 ? (
              <div className="space-y-2">
                {debtor.paymentHistory.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neon-green/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-neon-green" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{payment.method}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payment history</p>
              </div>
            )}
          </div>

          {/* Last Contact */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-muted-foreground">Last Contact</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(debtor.lastContact).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start" onClick={onScheduleCall}>
                <Phone className="w-4 h-4 mr-2" />
                Schedule Call
              </Button>
              <Button variant="outline" className="justify-start" onClick={onSendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-neon-yellow border-neon-yellow hover:bg-neon-yellow/10"
                onClick={onEscalate}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Escalate
              </Button>
              <Button 
                variant="outline" 
                className="justify-start text-neon-green border-neon-green hover:bg-neon-green/10"
                onClick={onRecordPayment}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function Debtors() {
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Confirmation dialogs
  const [scheduleCallDialogOpen, setScheduleCallDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [addDebtorDialogOpen, setAddDebtorDialogOpen] = useState(false);
  
  // Form states
  const [newDebtor, setNewDebtor] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    totalOwed: "",
  });
  const [scheduleCallForm, setScheduleCallForm] = useState({
    date: "",
    time: "",
    priority: "normal",
    notes: "",
  });
  const [emailForm, setEmailForm] = useState({
    template: "reminder",
    subject: "",
    customMessage: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "card",
    date: new Date().toISOString().split("T")[0],
    reference: "",
  });

  const selectedDebtor = mockDebtors.find((d) => d.id === selectedDebtorId) || null;

  const filteredDebtors = mockDebtors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOwed = mockDebtors.reduce((sum, d) => sum + d.totalOwed, 0);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const confirmScheduleCall = () => {
    toast.success("Call scheduled", {
      description: `AI agent will call ${selectedDebtor?.contactName} within the next hour.`,
    });
  };

  const confirmSendEmail = () => {
    toast.success("Email queued", {
      description: `Collection email will be sent to ${selectedDebtor?.email}.`,
    });
  };

  const confirmEscalate = () => {
    toast.warning("Case escalated", {
      description: "This debtor has been escalated to a supervisor for review.",
    });
  };

  const confirmRecordPayment = () => {
    toast.success("Payment recorded", {
      description: "The payment has been recorded and the account updated.",
    });
  };

  const handleAddDebtor = () => {
    if (!newDebtor.name || !newDebtor.email || !newDebtor.totalOwed) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Debtor added", {
      description: `${newDebtor.name} has been added to the system.`,
    });
    setAddDebtorDialogOpen(false);
    setNewDebtor({ name: "", contactName: "", email: "", phone: "", totalOwed: "" });
  };

  const handleScheduleCall = () => {
    if (!scheduleCallForm.date || !scheduleCallForm.time) {
      toast.error("Please select a date and time");
      return;
    }
    toast.success("Call scheduled", {
      description: `AI agent will call ${selectedDebtor?.contactName} on ${scheduleCallForm.date} at ${scheduleCallForm.time}.`,
    });
    setScheduleCallDialogOpen(false);
    setScheduleCallForm({ date: "", time: "", priority: "normal", notes: "" });
  };

  const handleSendEmail = () => {
    toast.success("Email sent", {
      description: `${emailForm.template} email has been sent to ${selectedDebtor?.email}.`,
    });
    setSendEmailDialogOpen(false);
    setEmailForm({ template: "reminder", subject: "", customMessage: "" });
  };

  const handleRecordPayment = () => {
    if (!paymentForm.amount) {
      toast.error("Please enter the payment amount");
      return;
    }
    toast.success("Payment recorded", {
      description: `Payment of $${paymentForm.amount} has been recorded for ${selectedDebtor?.name}.`,
    });
    setRecordPaymentDialogOpen(false);
    setPaymentForm({ amount: "", method: "card", date: new Date().toISOString().split("T")[0], reference: "" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <TableSkeleton rows={6} columns={5} />
          </div>
          <div className="h-[600px] bg-card border border-border rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-neon-blue" />
              Debtor 360
            </h1>
            <p className="text-muted-foreground">
              Comprehensive debtor management and insights
            </p>
          </div>
          <Button 
            className="bg-neon-green text-background hover:bg-neon-green/90"
            onClick={() => setAddDebtorDialogOpen(true)}
          >
            <User className="w-4 h-4 mr-2" />
            Add Debtor
          </Button>
        </div>

        {/* Stats Row */}
        <StaggerContainer className="grid grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debtors</p>
                    <p className="text-2xl font-display font-bold">
                      <AnimatedCounter value={mockDebtors.length} />
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-neon-blue opacity-50" />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                    <p className="text-2xl font-display font-bold text-neon-green">
                      <AnimatedCounter value={totalOwed} formatter={formatCurrency} />
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-neon-green opacity-50" />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">High Risk</p>
                    <p className="text-2xl font-display font-bold text-neon-pink">
                      <AnimatedCounter value={mockDebtors.filter((d) => d.riskScore < 40).length} />
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-neon-pink opacity-50" />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="data-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Promised</p>
                    <p className="text-2xl font-display font-bold text-neon-yellow">
                      <AnimatedCounter value={mockDebtors.filter((d) => d.status === "promised").length} />
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-neon-yellow opacity-50" />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Debtor List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search debtors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            {/* Table */}
            <Card className="data-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Company</TableHead>
                    <TableHead>Amount Owed</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebtors.map((debtor, index) => (
                    <TableRow
                      key={debtor.id}
                      className={cn(
                        "cursor-pointer border-border transition-all hover:scale-[1.01]",
                        selectedDebtorId === debtor.id && "bg-neon-green/5"
                      )}
                      onClick={() => setSelectedDebtorId(debtor.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{debtor.name}</p>
                          <p className="text-sm text-muted-foreground">{debtor.contactName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-neon-green">
                        {formatCurrency(debtor.totalOwed)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            debtor.daysOverdue > 60
                              ? "text-neon-pink"
                              : debtor.daysOverdue > 30
                              ? "text-neon-yellow"
                              : "text-foreground"
                          )}
                        >
                          {debtor.daysOverdue} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                debtor.riskScore >= 70
                                  ? "bg-neon-green"
                                  : debtor.riskScore >= 40
                                  ? "bg-neon-yellow"
                                  : "bg-neon-pink"
                              )}
                              style={{ width: `${debtor.riskScore}%` }}
                            />
                          </div>
                          <span className={cn("font-mono text-sm", getRiskColor(debtor.riskScore))}>
                            {debtor.riskScore}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(debtor.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDebtorId(debtor.id)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Detail Panel */}
          <div>
            <DebtorDetailPanel 
              debtor={selectedDebtor} 
              onScheduleCall={() => setScheduleCallDialogOpen(true)}
              onSendEmail={() => setSendEmailDialogOpen(true)}
              onEscalate={() => setEscalateDialogOpen(true)}
              onRecordPayment={() => setRecordPaymentDialogOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Add Debtor Dialog */}
      <Dialog open={addDebtorDialogOpen} onOpenChange={setAddDebtorDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-neon-green" />
              Add New Debtor
            </DialogTitle>
            <DialogDescription>
              Add a new debtor to the system manually
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  placeholder="e.g., Acme Corp"
                  value={newDebtor.name}
                  onChange={(e) => setNewDebtor({ ...newDebtor, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  placeholder="e.g., John Smith"
                  value={newDebtor.contactName}
                  onChange={(e) => setNewDebtor({ ...newDebtor, contactName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="contact@company.com"
                  value={newDebtor.email}
                  onChange={(e) => setNewDebtor({ ...newDebtor, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={newDebtor.phone}
                  onChange={(e) => setNewDebtor({ ...newDebtor, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Amount Owed *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newDebtor.totalOwed}
                onChange={(e) => setNewDebtor({ ...newDebtor, totalOwed: e.target.value })}
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                <span>Or import multiple debtors from CSV</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDebtorDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleAddDebtor}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Debtor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Call Dialog */}
      <Dialog open={scheduleCallDialogOpen} onOpenChange={setScheduleCallDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-neon-blue" />
              Schedule AI Call
            </DialogTitle>
            <DialogDescription>
              Schedule an AI agent to call {selectedDebtor?.contactName || 'this debtor'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={scheduleCallForm.date}
                  onChange={(e) => setScheduleCallForm({ ...scheduleCallForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={scheduleCallForm.time}
                  onChange={(e) => setScheduleCallForm({ ...scheduleCallForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={scheduleCallForm.priority} onValueChange={(v) => setScheduleCallForm({ ...scheduleCallForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes for AI Agent</Label>
              <Textarea
                placeholder="Any special instructions for the call..."
                value={scheduleCallForm.notes}
                onChange={(e) => setScheduleCallForm({ ...scheduleCallForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleCallDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={handleScheduleCall}
            >
              <Phone className="w-4 h-4 mr-2" />
              Schedule Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-neon-blue" />
              Send Collection Email
            </DialogTitle>
            <DialogDescription>
              Send an email to {selectedDebtor?.email || 'this debtor'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Email Template</Label>
              <Select value={emailForm.template} onValueChange={(v) => setEmailForm({ ...emailForm, template: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">Payment Reminder</SelectItem>
                  <SelectItem value="overdue">Overdue Notice</SelectItem>
                  <SelectItem value="final">Final Notice</SelectItem>
                  <SelectItem value="custom">Custom Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                placeholder="Email subject..."
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Custom Message (optional)</Label>
              <Textarea
                placeholder="Add a personalized message..."
                value={emailForm.customMessage}
                onChange={(e) => setEmailForm({ ...emailForm, customMessage: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={handleSendEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <ConfirmDialog
        open={escalateDialogOpen}
        onOpenChange={setEscalateDialogOpen}
        title="Escalate Case"
        description="This case will be escalated to a supervisor for manual review. The debtor will be flagged as high-priority and may receive more aggressive collection attempts. Are you sure?"
        confirmText="Escalate"
        variant="warning"
        onConfirm={confirmEscalate}
      />

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentDialogOpen} onOpenChange={setRecordPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-neon-green" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment for {selectedDebtor?.name || 'this debtor'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  placeholder="Transaction ID"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>
            </div>
            {selectedDebtor && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-medium text-neon-green">{formatCurrency(selectedDebtor.totalOwed)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleRecordPayment}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
