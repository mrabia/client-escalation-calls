/**
 * MOJAVOX Data Export Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Export data to CSV
 * - Multiple data types
 * - Date range selection
 * - Export history
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

interface ExportConfig {
  dataType: string;
  format: "csv" | "xlsx" | "json";
  dateRange: string;
  fields: string[];
}

interface ExportHistory {
  id: string;
  dataType: string;
  format: string;
  recordCount: number;
  fileSize: string;
  createdAt: string;
  status: "completed" | "processing" | "failed";
}

const dataTypes = [
  { id: "debtors", name: "Debtors", description: "All debtor records and contact information", icon: Database, fields: ["name", "email", "phone", "balance", "status", "last_contact", "payment_history"] },
  { id: "campaigns", name: "Campaigns", description: "Campaign performance and metrics", icon: FileText, fields: ["name", "status", "start_date", "end_date", "target_amount", "recovered_amount", "success_rate"] },
  { id: "payments", name: "Payments", description: "Payment transactions and history", icon: FileSpreadsheet, fields: ["date", "amount", "method", "debtor", "status", "reference"] },
  { id: "calls", name: "Call Logs", description: "AI agent call records and transcripts", icon: History, fields: ["date", "duration", "agent", "debtor", "outcome", "sentiment", "transcript"] },
  { id: "agents", name: "Agent Performance", description: "AI agent metrics and statistics", icon: Database, fields: ["agent_id", "calls_made", "success_rate", "avg_duration", "recovered_amount"] },
];

export default function DataExport() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("debtors");
  const [format, setFormat] = useState<"csv" | "xlsx" | "json">("csv");
  const [dateRange, setDateRange] = useState("last_30_days");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([
    { id: "1", dataType: "Debtors", format: "CSV", recordCount: 5200, fileSize: "2.4 MB", createdAt: "2026-01-27 14:30", status: "completed" },
    { id: "2", dataType: "Payments", format: "XLSX", recordCount: 12450, fileSize: "4.8 MB", createdAt: "2026-01-26 09:15", status: "completed" },
    { id: "3", dataType: "Call Logs", format: "CSV", recordCount: 8900, fileSize: "15.2 MB", createdAt: "2026-01-25 16:45", status: "completed" },
    { id: "4", dataType: "Campaigns", format: "JSON", recordCount: 24, fileSize: "156 KB", createdAt: "2026-01-24 11:00", status: "completed" },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const type = dataTypes.find(t => t.id === selectedType);
    if (type) {
      setSelectedFields(type.fields);
    }
  }, [selectedType]);

  const handleFieldToggle = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to export");
      return;
    }

    setExporting(true);
    
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const type = dataTypes.find(t => t.id === selectedType);
    const newExport: ExportHistory = {
      id: Date.now().toString(),
      dataType: type?.name || selectedType,
      format: format.toUpperCase(),
      recordCount: Math.floor(Math.random() * 10000) + 1000,
      fileSize: `${(Math.random() * 10 + 0.5).toFixed(1)} MB`,
      createdAt: new Date().toLocaleString(),
      status: "completed",
    };
    
    setExportHistory([newExport, ...exportHistory]);
    setExporting(false);
    
    // Trigger download
    const content = `Sample ${format.toUpperCase()} export data for ${type?.name}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mojavox_${selectedType}_export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Export completed", {
      description: `${newExport.recordCount.toLocaleString()} records exported`,
    });
  };

  const currentType = dataTypes.find(t => t.id === selectedType);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-2 gap-6">
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
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                <Download className="w-6 h-6 text-background" />
              </div>
              Data Export
            </h1>
            <p className="text-muted-foreground mt-1">Export your data in various formats</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Export Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Data Type Selection */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Select Data Type</CardTitle>
                <CardDescription>Choose the type of data you want to export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dataTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedType === type.id
                          ? "border-neon-green bg-neon-green/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <type.icon className={`w-6 h-6 mb-2 ${selectedType === type.id ? "text-neon-green" : "text-muted-foreground"}`} />
                      <p className="font-medium text-foreground">{type.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Field Selection */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Select Fields</CardTitle>
                <CardDescription>Choose which fields to include in the export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {currentType?.fields.map((field) => (
                    <label
                      key={field}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-muted-foreground cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedFields.includes(field)}
                        onCheckedChange={() => handleFieldToggle(field)}
                      />
                      <span className="text-sm capitalize">{field.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedFields(currentType?.fields || [])}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedFields([])}>
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>File Format</Label>
                    <Select value={format} onValueChange={(v: "csv" | "xlsx" | "json") => setFormat(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                        <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                        <SelectItem value="this_year">This Year</SelectItem>
                        <SelectItem value="all_time">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full mt-6 bg-neon-green text-background hover:bg-neon-green/90"
                  onClick={handleExport}
                  disabled={exporting || selectedFields.length === 0}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export {currentType?.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export History */}
          <div>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-neon-blue" />
                  Export History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StaggerContainer className="space-y-3">
                  {exportHistory.map((exp) => (
                    <StaggerItem key={exp.id}>
                      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{exp.dataType}</p>
                          <Badge variant="outline" className="text-xs">
                            {exp.format}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{exp.recordCount.toLocaleString()} records</span>
                          <span>{exp.fileSize}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {exp.createdAt}
                          </span>
                          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => toast.info("Re-downloading export...")}>
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
