/**
 * MOJAVOX Reports Page
 * Style: Cyberpunk Corporate
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Download, 
  FileText, 
  Filter, 
  Loader2, 
  Plus,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Phone,
  DollarSign,
  CheckCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface Report {
  id: number;
  name: string;
  type: string;
  date: string;
  status: "Ready" | "Generating" | "Failed";
}

const initialReports: Report[] = [
  { id: 1, name: "Monthly Recovery Summary", type: "Financial", date: "2026-01-15", status: "Ready" },
  { id: 2, name: "Agent Performance Q4", type: "Performance", date: "2026-01-10", status: "Ready" },
  { id: 3, name: "Campaign ROI Analysis", type: "Financial", date: "2026-01-08", status: "Ready" },
  { id: 4, name: "Compliance Audit Report", type: "Compliance", date: "2026-01-05", status: "Ready" },
  { id: 5, name: "Weekly Call Analytics", type: "Analytics", date: "2026-01-20", status: "Generating" },
];

const reportTypes = [
  { id: "financial", name: "Financial Report", icon: DollarSign, description: "Revenue, payments, and recovery metrics" },
  { id: "performance", name: "Performance Report", icon: TrendingUp, description: "Agent and campaign performance" },
  { id: "analytics", name: "Analytics Report", icon: BarChart3, description: "Call analytics and trends" },
  { id: "compliance", name: "Compliance Report", icon: CheckCircle, description: "Regulatory compliance audit" },
  { id: "custom", name: "Custom Report", icon: PieChart, description: "Build your own report" },
];

const reportMetrics = [
  { id: "total_recovered", name: "Total Recovered", category: "Financial" },
  { id: "recovery_rate", name: "Recovery Rate", category: "Financial" },
  { id: "avg_payment", name: "Average Payment", category: "Financial" },
  { id: "total_calls", name: "Total Calls", category: "Calls" },
  { id: "call_duration", name: "Avg Call Duration", category: "Calls" },
  { id: "success_rate", name: "Call Success Rate", category: "Calls" },
  { id: "agent_performance", name: "Agent Performance", category: "Performance" },
  { id: "campaign_roi", name: "Campaign ROI", category: "Performance" },
  { id: "debtor_segments", name: "Debtor Segments", category: "Analytics" },
  { id: "payment_trends", name: "Payment Trends", category: "Analytics" },
];

export default function Reports() {
  const [reports, setReports] = useState<Report[]>(initialReports);
  
  // Dialog states
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  // Report builder state
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [reportName, setReportName] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [reportFormat, setReportFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filter state
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  // Filtered reports
  const filteredReports = reports.filter(report => {
    if (filterType !== "all" && report.type !== filterType) return false;
    if (filterStatus !== "all" && report.status !== filterStatus) return false;
    if (dateRange?.from && dateRange?.to) {
      const reportDate = new Date(report.date);
      if (reportDate < dateRange.from || reportDate > dateRange.to) return false;
    }
    return true;
  });

  const handleGenerateReport = async () => {
    if (!reportName || !selectedReportType) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newReport: Report = {
      id: Math.max(...reports.map(r => r.id)) + 1,
      name: reportName,
      type: reportTypes.find(t => t.id === selectedReportType)?.name.replace(" Report", "") || "Custom",
      date: new Date().toISOString().split("T")[0],
      status: "Ready",
    };
    
    setReports([newReport, ...reports]);
    setIsGenerating(false);
    setReportBuilderOpen(false);
    setReportName("");
    setSelectedReportType("");
    setSelectedMetrics([]);
    
    toast.success("Report generated", {
      description: `${newReport.name} is ready for download.`,
    });
  };

  const handleDownload = (report: Report) => {
    toast.success("Downloading report", {
      description: `${report.name}.pdf`,
    });
  };

  const handleApplyFilters = () => {
    setFilterOpen(false);
    toast.success("Filters applied", {
      description: `Showing ${filteredReports.length} reports`,
    });
  };

  const handleClearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setDateRange({
      from: subMonths(new Date(), 1),
      to: new Date(),
    });
    toast.info("Filters cleared");
  };

  const toggleMetric = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metricId));
    } else {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };

  const activeFiltersCount = (filterType !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-neon-blue" />
            Reports
          </h1>
          <p className="text-muted-foreground">Generate and download reports</p>
        </div>
        <Button 
          className="bg-neon-green text-background hover:bg-neon-green/90" 
          onClick={() => setReportBuilderOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="flex gap-2">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-neon-green text-background h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                    <SelectItem value="Analytics">Analytics</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Ready">Ready</SelectItem>
                    <SelectItem value="Generating">Generating</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleApplyFilters}
              >
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {dateRange?.from && dateRange?.to 
                ? `${format(dateRange.from, "dd MMM", { locale: fr })} - ${format(dateRange.to, "dd MMM", { locale: fr })}`
                : "Date Range"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  7 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  30 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({ from: subMonths(new Date(), 3), to: new Date() })}
                >
                  3 months
                </Button>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={fr}
              />
              <Button 
                className="w-full bg-neon-green text-background hover:bg-neon-green/90"
                onClick={() => setDateRangeOpen(false)}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="data-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-neon-blue" />
                </div>
                <div>
                  <h3 className="font-medium">{report.name}</h3>
                  <p className="text-sm text-muted-foreground">{report.type} • {report.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${
                  report.status === "Ready" ? "text-neon-green" : 
                  report.status === "Generating" ? "text-neon-yellow" : "text-red-400"
                }`}>
                  {report.status === "Generating" && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                  {report.status}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={report.status !== "Ready"} 
                  onClick={() => handleDownload(report)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredReports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reports found matching your filters.</p>
            <Button variant="link" onClick={handleClearFilters}>Clear filters</Button>
          </div>
        )}
      </div>

      {/* Report Builder Dialog */}
      <Dialog open={reportBuilderOpen} onOpenChange={setReportBuilderOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-neon-green" />
              Report Builder
            </DialogTitle>
            <DialogDescription>
              Create a custom report by selecting the type and metrics you need.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Report Name */}
            <div className="space-y-2">
              <Label>Report Name *</Label>
              <Input 
                placeholder="e.g., Q1 2026 Recovery Analysis"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            {/* Report Type Selection */}
            <div className="space-y-2">
              <Label>Report Type *</Label>
              <div className="grid grid-cols-2 gap-3">
                {reportTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedReportType === type.id 
                        ? "border-neon-green bg-neon-green/10" 
                        : "border-border hover:border-neon-green/50"
                    }`}
                    onClick={() => setSelectedReportType(type.id)}
                  >
                    <div className="flex items-center gap-3">
                      <type.icon className={`w-5 h-5 ${selectedReportType === type.id ? "text-neon-green" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics Selection (for custom reports) */}
            {selectedReportType === "custom" && (
              <div className="space-y-2">
                <Label>Select Metrics</Label>
                <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-muted/50 max-h-48 overflow-y-auto">
                  {reportMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={metric.id}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetric(metric.id)}
                      />
                      <label 
                        htmlFor={metric.id} 
                        className="text-sm cursor-pointer"
                      >
                        {metric.name}
                        <span className="text-xs text-muted-foreground ml-1">({metric.category})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Report Period</Label>
              <div className="flex gap-2">
                <Button 
                  variant={dateRange?.from && dateRange.to && 
                    Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) === 7 
                    ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant={dateRange?.from && dateRange.to && 
                    Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) === 30 
                    ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  Last 30 Days
                </Button>
                <Button 
                  variant={dateRange?.from && dateRange.to && 
                    Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) >= 89 
                    ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateRange({ from: subMonths(new Date(), 3), to: new Date() })}
                >
                  Last Quarter
                </Button>
              </div>
            </div>

            {/* Format Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportBuilderOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleGenerateReport}
              disabled={isGenerating || !reportName || !selectedReportType}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
