/**
 * MOJAVOX Financial Report Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Monthly financial overview
 * - Recovery metrics
 * - Cost analysis
 * - ROI calculations
 * - Export to PDF
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  FileText,
  PieChart,
  Printer,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/ui/page-transition";

interface MonthlyData {
  month: string;
  recovered: number;
  target: number;
  costs: number;
  roi: number;
}

const mockMonthlyData: MonthlyData[] = [
  { month: "January 2026", recovered: 245000, target: 300000, costs: 45000, roi: 444 },
  { month: "December 2025", recovered: 312000, target: 280000, costs: 42000, roi: 643 },
  { month: "November 2025", recovered: 198000, target: 250000, costs: 38000, roi: 421 },
  { month: "October 2025", recovered: 276000, target: 260000, costs: 40000, roi: 590 },
];

const expenseBreakdown = [
  { category: "AI Agent Costs", amount: 18500, percentage: 41 },
  { category: "Platform Fees", amount: 12000, percentage: 27 },
  { category: "SMS/Call Charges", amount: 8500, percentage: 19 },
  { category: "Support Staff", amount: 4000, percentage: 9 },
  { category: "Other", amount: 2000, percentage: 4 },
];

const campaignPerformance = [
  { name: "Q1 2026 - High Value", recovered: 125000, cost: 15000, roi: 733, status: "active" },
  { name: "Payment Reminder - 30 Days", recovered: 78000, cost: 12000, roi: 550, status: "active" },
  { name: "Legacy Accounts", recovered: 42000, cost: 18000, roi: 133, status: "paused" },
];

export default function FinancialReport() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("January 2026");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const currentData = mockMonthlyData.find(d => d.month === selectedMonth) || mockMonthlyData[0];
  const previousData = mockMonthlyData[1];
  
  const recoveryChange = ((currentData.recovered - previousData.recovered) / previousData.recovered * 100).toFixed(1);
  const costChange = ((currentData.costs - previousData.costs) / previousData.costs * 100).toFixed(1);
  const roiChange = ((currentData.roi - previousData.roi) / previousData.roi * 100).toFixed(1);

  const handleExportPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>MOJAVOX Financial Report - ${selectedMonth}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
            h1 { color: #00ff88; border-bottom: 2px solid #00ff88; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            .metric { display: inline-block; width: 200px; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #00ff88; }
            .metric-label { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f5f5f5; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>MOJAVOX Financial Report</h1>
          <p><strong>Period:</strong> ${selectedMonth}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h2>Key Metrics</h2>
          <div class="metric">
            <div class="metric-value">$${currentData.recovered.toLocaleString()}</div>
            <div class="metric-label">Total Recovered</div>
          </div>
          <div class="metric">
            <div class="metric-value">$${currentData.costs.toLocaleString()}</div>
            <div class="metric-label">Total Costs</div>
          </div>
          <div class="metric">
            <div class="metric-value">${currentData.roi}%</div>
            <div class="metric-label">ROI</div>
          </div>
          
          <h2>Expense Breakdown</h2>
          <table>
            <tr><th>Category</th><th>Amount</th><th>Percentage</th></tr>
            ${expenseBreakdown.map(e => `<tr><td>${e.category}</td><td>$${e.amount.toLocaleString()}</td><td>${e.percentage}%</td></tr>`).join('')}
          </table>
          
          <h2>Campaign Performance</h2>
          <table>
            <tr><th>Campaign</th><th>Recovered</th><th>Cost</th><th>ROI</th></tr>
            ${campaignPerformance.map(c => `<tr><td>${c.name}</td><td>$${c.recovered.toLocaleString()}</td><td>$${c.cost.toLocaleString()}</td><td>${c.roi}%</td></tr>`).join('')}
          </table>
          
          <div class="footer">
            <p>© 2026 Mojatoon. All rights reserved.</p>
            <p>This report is confidential and intended for internal use only.</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("Report exported");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
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
                <Wallet className="w-6 h-6 text-background" />
              </div>
              Financial Report
            </h1>
            <p className="text-muted-foreground mt-1">Monthly financial overview and analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {mockMonthlyData.map(d => (
                  <SelectItem key={d.month} value={d.month}>{d.month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast.success("Report refreshed")}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-neon-green" />
                  </div>
                  <div className={cn("flex items-center gap-1 text-sm", parseFloat(recoveryChange) >= 0 ? "text-neon-green" : "text-red-400")}>
                    {parseFloat(recoveryChange) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(parseFloat(recoveryChange))}%
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Total Recovered</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  $<AnimatedCounter value={currentData.recovered} />
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-400" />
                  </div>
                  <Badge className={currentData.recovered >= currentData.target ? "bg-neon-green/20 text-neon-green" : "bg-amber-500/20 text-amber-400"}>
                    {((currentData.recovered / currentData.target) * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  $<AnimatedCounter value={currentData.target} />
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-red-400" />
                  </div>
                  <div className={cn("flex items-center gap-1 text-sm", parseFloat(costChange) <= 0 ? "text-neon-green" : "text-red-400")}>
                    {parseFloat(costChange) <= 0 ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    {Math.abs(parseFloat(costChange))}%
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Total Costs</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  $<AnimatedCounter value={currentData.costs} />
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className={cn("flex items-center gap-1 text-sm", parseFloat(roiChange) >= 0 ? "text-neon-green" : "text-red-400")}>
                    {parseFloat(roiChange) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(parseFloat(roiChange))}%
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  <AnimatedCounter value={currentData.roi} />%
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Expense Breakdown */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5 text-neon-green" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseBreakdown.map((expense, index) => (
                  <div key={expense.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{expense.category}</span>
                      <span className="text-muted-foreground">${expense.amount.toLocaleString()} ({expense.percentage}%)</span>
                    </div>
                    <Progress 
                      value={expense.percentage} 
                      className={cn(
                        "h-2",
                        index === 0 && "[&>div]:bg-neon-green",
                        index === 1 && "[&>div]:bg-neon-blue",
                        index === 2 && "[&>div]:bg-purple-400",
                        index === 3 && "[&>div]:bg-amber-400",
                        index === 4 && "[&>div]:bg-slate-400"
                      )}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Total Expenses</span>
                  <span className="font-bold text-foreground">${currentData.costs.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Performance */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-neon-green" />
                Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignPerformance.map((campaign) => (
                  <div key={campaign.name} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{campaign.name}</span>
                      <Badge className={campaign.status === "active" ? "bg-neon-green/20 text-neon-green" : "bg-amber-500/20 text-amber-400"}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Recovered</p>
                        <p className="font-semibold text-neon-green">${campaign.recovered.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost</p>
                        <p className="font-semibold text-foreground">${campaign.cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ROI</p>
                        <p className={cn("font-semibold", campaign.roi >= 300 ? "text-neon-green" : campaign.roi >= 100 ? "text-amber-400" : "text-red-400")}>
                          {campaign.roi}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neon-green" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {mockMonthlyData.map((data, index) => (
                <div 
                  key={data.month} 
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    data.month === selectedMonth 
                      ? "bg-neon-green/10 border-neon-green/30" 
                      : "bg-muted/50 border-transparent hover:border-border"
                  )}
                >
                  <p className="text-sm text-muted-foreground mb-2">{data.month}</p>
                  <p className="text-xl font-display font-bold text-foreground">${(data.recovered / 1000).toFixed(0)}K</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress value={(data.recovered / data.target) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{((data.recovered / data.target) * 100).toFixed(0)}%</span>
                  </div>
                  <p className={cn("text-sm mt-2", data.roi >= 400 ? "text-neon-green" : "text-amber-400")}>
                    ROI: {data.roi}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
