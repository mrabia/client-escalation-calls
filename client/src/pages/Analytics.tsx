/**
 * MOJAVOX Deep Analytics
 * Style: Cyberpunk Corporate
 * 
 * Advanced analytics and performance insights.
 * Enhanced with loading states and animations.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/ui/page-transition";
import { KPICardSkeleton, ChartSkeleton } from "@/components/ui/skeleton-loaders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Phone,
  Target,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { subMonths } from "date-fns";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const monthlyData = [
  { month: "Jan", recovered: 420000, calls: 12400, success: 58 },
  { month: "Feb", recovered: 480000, calls: 13200, success: 61 },
  { month: "Mar", recovered: 520000, calls: 14100, success: 63 },
  { month: "Apr", recovered: 490000, calls: 13800, success: 60 },
  { month: "May", recovered: 580000, calls: 15200, success: 65 },
  { month: "Jun", recovered: 620000, calls: 16000, success: 68 },
];

const objectionData = [
  { name: "Financial Hardship", count: 342, percentage: 28 },
  { name: "Dispute Amount", count: 256, percentage: 21 },
  { name: "Need More Time", count: 195, percentage: 16 },
  { name: "Already Paid", count: 146, percentage: 12 },
  { name: "Wrong Person", count: 122, percentage: 10 },
  { name: "Other", count: 159, percentage: 13 },
];

const heatmapData = [
  { hour: "8AM", mon: 45, tue: 52, wed: 48, thu: 55, fri: 42 },
  { hour: "9AM", mon: 68, tue: 72, wed: 70, thu: 75, fri: 65 },
  { hour: "10AM", mon: 85, tue: 88, wed: 82, thu: 90, fri: 78 },
  { hour: "11AM", mon: 78, tue: 82, wed: 80, thu: 85, fri: 72 },
  { hour: "12PM", mon: 55, tue: 58, wed: 52, thu: 60, fri: 48 },
  { hour: "1PM", mon: 62, tue: 65, wed: 60, thu: 68, fri: 55 },
  { hour: "2PM", mon: 82, tue: 85, wed: 80, thu: 88, fri: 75 },
  { hour: "3PM", mon: 88, tue: 92, wed: 85, thu: 95, fri: 80 },
  { hour: "4PM", mon: 75, tue: 78, wed: 72, thu: 80, fri: 68 },
  { hour: "5PM", mon: 58, tue: 62, wed: 55, thu: 65, fri: 50 },
];

const agentPerformance = [
  { name: "NOVA-01", calls: 1245, success: 72, recovered: 185000 },
  { name: "ATLAS-02", calls: 1180, success: 68, recovered: 162000 },
  { name: "ECHO-03", calls: 1320, success: 65, recovered: 178000 },
  { name: "PULSE-04", calls: 1150, success: 70, recovered: 168000 },
];

const outcomeDistribution = [
  { name: "Payment Received", value: 35, color: "#00ff9d" },
  { name: "Payment Plan", value: 28, color: "#00b8ff" },
  { name: "Promise to Pay", value: 18, color: "#fbbf24" },
  { name: "No Contact", value: 12, color: "#64748b" },
  { name: "Refused", value: 7, color: "#ff006e" },
];

function StatCard({
  title,
  value,
  numericValue,
  change,
  icon: Icon,
  color = "green",
  format,
}: {
  title: string;
  value: string;
  numericValue?: number;
  change?: number;
  icon: React.ElementType;
  color?: "green" | "blue" | "yellow" | "pink";
  format?: "currency" | "number" | "percent" | "time";
}) {
  const colorClasses = {
    green: "text-neon-green bg-neon-green/10",
    blue: "text-neon-blue bg-neon-blue/10",
    yellow: "text-neon-yellow bg-neon-yellow/10",
    pink: "text-neon-pink bg-neon-pink/10",
  };

  const formatValue = (v: number) => {
    if (format === "currency") {
      if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
      return `$${v}`;
    }
    if (format === "percent") return `${v}%`;
    if (format === "time") return `${v}m`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  return (
    <Card className="data-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-display font-bold">
              {numericValue !== undefined ? (
                <AnimatedCounter value={numericValue} formatter={formatValue} duration={1500} />
              ) : (
                value
              )}
            </p>
          </div>
          {change !== undefined && (
            <div className={cn("text-sm font-mono", change >= 0 ? "text-neon-green" : "text-neon-pink")}>
              {change >= 0 ? "+" : ""}{change}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapCell({ value, delay = 0 }: { value: number; delay?: number }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getColor = (v: number) => {
    if (v >= 85) return "bg-neon-green";
    if (v >= 70) return "bg-neon-green/70";
    if (v >= 55) return "bg-neon-yellow/70";
    return "bg-muted";
  };

  return (
    <div
      className={cn(
        "w-full h-8 rounded flex items-center justify-center text-xs font-mono transition-all duration-500",
        animated ? getColor(value) : "bg-muted/30",
        animated ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      title={`${value}% success rate`}
    >
      {animated ? value : ""}
    </div>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  
  // Default to last 6 months for Performance tab
  const [performanceDateRange, setPerformanceDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  // Calculate period label for Performance tab
  const performancePeriodLabel = useMemo(() => {
    if (!performanceDateRange?.from || !performanceDateRange?.to) return "";
    const months = Math.ceil((performanceDateRange.to.getTime() - performanceDateRange.from.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months <= 1) return "1 Month";
    if (months <= 3) return "3 Months";
    if (months <= 6) return "6 Months";
    if (months <= 12) return "12 Months";
    return `${months} Months`;
  }, [performanceDateRange]);

  useEffect(() => {
    const loadTimer = setTimeout(() => setLoading(false), 1000);
    const chartTimer = setTimeout(() => setChartsReady(true), 1500);
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(chartTimer);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="h-10 w-96 bg-muted rounded animate-pulse" />

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-neon-blue" />
            Deep Analytics
          </h1>
          <p className="text-muted-foreground">
            Advanced insights and performance metrics
          </p>
        </div>

        {/* Stats Row */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem>
            <StatCard 
              title="Total Recovered (YTD)" 
              value="$3.11M" 
              numericValue={3110000}
              change={12} 
              icon={DollarSign} 
              color="green" 
              format="currency"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard 
              title="Total Calls (YTD)" 
              value="84.7K" 
              numericValue={84700}
              change={8} 
              icon={Phone} 
              color="blue" 
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard 
              title="Avg Success Rate" 
              value="62.5%" 
              numericValue={62.5}
              change={5} 
              icon={Target} 
              color="green" 
              format="percent"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard 
              title="Avg Call Duration" 
              value="4.2m" 
              numericValue={4.2}
              change={-3} 
              icon={Clock} 
              color="yellow" 
              format="time"
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Main Analytics */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="heatmap">Call Heatmap</TabsTrigger>
            <TabsTrigger value="objections">Objection Analysis</TabsTrigger>
            <TabsTrigger value="agents">Agent Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            {/* Date Range Picker for Performance Tab */}
            <div className="flex justify-end">
              <DateRangePicker
                dateRange={performanceDateRange}
                onDateRangeChange={setPerformanceDateRange}
                presets="months"
                align="end"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recovery Trend */}
              <Card className="data-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-neon-green" />
                    Recovery Trend {performancePeriodLabel && `(${performancePeriodLabel})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {!chartsReady ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Loading chart...</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                          <defs>
                            <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#00ff9d" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }}
                            formatter={(value: number) => [`$${(value / 1000).toFixed(0)}K`, "Recovered"]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="recovered" 
                            stroke="#00ff9d" 
                            strokeWidth={2} 
                            fill="url(#recoveredGrad)" 
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Outcome Distribution */}
              <Card className="data-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-neon-blue" />
                    Outcome Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center">
                    {!chartsReady ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Loading chart...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="50%" height="100%">
                          <PieChart>
                            <Pie
                              data={outcomeDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              animationDuration={1500}
                            >
                              {outcomeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {outcomeDistribution.map((item, index) => (
                            <div 
                              key={item.name} 
                              className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm flex-1">{item.name}</span>
                              <span className="text-sm font-mono">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="heatmap">
            <Card className="data-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neon-blue" />
                  Call Success Rate by Hour & Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-sm font-medium text-muted-foreground p-2">Hour</th>
                        <th className="text-center text-sm font-medium text-muted-foreground p-2">Mon</th>
                        <th className="text-center text-sm font-medium text-muted-foreground p-2">Tue</th>
                        <th className="text-center text-sm font-medium text-muted-foreground p-2">Wed</th>
                        <th className="text-center text-sm font-medium text-muted-foreground p-2">Thu</th>
                        <th className="text-center text-sm font-medium text-muted-foreground p-2">Fri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((row, rowIndex) => (
                        <tr key={row.hour}>
                          <td className="text-sm font-mono p-2">{row.hour}</td>
                          <td className="p-1"><HeatmapCell value={row.mon} delay={rowIndex * 50} /></td>
                          <td className="p-1"><HeatmapCell value={row.tue} delay={rowIndex * 50 + 50} /></td>
                          <td className="p-1"><HeatmapCell value={row.wed} delay={rowIndex * 50 + 100} /></td>
                          <td className="p-1"><HeatmapCell value={row.thu} delay={rowIndex * 50 + 150} /></td>
                          <td className="p-1"><HeatmapCell value={row.fri} delay={rowIndex * 50 + 200} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Success Rate:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <span className="text-muted-foreground">&lt;55%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-yellow/70" />
                    <span className="text-muted-foreground">55-70%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-green/70" />
                    <span className="text-muted-foreground">70-85%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neon-green" />
                    <span className="text-muted-foreground">&gt;85%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="objections">
            <Card className="data-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Objections Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {!chartsReady ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading chart...</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={objectionData} layout="vertical">
                        <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }}
                        />
                        <Bar dataKey="count" fill="#00b8ff" radius={[0, 4, 4, 0]} animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card className="data-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Agent Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {!chartsReady ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading chart...</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentPerformance}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }}
                        />
                        <Bar dataKey="calls" fill="#00b8ff" name="Calls" radius={[4, 4, 0, 0]} animationDuration={1500} />
                        <Bar dataKey="success" fill="#00ff9d" name="Success %" radius={[4, 4, 0, 0]} animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
