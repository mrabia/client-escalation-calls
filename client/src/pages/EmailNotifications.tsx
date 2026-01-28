/**
 * MOJAVOX Email Notifications Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Email notification settings
 * - Template management
 * - Delivery schedule
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  Clock,
  Edit,
  Mail,
  MailCheck,
  MailWarning,
  Plus,
  Send,
  Settings,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: "payment_reminder" | "payment_confirmation" | "campaign_update" | "system_alert";
  isActive: boolean;
}

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  frequency: "instant" | "daily" | "weekly";
}

export default function EmailNotifications() {
  const [loading, setLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      id: "1",
      name: "Payment Reminder",
      subject: "Payment Reminder - Account {{account_number}}",
      body: "Dear {{debtor_name}},\n\nThis is a friendly reminder that your payment of {{amount}} is due on {{due_date}}.\n\nPlease make your payment at your earliest convenience.\n\nBest regards,\nMOJAVOX Collections",
      type: "payment_reminder",
      isActive: true,
    },
    {
      id: "2",
      name: "Payment Confirmation",
      subject: "Payment Received - Thank You!",
      body: "Dear {{debtor_name}},\n\nWe have received your payment of {{amount}} on {{payment_date}}.\n\nYour remaining balance is {{remaining_balance}}.\n\nThank you for your payment!\n\nBest regards,\nMOJAVOX Collections",
      type: "payment_confirmation",
      isActive: true,
    },
    {
      id: "3",
      name: "Campaign Update",
      subject: "Campaign {{campaign_name}} - Weekly Report",
      body: "Campaign Performance Summary:\n\n- Total Calls: {{total_calls}}\n- Successful Contacts: {{successful_contacts}}\n- Recovery Rate: {{recovery_rate}}%\n- Amount Recovered: {{amount_recovered}}",
      type: "campaign_update",
      isActive: true,
    },
    {
      id: "4",
      name: "System Alert",
      subject: "[ALERT] {{alert_type}} - Action Required",
      body: "System Alert:\n\n{{alert_message}}\n\nPlease review and take appropriate action.\n\nTimestamp: {{timestamp}}",
      type: "system_alert",
      isActive: false,
    },
  ]);

  const [settings, setSettings] = useState<NotificationSetting[]>([
    { id: "1", name: "Payment Reminders", description: "Send reminders before payment due dates", enabled: true, frequency: "daily" },
    { id: "2", name: "Payment Confirmations", description: "Send confirmation when payment is received", enabled: true, frequency: "instant" },
    { id: "3", name: "Campaign Reports", description: "Weekly campaign performance summaries", enabled: true, frequency: "weekly" },
    { id: "4", name: "Agent Alerts", description: "Alerts when AI agents need attention", enabled: true, frequency: "instant" },
    { id: "5", name: "System Updates", description: "Platform updates and maintenance notices", enabled: false, frequency: "weekly" },
    { id: "6", name: "Escalation Notices", description: "Notifications when calls are escalated", enabled: true, frequency: "instant" },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleSetting = (id: string) => {
    setSettings(settings.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    toast.success("Setting updated");
  };

  const handleToggleTemplate = (id: string) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
    toast.success("Template status updated");
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      if (templates.find(t => t.id === editingTemplate.id)) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
        toast.success("Template updated");
      } else {
        setTemplates([...templates, { ...editingTemplate, id: Date.now().toString() }]);
        toast.success("Template created");
      }
    }
    setShowTemplateDialog(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success("Template deleted");
  };

  const handleSendTest = () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }
    toast.success("Test email sent", { description: `Sent to ${testEmail}` });
    setShowTestDialog(false);
    setTestEmail("");
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "payment_reminder": return "bg-amber-500/10 text-amber-400";
      case "payment_confirmation": return "bg-neon-green/10 text-neon-green";
      case "campaign_update": return "bg-neon-blue/10 text-neon-blue";
      case "system_alert": return "bg-red-500/10 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-24 bg-muted animate-pulse rounded" />
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
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-pink flex items-center justify-center">
                  <Mail className="w-6 h-6 text-background" />
                </div>
                Email Notifications
              </h1>
              <p className="text-muted-foreground mt-1">Configure email templates and notification settings</p>
            </div>
          </div>
          <Button
            className="bg-neon-green text-background hover:bg-neon-green/90"
            onClick={() => {
              setEditingTemplate({
                id: "",
                name: "",
                subject: "",
                body: "",
                type: "payment_reminder",
                isActive: true,
              });
              setShowTemplateDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">Notification Settings</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
            <TabsTrigger value="schedule">Delivery Schedule</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <StaggerContainer className="space-y-4">
              {settings.map((setting) => (
                <StaggerItem key={setting.id}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${setting.enabled ? "bg-neon-green/10" : "bg-muted"}`}>
                            {setting.enabled ? (
                              <MailCheck className="w-5 h-5 text-neon-green" />
                            ) : (
                              <MailWarning className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{setting.name}</p>
                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="capitalize">
                            <Clock className="w-3 h-3 mr-1" />
                            {setting.frequency}
                          </Badge>
                          <Switch
                            checked={setting.enabled}
                            onCheckedChange={() => handleToggleSetting(setting.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <StaggerContainer className="grid gap-4">
              {templates.map((template) => (
                <StaggerItem key={template.id}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.isActive ? "bg-neon-blue/10" : "bg-muted"}`}>
                            <Mail className={`w-5 h-5 ${template.isActive ? "text-neon-blue" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{template.name}</p>
                              <Badge className={getTypeColor(template.type)}>
                                {template.type.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{template.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTemplate(template);
                              setShowTemplateDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTemplate(template);
                              setShowTestDialog(true);
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => handleToggleTemplate(template.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neon-blue" />
                  Delivery Schedule
                </CardTitle>
                <CardDescription>Configure when emails are sent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label>Daily Digest Time</Label>
                    <Select defaultValue="09:00">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <Label>Weekly Report Day</Label>
                    <Select defaultValue="monday">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Timezone</Label>
                  <Select defaultValue="america_new_york">
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
                      <SelectItem value="america_los_angeles">America/Los_Angeles (PST)</SelectItem>
                      <SelectItem value="america_chicago">America/Chicago (CST)</SelectItem>
                      <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={() => toast.success("Schedule saved")}>
                  <Check className="w-4 h-4 mr-2" />
                  Save Schedule
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle>
              <DialogDescription>Configure your email template</DialogDescription>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="e.g., Payment Reminder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editingTemplate.type}
                      onValueChange={(value: EmailTemplate["type"]) => setEditingTemplate({ ...editingTemplate, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                        <SelectItem value="payment_confirmation">Payment Confirmation</SelectItem>
                        <SelectItem value="campaign_update">Campaign Update</SelectItem>
                        <SelectItem value="system_alert">System Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    placeholder="e.g., Payment Reminder - Account {{account_number}}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    rows={8}
                    placeholder="Use {{variable}} for dynamic content"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{{debtor_name}}"}, {"{{account_number}}"}, {"{{amount}}"}, {"{{due_date}}"}, {"{{payment_date}}"}, {"{{remaining_balance}}"}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
              <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={handleSaveTemplate}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test Email Dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>Send a test email using the "{editingTemplate?.name}" template</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
              <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={handleSendTest}>
                <Send className="w-4 h-4 mr-2" />
                Send Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
