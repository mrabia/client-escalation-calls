import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { TutorialProvider } from "./components/InteractiveTutorial";
import { TourProvider } from "./components/GuidedTour";
import { NotificationProvider } from "./components/NotificationCenter";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { OfflineIndicator } from "./components/OfflineIndicator";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import AgentWizard from "./pages/AgentWizard";
import ABTesting from "./pages/ABTesting";
import APIIntegration from "./pages/APIIntegration";
import Analytics from "./pages/Analytics";
import BrandingSettings from "./pages/BrandingSettings";
import CallPlayback from "./pages/CallPlayback";
import CampaignCalendar from "./pages/CampaignCalendar";
import CampaignReport from "./pages/CampaignReport";
import Campaigns from "./pages/Campaigns";
import CampaignWizard from "./pages/CampaignWizard";
import Dashboard from "./pages/Dashboard";
import DebtorDetail from "./pages/DebtorDetail";
import Debtors from "./pages/Debtors";
import DebtorSegments from "./pages/DebtorSegments";
import DataExport from "./pages/DataExport";
import Docs from "./pages/Docs";
import EmailNotifications from "./pages/EmailNotifications";
import EmailTemplates from "./pages/EmailTemplates";
import FinancialReport from "./pages/FinancialReport";
import Fleet from "./pages/Fleet";
import Help from "./pages/Help";
import Landing from "./pages/Landing";
import LiveMonitor from "./pages/LiveMonitor";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import Onboarding from "./pages/Onboarding";
import PaymentDashboard from "./pages/PaymentDashboard";
import PaymentFeedback from "./pages/PaymentFeedback";
import PaymentHistory from "./pages/PaymentHistory";
import PaymentPortal from "./pages/PaymentPortal";
import PaymentPortalPage from "./pages/PaymentPortalPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RecurringPayments from "./pages/RecurringPayments";
import SavedPaymentMethods from "./pages/SavedPaymentMethods";
import Reports from "./pages/Reports";
import ScriptAnalyzer from "./pages/ScriptAnalyzer";
import ScriptEditor from "./pages/ScriptEditor";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import TaskPlanner from "./pages/TaskPlanner";
import TermsOfService from "./pages/TermsOfService";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import UserManagement from "./pages/UserManagement";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/landing" component={Landing} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/payment-standalone" component={PaymentPortal} />

      {/* Dashboard Routes (with layout) */}
      <Route path="/dashboard">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/live-monitor">
        <DashboardLayout>
          <LiveMonitor />
        </DashboardLayout>
      </Route>
      <Route path="/campaigns">
        <DashboardLayout>
          <Campaigns />
        </DashboardLayout>
      </Route>
      <Route path="/fleet">
        <DashboardLayout>
          <Fleet />
        </DashboardLayout>
      </Route>
      <Route path="/debtors">
        <DashboardLayout>
          <Debtors />
        </DashboardLayout>
      </Route>
      <Route path="/debtors/:id">
        <DashboardLayout>
          <DebtorDetail />
        </DashboardLayout>
      </Route>
      <Route path="/ab-testing">
        <DashboardLayout>
          <ABTesting />
        </DashboardLayout>
      </Route>
      <Route path="/debtor-segments">
        <DashboardLayout>
          <DebtorSegments />
        </DashboardLayout>
      </Route>
      <Route path="/analytics">
        <DashboardLayout>
          <Analytics />
        </DashboardLayout>
      </Route>
      <Route path="/script-analyzer">
        <DashboardLayout>
          <ScriptAnalyzer />
        </DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      <Route path="/financial-report">
        <DashboardLayout>
          <FinancialReport />
        </DashboardLayout>
      </Route>
      <Route path="/task-planner">
        <DashboardLayout>
          <TaskPlanner />
        </DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout>
          <Notifications />
        </DashboardLayout>
      </Route>
      <Route path="/users">
        <DashboardLayout>
          <UserManagement />
        </DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      <Route path="/2fa">
        <DashboardLayout>
          <TwoFactorAuth />
        </DashboardLayout>
      </Route>
      <Route path="/branding">
        <DashboardLayout>
          <BrandingSettings />
        </DashboardLayout>
      </Route>
      <Route path="/api-integration">
        <DashboardLayout>
          <APIIntegration />
        </DashboardLayout>
      </Route>
      <Route path="/email-notifications">
        <DashboardLayout>
          <EmailNotifications />
        </DashboardLayout>
      </Route>
      <Route path="/email-templates">
        <DashboardLayout>
          <EmailTemplates />
        </DashboardLayout>
      </Route>
      <Route path="/script-editor">
        <DashboardLayout>
          <ScriptEditor />
        </DashboardLayout>
      </Route>
      <Route path="/data-export">
        <DashboardLayout>
          <DataExport />
        </DashboardLayout>
      </Route>
      <Route path="/call-playback">
        <DashboardLayout>
          <CallPlayback />
        </DashboardLayout>
      </Route>
      <Route path="/payment">
        <DashboardLayout>
          <PaymentPortalPage />
        </DashboardLayout>
      </Route>
      <Route path="/payment-history">
        <DashboardLayout>
          <PaymentHistory />
        </DashboardLayout>
      </Route>
      <Route path="/saved-payment-methods">
        <DashboardLayout>
          <SavedPaymentMethods />
        </DashboardLayout>
      </Route>
      <Route path="/recurring-payments">
        <DashboardLayout>
          <RecurringPayments />
        </DashboardLayout>
      </Route>
      <Route path="/payment-feedback">
        <DashboardLayout>
          <PaymentFeedback />
        </DashboardLayout>
      </Route>
      <Route path="/payment-dashboard">
        <DashboardLayout>
          <PaymentDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/campaign-calendar">
        <DashboardLayout>
          <CampaignCalendar />
        </DashboardLayout>
      </Route>
      <Route path="/campaign-report">
        <DashboardLayout>
          <CampaignReport />
        </DashboardLayout>
      </Route>
      <Route path="/help">
        <DashboardLayout>
          <Help />
        </DashboardLayout>
      </Route>
      <Route path="/support">
        <DashboardLayout>
          <Support />
        </DashboardLayout>
      </Route>
      <Route path="/docs">
        <DashboardLayout>
          <Docs />
        </DashboardLayout>
      </Route>

      {/* Full-page Routes (no layout) */}
      <Route path="/agent-wizard" component={AgentWizard} />
      <Route path="/campaign-wizard" component={CampaignWizard} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <TutorialProvider>
            <TourProvider>
              <NotificationProvider>
                <Toaster />
                <KeyboardShortcuts />
                <OfflineIndicator />
                <Router />
              </NotificationProvider>
            </TourProvider>
          </TutorialProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
