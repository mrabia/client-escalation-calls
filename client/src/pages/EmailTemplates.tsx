/**
 * MOJAVOX Email Templates Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Customizable email templates
 * - Preview mode
 * - Variable placeholders
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Check,
  Code,
  Copy,
  Edit,
  Eye,
  FileText,
  Mail,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "payment" | "reminder" | "notification" | "campaign";
  variables: string[];
  lastModified: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Payment Confirmation",
    subject: "Payment Received - {{amount}}",
    body: "Dear {{debtor_name}},\n\nWe have received your payment of {{amount}} on {{date}}.\n\nYour remaining balance is {{remaining_balance}}.\n\nThank you for your payment.\n\nBest regards,\n{{company_name}}",
    category: "payment",
    variables: ["debtor_name", "amount", "date", "remaining_balance", "company_name"],
    lastModified: "2026-01-25",
  },
  {
    id: "2",
    name: "Payment Reminder",
    subject: "Payment Reminder - Account {{account_number}}",
    body: "Dear {{debtor_name}},\n\nThis is a friendly reminder that your payment of {{amount}} is due on {{due_date}}.\n\nPlease make your payment to avoid any late fees.\n\nPayment Link: {{payment_link}}\n\nBest regards,\n{{company_name}}",
    category: "reminder",
    variables: ["debtor_name", "amount", "due_date", "account_number", "payment_link", "company_name"],
    lastModified: "2026-01-24",
  },
  {
    id: "3",
    name: "Campaign Launch",
    subject: "New Collection Campaign Started",
    body: "Hello {{supervisor_name}},\n\nA new collection campaign has been launched:\n\nCampaign: {{campaign_name}}\nTarget: {{target_amount}}\nDebtors: {{debtor_count}}\nAgents: {{agent_count}}\n\nYou can monitor progress in the dashboard.\n\nBest regards,\nMOJAVOX System",
    category: "campaign",
    variables: ["supervisor_name", "campaign_name", "target_amount", "debtor_count", "agent_count"],
    lastModified: "2026-01-23",
  },
  {
    id: "4",
    name: "Escalation Alert",
    subject: "Call Escalation Required - {{debtor_name}}",
    body: "Attention {{supervisor_name}},\n\nA call has been escalated and requires your attention:\n\nDebtor: {{debtor_name}}\nAgent: {{agent_id}}\nReason: {{escalation_reason}}\nTime: {{timestamp}}\n\nPlease review the call in the Live Monitor.\n\nMOJAVOX System",
    category: "notification",
    variables: ["supervisor_name", "debtor_name", "agent_id", "escalation_reason", "timestamp"],
    lastModified: "2026-01-22",
  },
];

export default function EmailTemplates() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    body: "",
    category: "notification" as "payment" | "reminder" | "notification" | "campaign",
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "payment": return "bg-neon-green/20 text-neon-green";
      case "reminder": return "bg-yellow-500/20 text-yellow-400";
      case "notification": return "bg-neon-blue/20 text-neon-blue";
      case "campaign": return "bg-neon-pink/20 text-neon-pink";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({ ...template });
    setEditMode(true);
  };

  const handleSave = () => {
    if (editedTemplate) {
      setTemplates(templates.map(t => t.id === editedTemplate.id ? { ...editedTemplate, lastModified: new Date().toISOString().split('T')[0] } : t));
      toast.success("Template saved");
      setEditMode(false);
      setSelectedTemplate(null);
      setEditedTemplate(null);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast.success(`Copied {{${variable}}} to clipboard`);
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  const handleDelete = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      toast.success("Template deleted", {
        description: `"${templateToDelete.name}" has been removed.`
      });
      setTemplateToDelete(null);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.body.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Extract variables from the body
    const variableRegex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(newTemplate.body)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    // Also extract from subject
    while ((match = variableRegex.exec(newTemplate.subject)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    const template: EmailTemplate = {
      id: `template_${Date.now()}`,
      name: newTemplate.name,
      subject: newTemplate.subject,
      body: newTemplate.body,
      category: newTemplate.category,
      variables: variables.length > 0 ? variables : ["debtor_name", "company_name"],
      lastModified: new Date().toISOString().split("T")[0],
    };
    
    setTemplates([template, ...templates]);
    setCreateDialogOpen(false);
    setNewTemplate({ name: "", subject: "", body: "", category: "notification" });
    toast.success("Template created", { description: `"${template.name}" is ready to use` });
  };

  const getPreviewContent = (template: EmailTemplate) => {
    let content = template.body;
    const sampleData: Record<string, string> = {
      debtor_name: "John Smith",
      amount: "$2,400.00",
      date: "January 27, 2026",
      remaining_balance: "$0.00",
      company_name: "MOJAVOX Collections",
      due_date: "February 1, 2026",
      account_number: "****4521",
      payment_link: "https://pay.mojavox.ai/abc123",
      supervisor_name: "Sarah Mitchell",
      campaign_name: "Q1 2026 Recovery",
      target_amount: "$5,000,000",
      debtor_count: "1,250",
      agent_count: "4",
      agent_id: "NOVA-01",
      escalation_reason: "Customer requested supervisor",
      timestamp: "2026-01-27 14:30:00",
    };
    
    template.variables.forEach(v => {
      content = content.replace(new RegExp(`{{${v}}}`, 'g'), sampleData[v] || `[${v}]`);
    });
    
    return content;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center">
                  <Mail className="w-6 h-6 text-background" />
                </div>
                Email Templates
              </h1>
              <p className="text-muted-foreground mt-1">Customize email templates for notifications</p>
            </div>
          </div>
          <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        <StaggerContainer className="grid md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <StaggerItem key={template.id}>
              <Card className="bg-card border-border hover:border-neon-green/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.subject}</CardDescription>
                    </div>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3 font-mono bg-muted/50 p-2 rounded">
                      {template.body.substring(0, 150)}...
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 4).map((v) => (
                        <Badge key={v} variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => handleCopyVariable(v)}>
                          <Code className="w-3 h-3 mr-1" />
                          {v}
                        </Badge>
                      ))}
                      {template.variables.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 4} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        Modified: {template.lastModified}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(template)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Edit Dialog */}
        <Dialog open={editMode} onOpenChange={setEditMode}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>Modify the email template content</DialogDescription>
            </DialogHeader>
            {editedTemplate && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={editedTemplate.name}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={editedTemplate.subject}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={editedTemplate.body}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, body: e.target.value })}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-1">
                    {editedTemplate.variables.map((v) => (
                      <Badge key={v} variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => handleCopyVariable(v)}>
                        <Copy className="w-3 h-3 mr-1" />
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Template Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-neon-green" />
                Create New Template
              </DialogTitle>
              <DialogDescription>
                Create a new email template for notifications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Payment Confirmation"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newTemplate.category} onValueChange={(v: "payment" | "reminder" | "notification" | "campaign") => setNewTemplate({ ...newTemplate, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject Line *</Label>
                <Input
                  placeholder="e.g., Payment Received - {{amount}}"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Body *</Label>
                <Textarea
                  placeholder="Enter your email content. Use {{variable_name}} for dynamic values..."
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Common variables: {"{{debtor_name}}, {{amount}}, {{due_date}}, {{company_name}}, {{payment_link}}"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleCreateTemplate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewMode} onOpenChange={setPreviewMode}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>Preview with sample data</DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Subject:</p>
                  <p className="font-medium">{selectedTemplate.subject.replace(/{{(\w+)}}/g, (_, v) => {
                    const samples: Record<string, string> = { amount: "$2,400.00", account_number: "****4521", debtor_name: "John Smith" };
                    return samples[v] || `[${v}]`;
                  })}</p>
                </div>
                <div className="p-4 bg-white text-black rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {getPreviewContent(selectedTemplate)}
                  </pre>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewMode(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Template Confirmation */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Template?"
          description={templateToDelete ? `Are you sure you want to delete "${templateToDelete.name}"? This action cannot be undone.` : ""}
          confirmText="Delete Template"
          variant="danger"
          onConfirm={confirmDeleteTemplate}
        />
      </div>
    </PageTransition>
  );
}
