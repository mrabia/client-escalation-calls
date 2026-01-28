/**
 * MOJAVOX Campaign Calendar Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Calendar view of all campaigns
 * - Active and planned campaigns visualization
 * - Quick campaign details on hover
 * - Month/Week navigation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Plus,
  Target,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock campaign data
const campaigns = [
  {
    id: "camp_1",
    name: "Q1 2026 - High Value Recovery",
    startDate: "2026-01-14",
    endDate: "2026-03-30",
    status: "active",
    target: 5000000,
    recovered: 2450000,
    debtors: 1250,
    color: "bg-neon-green",
  },
  {
    id: "camp_2",
    name: "Payment Reminder - 30 Days",
    startDate: "2025-12-31",
    endDate: "2026-12-30",
    status: "active",
    target: 1500000,
    recovered: 898000,
    debtors: 3500,
    color: "bg-neon-blue",
  },
  {
    id: "camp_3",
    name: "Legacy Accounts - Final Notice",
    startDate: "2025-10-31",
    endDate: "2026-02-27",
    status: "paused",
    target: 800000,
    recovered: 125000,
    debtors: 450,
    color: "bg-amber-500",
  },
  {
    id: "camp_4",
    name: "Spring Collection Drive",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    status: "scheduled",
    target: 3000000,
    recovered: 0,
    debtors: 2000,
    color: "bg-purple-500",
  },
  {
    id: "camp_5",
    name: "Medical Debt Recovery",
    startDate: "2026-02-15",
    endDate: "2026-04-15",
    status: "scheduled",
    target: 1200000,
    recovered: 0,
    debtors: 800,
    color: "bg-pink-500",
  },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CampaignCalendar() {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 27)); // Jan 27, 2026
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2026, 0, 27));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getCampaignsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return campaigns.filter(camp => {
      return dateStr >= camp.startDate && dateStr <= camp.endDate;
    });
  };

  const isToday = (day: number) => {
    return day === 27 && currentDate.getMonth() === 0 && currentDate.getFullYear() === 2026;
  };

  const getWeekDays = () => {
    const today = new Date(currentDate);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    const weekDays: { date: Date; day: number; month: number; year: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push({
        date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    return weekDays;
  };

  const getCampaignsForWeekDay = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return campaigns.filter(camp => dateStr >= camp.startDate && dateStr <= camp.endDate);
  };

  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const weekDays = getWeekDays();

  const days = getDaysInMonth(currentDate);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="h-96 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-background" />
                </div>
                Campaign Calendar
              </h1>
              <p className="text-muted-foreground mt-1">View and manage all campaign schedules</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Link href="/campaign-wizard">
                <Button className="bg-neon-green text-background hover:bg-neon-green/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StaggerItem>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-neon-green" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Campaigns</p>
                    <p className="text-xl font-bold text-foreground">
                      {campaigns.filter(c => c.status === "active").length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-neon-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                    <p className="text-xl font-bold text-foreground">
                      {campaigns.filter(c => c.status === "scheduled").length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Debtors</p>
                    <p className="text-xl font-bold text-foreground">
                      {campaigns.reduce((sum, c) => sum + c.debtors, 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Target</p>
                    <p className="text-xl font-bold text-foreground">
                      ${(campaigns.reduce((sum, c) => sum + c.target, 0) / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>

          {/* Calendar */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-foreground text-xl">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={view === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("month")}
                  className={view === "month" ? "bg-neon-green text-background" : ""}
                >
                  Month
                </Button>
                <Button
                  variant={view === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("week")}
                  className={view === "week" ? "bg-neon-blue text-white" : ""}
                >
                  Week
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {view === "month" ? (
                <>
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {daysOfWeek.map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  const dayCampaigns = day ? getCampaignsForDay(day) : [];
                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-24 p-1 rounded-lg border transition-colors",
                        day ? "border-border hover:border-muted-foreground cursor-pointer" : "border-transparent",
                        isToday(day || 0) && "border-neon-green bg-neon-green/5"
                      )}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            isToday(day) ? "text-neon-green" : "text-foreground"
                          )}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayCampaigns.slice(0, 3).map(camp => (
                              <Tooltip key={camp.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "text-xs px-1 py-0.5 rounded truncate cursor-pointer transition-opacity",
                                      camp.color,
                                      "text-white",
                                      camp.status === "paused" && "opacity-50"
                                    )}
                                    onClick={() => setSelectedCampaign(camp.id)}
                                  >
                                    {camp.name.slice(0, 15)}...
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-2">
                                    <p className="font-semibold">{camp.name}</p>
                                    <div className="text-xs space-y-1">
                                      <p>Status: <Badge variant={camp.status === "active" ? "default" : "secondary"} className="ml-1">{camp.status}</Badge></p>
                                      <p>Target: ${(camp.target / 1000000).toFixed(2)}M</p>
                                      <p>Recovered: ${(camp.recovered / 1000000).toFixed(2)}M ({Math.round(camp.recovered / camp.target * 100)}%)</p>
                                      <p>Debtors: {camp.debtors.toLocaleString()}</p>
                                      <p>{camp.startDate} → {camp.endDate}</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {dayCampaigns.length > 3 && (
                              <div className="text-xs text-muted-foreground px-1">
                                +{dayCampaigns.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                  </div>
                </>
              ) : (
                /* Week View */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <Button variant="outline" size="sm" onClick={goToPrevWeek}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Week of {weekDays[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Button variant="outline" size="sm" onClick={goToNextWeek}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((weekDay, index) => {
                      const dayCampaigns = getCampaignsForWeekDay(weekDay.date);
                      const isTodayWeek = weekDay.day === 27 && weekDay.month === 0 && weekDay.year === 2026;
                      return (
                        <div
                          key={index}
                          className={cn(
                            "min-h-48 p-2 rounded-lg border",
                            isTodayWeek ? "border-neon-green bg-neon-green/5" : "border-border"
                          )}
                        >
                          <div className="text-center mb-2">
                            <div className="text-xs text-muted-foreground">{daysOfWeek[index]}</div>
                            <div className={cn(
                              "text-lg font-bold",
                              isTodayWeek ? "text-neon-green" : "text-foreground"
                            )}>
                              {weekDay.day}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {dayCampaigns.map(camp => (
                              <Tooltip key={camp.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "text-xs px-2 py-1 rounded cursor-pointer",
                                      camp.color,
                                      "text-white",
                                      camp.status === "paused" && "opacity-50"
                                    )}
                                    onClick={() => setSelectedCampaign(camp.id)}
                                  >
                                    <div className="font-medium truncate">{camp.name}</div>
                                    <div className="opacity-80">${(camp.recovered / 1000).toFixed(0)}K / ${(camp.target / 1000).toFixed(0)}K</div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-2">
                                    <p className="font-semibold">{camp.name}</p>
                                    <div className="text-xs space-y-1">
                                      <p>Status: <Badge variant={camp.status === "active" ? "default" : "secondary"} className="ml-1">{camp.status}</Badge></p>
                                      <p>Target: ${(camp.target / 1000000).toFixed(2)}M</p>
                                      <p>Recovered: ${(camp.recovered / 1000000).toFixed(2)}M ({Math.round(camp.recovered / camp.target * 100)}%)</p>
                                      <p>Debtors: {camp.debtors.toLocaleString()}</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Campaign Legend */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Campaign Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {campaigns.map(camp => (
                  <div key={camp.id} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded", camp.color, camp.status === "paused" && "opacity-50")} />
                    <span className="text-sm text-muted-foreground">{camp.name}</span>
                    <Badge variant={camp.status === "active" ? "default" : camp.status === "paused" ? "secondary" : "outline"} className="text-xs">
                      {camp.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </PageTransition>
  );
}
