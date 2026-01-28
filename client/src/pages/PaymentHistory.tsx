/**
 * MOJAVOX Payment History Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - View all past payments
 * - Filter by date, status, method
 * - Download PDF receipts
 * - View payment details
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Home,
  Printer,
  RefreshCw,
  Search,
  Smartphone,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

// Payment status types
type PaymentStatus = "completed" | "pending" | "failed" | "refunded";

// Payment method icons
const methodIcons: Record<string, React.ElementType> = {
  card: CreditCard,
  paypal: Wallet,
  applepay: Smartphone,
  bank: Building2,
};

// Mock payment history data
const mockPayments = [
  {
    id: "TXN-2026-0127-4521",
    date: "2026-01-27T14:30:00Z",
    amount: 2400.0,
    method: "card",
    methodDetails: "Visa ending in 4521",
    status: "completed" as PaymentStatus,
    accountNumber: "****4521",
    description: "Full Balance Payment",
    billingAddress: {
      name: "John Smith",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
  },
  {
    id: "TXN-2026-0115-4521",
    date: "2026-01-15T10:15:00Z",
    amount: 150.0,
    method: "card",
    methodDetails: "Mastercard ending in 8832",
    status: "completed" as PaymentStatus,
    accountNumber: "****4521",
    description: "Payment Plan - Month 3",
    billingAddress: {
      name: "John Smith",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
  },
  {
    id: "TXN-2026-0101-4521",
    date: "2026-01-01T09:00:00Z",
    amount: 150.0,
    method: "paypal",
    methodDetails: "PayPal - john.smith@email.com",
    status: "completed" as PaymentStatus,
    accountNumber: "****4521",
    description: "Payment Plan - Month 2",
    billingAddress: {
      name: "John Smith",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
  },
  {
    id: "TXN-2025-1215-4521",
    date: "2025-12-15T16:45:00Z",
    amount: 150.0,
    method: "bank",
    methodDetails: "ACH Transfer - ****7890",
    status: "completed" as PaymentStatus,
    accountNumber: "****4521",
    description: "Payment Plan - Month 1",
    billingAddress: {
      name: "John Smith",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
  },
  {
    id: "TXN-2025-1201-4521",
    date: "2025-12-01T11:30:00Z",
    amount: 500.0,
    method: "card",
    methodDetails: "Visa ending in 4521",
    status: "failed" as PaymentStatus,
    accountNumber: "****4521",
    description: "Custom Payment",
    failureReason: "Card declined - insufficient funds",
    billingAddress: {
      name: "John Smith",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
  },
  {
    id: "TXN-2025-1120-4521",
    date: "2025-11-20T08:00:00Z",
    amount: 75.0,
    method: "applepay",
    methodDetails: "Apple Pay",
    status: "refunded" as PaymentStatus,
    accountNumber: "****4521",
    description: "Partial Payment",
    refundDate: "2025-11-22T10:00:00Z",
    refundReason: "Duplicate payment",
    billingAddress: {
      name: "John Smith",
      street: "123 Main Street",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
  },
];

type Payment = typeof mockPayments[0];

// Status badge component
function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = {
    completed: {
      icon: CheckCircle,
      label: "Completed",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    pending: {
      icon: Clock,
      label: "Pending",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
    refunded: {
      icon: RefreshCw,
      label: "Refunded",
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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

// Generate PDF receipt (client-side)
function generateReceiptPDF(payment: Payment): void {
  // Create a printable HTML content
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - ${payment.id}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a2e; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #10b981; }
        .logo { font-size: 28px; font-weight: bold; color: #10b981; margin-bottom: 5px; }
        .subtitle { color: #64748b; font-size: 14px; }
        .receipt-title { font-size: 24px; margin: 30px 0 20px; color: #1a1a2e; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .value { font-weight: 500; color: #1a1a2e; }
        .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 30px 0; }
        .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-completed { background: #d1fae5; color: #059669; }
        .status-failed { background: #fee2e2; color: #dc2626; }
        .status-refunded { background: #dbeafe; color: #2563eb; }
        .status-pending { background: #fef3c7; color: #d97706; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
        .address-block { background: #f8fafc; padding: 15px; border-radius: 8px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">MOJAVOX</div>
        <div class="subtitle">AI Collection Platform</div>
      </div>
      
      <h1 class="receipt-title">Payment Receipt</h1>
      
      <div class="amount">$${payment.amount.toFixed(2)}</div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <span class="status status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
      </div>
      
      <div class="section">
        <div class="section-title">Transaction Details</div>
        <div class="row">
          <span class="label">Confirmation Number</span>
          <span class="value">${payment.id}</span>
        </div>
        <div class="row">
          <span class="label">Date & Time</span>
          <span class="value">${new Date(payment.date).toLocaleString()}</span>
        </div>
        <div class="row">
          <span class="label">Description</span>
          <span class="value">${payment.description}</span>
        </div>
        <div class="row">
          <span class="label">Account Number</span>
          <span class="value">${payment.accountNumber}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Payment Method</div>
        <div class="row">
          <span class="label">Method</span>
          <span class="value">${payment.methodDetails}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Billing Address</div>
        <div class="address-block">
          <strong>${payment.billingAddress.name}</strong><br>
          ${payment.billingAddress.street}<br>
          ${payment.billingAddress.city}, ${payment.billingAddress.state} ${payment.billingAddress.zip}<br>
          ${payment.billingAddress.country}
        </div>
      </div>
      
      ${payment.status === "failed" ? `
        <div class="section">
          <div class="section-title">Failure Information</div>
          <div class="row">
            <span class="label">Reason</span>
            <span class="value" style="color: #dc2626;">${payment.failureReason || "Unknown error"}</span>
          </div>
        </div>
      ` : ""}
      
      ${payment.status === "refunded" ? `
        <div class="section">
          <div class="section-title">Refund Information</div>
          <div class="row">
            <span class="label">Refund Date</span>
            <span class="value">${payment.refundDate ? new Date(payment.refundDate).toLocaleString() : "N/A"}</span>
          </div>
          <div class="row">
            <span class="label">Reason</span>
            <span class="value">${payment.refundReason || "N/A"}</span>
          </div>
        </div>
      ` : ""}
      
      <div class="footer">
        <p>Thank you for your payment.</p>
        <p style="margin-top: 10px;">For questions, contact support@acmecollections.com or call 1-800-555-0123</p>
        <p style="margin-top: 20px; font-size: 10px;">This receipt was generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing/saving as PDF
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export default function PaymentHistory() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  // Load payments
  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPayments(mockPayments);
      setFilteredPayments(mockPayments);
      setLoading(false);
    };
    loadPayments();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...payments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.id.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.methodDetails.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(p => p.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== "all") {
      result = result.filter(p => p.method === methodFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case "7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      result = result.filter(p => new Date(p.date) >= startDate);
    }

    setFilteredPayments(result);
  }, [payments, searchQuery, statusFilter, methodFilter, dateRange]);

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setDetailsOpen(true);
  };

  const handleDownloadReceipt = (payment: Payment) => {
    generateReceiptPDF(payment);
    toast.success("Receipt opened", {
      description: "Use your browser's print dialog to save as PDF.",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateRange("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || methodFilter !== "all" || dateRange !== "all";

  // Calculate totals
  const totalPaid = filteredPayments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Payment History</h1>
            <p className="text-muted-foreground mt-1">View and download receipts for all your payments</p>
          </div>
          <Button
            onClick={() => setLocation("/payment")}
            className="bg-neon-green hover:bg-neon-green/90 text-background"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Make a Payment
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold text-foreground font-mono">${totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-blue/20">
                  <FileText className="w-5 h-5 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-xl font-bold text-foreground">{filteredPayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-green/20">
                  <Calendar className="w-5 h-5 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Payment</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredPayments.length > 0 
                      ? new Date(filteredPayments[0].date).toLocaleDateString()
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40 bg-background border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {/* Method Filter */}
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full lg:w-40 bg-background border-border">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="applepay">Apple Pay</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filter */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full lg:w-40 bg-background border-border">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-border"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-neon-blue" />
              Transactions
              {hasActiveFilters && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredPayments.length} results)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50">
                      <div className="w-10 h-10 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </div>
                      <div className="h-6 bg-muted rounded w-20" />
                      <div className="h-8 bg-muted rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No payments found</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to see more results."
                    : "You haven't made any payments yet."
                  }
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-4 border-border"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <StaggerContainer className="space-y-3">
                {filteredPayments.map((payment, index) => {
                  const MethodIcon = methodIcons[payment.method] || CreditCard;
                  
                  return (
                    <StaggerItem key={payment.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        {/* Method Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          payment.status === "completed" && "bg-emerald-500/20",
                          payment.status === "pending" && "bg-amber-500/20",
                          payment.status === "failed" && "bg-red-500/20",
                          payment.status === "refunded" && "bg-blue-500/20"
                        )}>
                          <MethodIcon className={cn(
                            "w-5 h-5",
                            payment.status === "completed" && "text-emerald-400",
                            payment.status === "pending" && "text-amber-400",
                            payment.status === "failed" && "text-red-400",
                            payment.status === "refunded" && "text-blue-400"
                          )} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">{payment.description}</p>
                            <StatusBadge status={payment.status} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {payment.id} • {new Date(payment.date).toLocaleDateString()} at {new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {payment.methodDetails}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className={cn(
                            "text-lg font-bold font-mono",
                            payment.status === "completed" && "text-emerald-400",
                            payment.status === "pending" && "text-amber-400",
                            payment.status === "failed" && "text-red-400 line-through",
                            payment.status === "refunded" && "text-blue-400"
                          )}>
                            ${payment.amount.toFixed(2)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(payment)}
                            className="border-border"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline ml-2">View</span>
                          </Button>
                          {payment.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadReceipt(payment)}
                              className="border-border"
                            >
                              <Download className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">Receipt</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display">Payment Details</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Transaction {selectedPayment?.id}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPayment && (
              <div className="space-y-6">
                {/* Amount & Status */}
                <div className="text-center py-4">
                  <p className={cn(
                    "text-3xl font-bold font-mono",
                    selectedPayment.status === "completed" && "text-emerald-400",
                    selectedPayment.status === "pending" && "text-amber-400",
                    selectedPayment.status === "failed" && "text-red-400",
                    selectedPayment.status === "refunded" && "text-blue-400"
                  )}>
                    ${selectedPayment.amount.toFixed(2)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={selectedPayment.status} />
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Transaction Details */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="text-foreground">{new Date(selectedPayment.date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-foreground">{selectedPayment.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span className="text-foreground font-mono">{selectedPayment.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="text-foreground">{selectedPayment.methodDetails}</span>
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Billing Address</p>
                  <div className="p-3 rounded-lg bg-background/50 text-sm text-foreground">
                    <p className="font-medium">{selectedPayment.billingAddress.name}</p>
                    <p>{selectedPayment.billingAddress.street}</p>
                    <p>{selectedPayment.billingAddress.city}, {selectedPayment.billingAddress.state} {selectedPayment.billingAddress.zip}</p>
                    <p>{selectedPayment.billingAddress.country}</p>
                  </div>
                </div>

                {/* Failure/Refund Info */}
                {selectedPayment.status === "failed" && selectedPayment.failureReason && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm font-medium text-red-400 mb-1">Failure Reason</p>
                    <p className="text-sm text-red-300">{selectedPayment.failureReason}</p>
                  </div>
                )}

                {selectedPayment.status === "refunded" && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-sm font-medium text-blue-400 mb-1">Refund Information</p>
                    <p className="text-sm text-blue-300">
                      Refunded on {selectedPayment.refundDate ? new Date(selectedPayment.refundDate).toLocaleDateString() : "N/A"}
                    </p>
                    {selectedPayment.refundReason && (
                      <p className="text-sm text-blue-300 mt-1">Reason: {selectedPayment.refundReason}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedPayment.status === "completed" && (
                    <>
                      <Button
                        className="flex-1 bg-neon-green hover:bg-neon-green/90 text-background"
                        onClick={() => {
                          handleDownloadReceipt(selectedPayment);
                          setDetailsOpen(false);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Receipt
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border"
                        onClick={() => {
                          generateReceiptPDF(selectedPayment);
                        }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {selectedPayment.status !== "completed" && (
                    <Button
                      variant="outline"
                      className="flex-1 border-border"
                      onClick={() => setDetailsOpen(false)}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
