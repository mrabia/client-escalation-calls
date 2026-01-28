/**
 * MOJAVOX Dashboard (Command Center)
 * Style: Cyberpunk Corporate
 * 
 * Real-time KPIs, fleet status, and recovery performance.
 * Enhanced with interactive charts and customizable widgets.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter, AnimatedProgress } from "@/components/ui/page-transition";
import { KPICardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton-loaders";
import { InteractiveBarChart, InteractiveLineChart, InteractiveDonutChart } from "@/components/ui/interactive-chart";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashboardCustomizationProvider,
  DashboardGrid,
  DraggableWidget,
  WidgetCard,
  useDashboardCustomization,
} from "@/components/CustomizableDashboard";
import {
  mockDashboardKPIs,
  mockFleetStatus,
  mockLiveCalls,
  mockRecoveryPerformance,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bot,
  DollarSign,
  Phone,
  Target,
  TrendingUp,
  PieChart,
  BarChart3,
  LineChart,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { subDays } from "date-fns";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  format = "number",
  accentColor = "green",
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  format?: "number" | "currency" | "percent" | "time";
  accentColor?: "green" | "blue" | "pink" | "yellow";
}) {
  const colorClasses = {
    green: "text-neon-green",
    blue: "text-neon-blue",
    pink: "text-neon-pink",
    yellow: "text-neon-yellow",
  };

  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "percent":
        return `${val}%`;
      case "time":
        return `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, "0")}`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <Card className="data-card hover:scale-[1.02] transition-transform duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-display font-bold mt-1", colorClasses[accentColor])}>
              <AnimatedCounter value={value} formatter={formatValue} />
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-neon-green" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    change >= 0 ? "text-neon-green" : "text-destructive"
                  )}
                >
                  {Math.abs(change)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "p-3 rounded-lg bg-gradient-to-br",
              accentColor === "green" && "from-neon-green/20 to-neon-green/5",
              accentColor === "blue" && "from-neon-blue/20 to-neon-blue/5",
              accentColor === "pink" && "from-neon-pink/20 to-neon-pink/5",
              accentColor === "yellow" && "from-neon-yellow/20 to-neon-yellow/5"
            )}
          >
            <Icon className={cn("w-6 h-6", colorClasses[accentColor])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FleetStatusCard() {
  const { online, busy, offline, total } = mockFleetStatus;
  const onlinePercent = (online / total) * 100;
  const busyPercent = (busy / total) * 100;

  return (
    <Card className="data-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="w-4 h-4 text-neon-cyan" />
          AI Fleet Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Bars */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="status-dot online" />
                Online
              </span>
              <span className="font-mono text-neon-green">{online}</span>
            </div>
            <AnimatedProgress value={onlinePercent} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="status-dot busy" />
                Busy
              </span>
              <span className="font-mono text-neon-yellow">{busy}</span>
            </div>
            <AnimatedProgress value={busyPercent} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="status-dot offline" />
                Offline
              </span>
              <span className="font-mono text-muted-foreground">{offline}</span>
            </div>
            <AnimatedProgress value={(offline / total) * 100} />
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Agents</span>
              <span className="text-2xl font-display font-bold">{total}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveCallsCard() {
  return (
    <Card className="data-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-neon-green pulse-live" />
          Live Calls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockLiveCalls.map((call, index) => (
            <div
              key={call.id}
              className="p-3 rounded-lg bg-background/50 border border-border hover:border-neon-green/30 transition-all cursor-pointer hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-neon-blue">{call.agentName}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{call.debtorName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{call.contactName}</span>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      call.sentiment > 0.5 ? "bg-neon-green" : "bg-neon-yellow"
                    )}
                  />
                  <span className="text-xs font-mono">
                    {(call.sentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}

          {mockLiveCalls.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active calls</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InteractiveRecoveryChart() {
  // Default to last 7 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const chartData = useMemo(() => 
    mockRecoveryPerformance.map(item => ({
      date: item.date,
      recovered: item.recovered,
    })), 
  []);

  // Calculate period label
  const periodLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return "";
    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return "7D";
    if (days <= 14) return "14D";
    if (days <= 30) return "30D";
    if (days <= 90) return "90D";
    return `${days}D`;
  }, [dateRange]);

  return (
    <Card className="data-card col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neon-green" />
          Recovery Performance {periodLabel && `(${periodLabel})`}
        </CardTitle>
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          presets="days"
          align="end"
        />
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="recoveredGradDashboard" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff9d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} 
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#111827", 
                  border: "1px solid #1e293b", 
                  borderRadius: "8px" 
                }}
                formatter={(value: number) => [`$${(value / 1000).toFixed(0)}K`, "Recovered"]}
              />
              <Area 
                type="monotone" 
                dataKey="recovered" 
                stroke="#00ff9d" 
                strokeWidth={2} 
                fill="url(#recoveredGradDashboard)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function InteractiveCallsChart() {
  const chartData = useMemo(() => 
    mockRecoveryPerformance.map(item => ({
      label: item.date,
      value: item.calls,
      color: '#00b8ff',
    })), 
  []);

  return (
    <Card className="data-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-neon-blue" />
          Daily Calls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InteractiveBarChart
          data={chartData}
          height={300}
          animated={true}
          showZoomControls={false}
          onBarClick={(point) => {
            console.log('Clicked:', point);
          }}
        />
      </CardContent>
    </Card>
  );
}

