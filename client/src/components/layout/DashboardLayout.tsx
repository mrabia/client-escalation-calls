/**
 * MOJAVOX Dashboard Layout
 * Style: Cyberpunk Corporate
 * 
 * Persistent sidebar navigation with collapsible sections.
 * Header with real-time status indicators.
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileText,
  Flag,
  FlaskConical,
  Headphones,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquare,
  PieChart,
  Play,
  RefreshCw,
  Search,
  Settings,
  Star,
  Target,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationCenter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Activity, label: "Live Monitor", href: "/live-monitor" },
  { icon: Target, label: "Campaigns", href: "/campaigns" },
  { icon: Calendar, label: "Campaign Calendar", href: "/campaign-calendar" },
  { icon: ClipboardList, label: "Campaign Reports", href: "/campaign-report" },
  { icon: FlaskConical, label: "A/B Testing", href: "/ab-testing" },
  { icon: Bot, label: "AI Fleet", href: "/fleet" },
  { icon: Users, label: "Debtors", href: "/debtors" },
  { icon: Layers, label: "Debtor Segments", href: "/debtor-segments" },
  { icon: PieChart, label: "Analytics", href: "/analytics" },
  { icon: Search, label: "Script Analyzer", href: "/script-analyzer" },
  { icon: Headphones, label: "Recordings", href: "/call-playback" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Wallet, label: "Financial Report", href: "/financial-report" },
  { icon: Flag, label: "Task Planner", href: "/task-planner" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
];

const bottomNavItems = [
  { icon: User, label: "User Management", href: "/users" },
  { icon: CreditCard, label: "Payment Portal", href: "/payment" },
  { icon: BarChart3, label: "Payment Dashboard", href: "/payment-dashboard" },
  { icon: History, label: "Payment History", href: "/payment-history" },
  { icon: Wallet, label: "Saved Cards", href: "/saved-payment-methods" },
  { icon: RefreshCw, label: "Recurring Payments", href: "/recurring-payments" },
  { icon: MessageSquare, label: "Feedback", href: "/payment-feedback" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                <Bot className="w-5 h-5 text-background" />
              </div>
              <span className="font-display font-bold text-lg text-neon-green">
                MOJAVOX
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center mx-auto">
              <Bot className="w-5 h-5 text-background" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 h-10 px-3 transition-all duration-150",
                          isActive
                            ? "bg-sidebar-accent text-neon-green border-l-2 border-neon-green"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-neon-green")} />
                        {!collapsed && <span>{item.label}</span>}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="bg-popover border-border">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="my-4 mx-4 border-t border-sidebar-border" />

          {/* Bottom Navigation */}
          <nav className="px-2 space-y-1">
            {bottomNavItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 h-10 px-3 transition-all duration-150",
                          isActive
                            ? "bg-sidebar-accent text-neon-green border-l-2 border-neon-green"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-neon-green")} />
                        {!collapsed && <span>{item.label}</span>}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="bg-popover border-border">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
          {/* Left: Breadcrumb / Page Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="status-dot online pulse-live" />
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Live Calls Indicator */}
            <Link href="/live-monitor">
              <Button variant="ghost" size="sm" className="gap-2 text-neon-green">
                <Play className="w-4 h-4 fill-current" />
                <span className="font-mono">3 Live</span>
              </Button>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle variant="button" />

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right">
                <p className="text-sm font-medium">Sarah Mitchell</p>
                <p className="text-xs text-muted-foreground">Supervisor</p>
              </div>
              <Button variant="ghost" size="icon">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 grid-pattern min-h-[calc(100vh-4rem-3rem)]">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="h-12 border-t border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()}</span>
            <span className="text-neon-green font-medium">Mojatoon</span>
            <span>· All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/help">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 h-8">
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 h-8">
                <LifeBuoy className="w-4 h-4" />
                <span className="hidden sm:inline">Support</span>
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 h-8">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Docs</span>
              </Button>
            </Link>
            <a href="/landing" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 h-8">
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">MOJAVOX.ai</span>
              </Button>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
