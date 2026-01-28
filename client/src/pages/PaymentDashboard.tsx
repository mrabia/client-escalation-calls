/**
 * MOJAVOX Payment Dashboard Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Visual charts for payment trends
 * - Spending analytics
 * - Payment forecasts
 * - Quick stats overview
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/ui/page-transition";

// Mock data for charts
const monthlyPayments = [
  { month: "Aug", amount: 1200, count: 3 },
  { month: "Sep", amount: 1850, count: 4 },
  { month: "Oct", amount: 2100, count: 5 },
  { month: "Nov", amount: 1750, count: 4 },
  { month: "Dec", amount: 2400, count: 6 },
  { month: "Jan", amount: 1950, count: 5 },
];

const paymentMethods = [
  { method: "Credit Card", amount: 8500, percentage: 65, color: "bg-blue-500" },
  { method: "PayPal", amount: 2600, percentage: 20, color: "bg-[#0070ba]" },
  { method: "Bank Transfer", amount: 1300, percentage: 10, color: "bg-emerald-500" },
  { method: "Apple Pay", amount: 650, percentage: 5, color: "bg-slate-600" },
];

const recentTransactions = [
  { id: "TXN-001", date: "2026-01-27", amount: 450, status: "completed", method: "Visa •••• 4521" },
  { id: "TXN-002", date: "2026-01-25", amount: 150, status: "completed", method: "PayPal" },
  { id: "TXN-003", date: "2026-01-22", amount: 800, status: "completed", method: "Mastercard •••• 8832" },
  { id: "TXN-004", date: "2026-01-20", amount: 200, status: "pending", method: "Bank Transfer" },
  { id: "TXN-005", date: "2026-01-18", amount: 350, status: "completed", method: "Visa •••• 4521" },
];

export default function PaymentDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("6m");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleExport = () => {
    toast.success("Exporting report", { description: "Generating PDF report..." });
  };

  const totalPayments = monthlyPayments.reduce((sum, m) => sum + m.amount, 0);
  const avgPayment = Math.round(totalPayments / monthlyPayments.length);
  const maxPayment = Math.max(...monthlyPayments.map(m => m.amount));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                <PieChart className="w-6 h-6 text-background" />
              </div>
              Payment Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Track your payment history and spending trends</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-background border-border">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="bg-card border-border hover:border-neon-green/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">
                      $<AnimatedCounter value={totalPayments} />
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-neon-green text-sm">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-neon-green" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="bg-card border-border hover:border-neon-blue/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Payment</p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">
                      $<AnimatedCounter value={avgPayment} />
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-neon-blue text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>+5% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-neon-blue/10 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-neon-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="bg-card border-border hover:border-purple-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">
                      <AnimatedCounter value={27} />
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-purple-400 text-sm">
                      <ArrowUp className="w-4 h-4" />
                      <span>+3 this month</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">
                      $<AnimatedCounter value={2400} />
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-amber-400 text-sm">
                      <TrendingDown className="w-4 h-4" />
                      <span>-8% vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Monthly Payments Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-neon-green" />
                Payment Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {monthlyPayments.map((data, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative">
                      <div
                        className="w-full bg-gradient-to-t from-neon-green to-neon-green/50 rounded-t transition-all duration-500 hover:from-neon-green hover:to-neon-blue"
                        style={{ height: `${(data.amount / maxPayment) * 180}px` }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                        ${(data.amount / 1000).toFixed(1)}k
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5 text-neon-blue" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{method.method}</span>
                      <span className="text-muted-foreground">${method.amount.toLocaleString()} ({method.percentage}%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", method.color)}
                        style={{ width: `${method.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-foreground font-semibold">
                    ${paymentMethods.reduce((sum, m) => sum + m.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Recent Transactions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/payment-history"}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      txn.status === "completed" ? "bg-neon-green/10" : "bg-amber-500/10"
                    )}>
                      {txn.status === "completed" ? (
                        <ArrowDown className="w-5 h-5 text-neon-green" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{txn.method}</p>
                      <p className="text-xs text-muted-foreground">{txn.date} • {txn.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">-${txn.amount.toLocaleString()}</p>
                    <p className={cn(
                      "text-xs",
                      txn.status === "completed" ? "text-neon-green" : "text-amber-400"
                    )}>
                      {txn.status === "completed" ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Forecast Card */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-neon-green" />
                  Payment Forecast
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on your payment history and recurring schedules
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next 30 days</p>
                <p className="text-2xl font-display font-bold text-foreground">$2,850</p>
                <p className="text-xs text-amber-400">3 scheduled payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