function FleetDistributionChart() {
  const { online, busy, offline } = mockFleetStatus;
  
  const chartData = useMemo(() => [
    { label: 'Online', value: online, color: '#00ff9d' },
    { label: 'Busy', value: busy, color: '#fbbf24' },
    { label: 'Offline', value: offline, color: '#64748b' },
  ], [online, busy, offline]);

  return (
    <Card className="data-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChart className="w-4 h-4 text-neon-cyan" />
          Fleet Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InteractiveDonutChart
          data={chartData}
          size={180}
          thickness={25}
          animated={true}
          showLegend={true}
        />
      </CardContent>
    </Card>
  );
}

// Default widgets configuration
const defaultWidgets = [
  {
    id: 'kpi-recovered',
    title: 'Total Recovered',
    component: (
      <KPICard
        title="Total Recovered"
        value={mockDashboardKPIs.totalRecovered}
        change={mockDashboardKPIs.totalRecoveredChange}
        icon={DollarSign}
        format="currency"
        accentColor="green"
      />
    ),
    size: 'small' as const,
  },
  {
    id: 'kpi-calls',
    title: 'Calls Today',
    component: (
      <KPICard
        title="Calls Today"
        value={mockDashboardKPIs.callsToday}
        change={mockDashboardKPIs.callsTodayChange}
        icon={Phone}
        accentColor="blue"
      />
    ),
    size: 'small' as const,
  },
  {
    id: 'kpi-success',
    title: 'Success Rate',
    component: (
      <KPICard
        title="Success Rate"
        value={mockDashboardKPIs.successRate}
        change={mockDashboardKPIs.successRateChange}
        icon={Target}
        format="percent"
        accentColor="green"
      />
    ),
    size: 'small' as const,
  },
  {
    id: 'kpi-duration',
    title: 'Avg Call Duration',
    component: (
      <KPICard
        title="Avg Call Duration"
        value={mockDashboardKPIs.avgCallDuration}
        icon={Activity}
        format="time"
        accentColor="yellow"
      />
    ),
    size: 'small' as const,
  },
  {
    id: 'chart-recovery',
    title: 'Recovery Performance',
    component: <InteractiveRecoveryChart />,
    size: 'large' as const,
  },
  {
    id: 'chart-calls',
    title: 'Daily Calls',
    component: <InteractiveCallsChart />,
    size: 'medium' as const,
  },
  {
    id: 'chart-fleet-dist',
    title: 'Fleet Distribution',
    component: <FleetDistributionChart />,
    size: 'medium' as const,
  },
  {
    id: 'fleet-status',
    title: 'Fleet Status',
    component: <FleetStatusCard />,
    size: 'medium' as const,
  },
  {
    id: 'live-calls',
    title: 'Live Calls',
    component: <LiveCallsCard />,
    size: 'medium' as const,
  },
];

function DashboardContent() {
  const { config } = useDashboardCustomization();
  
  // Sort widgets by order
  const sortedWidgets = useMemo(() => {
    return [...config.widgets].sort((a, b) => a.order - b.order);
  }, [config.widgets]);

  // Get widget component by id
  const getWidgetComponent = (id: string) => {
    const widget = defaultWidgets.find(w => w.id === id);
    return widget?.component || null;
  };

  return (
    <DashboardGrid>
      {sortedWidgets.map((widget, index) => (
        <DraggableWidget key={widget.id} widget={widget} index={index}>
          {getWidgetComponent(widget.id)}
        </DraggableWidget>
      ))}
    </DashboardGrid>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>

        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Chart Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-2">
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>

        {/* Status Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableSkeleton rows={4} />
          <TableSkeleton rows={3} />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Command Center</h1>
          <p className="text-muted-foreground">Real-time overview of your collection operations</p>
        </div>

        {/* Customizable Dashboard */}
        <DashboardCustomizationProvider defaultWidgets={defaultWidgets}>
          <DashboardContent />
        </DashboardCustomizationProvider>
      </div>
    </PageTransition>
  );
}
