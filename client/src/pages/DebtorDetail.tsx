/**
 * MOJAVOX Debtor Detail Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Complete debtor profile
 * - Contact history timeline
 * - Payment history
 * - Notes and comments
 * - Risk score
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  Save,
  Send,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

interface ContactEvent {
  id: string;
  type: "call" | "sms" | "email" | "payment" | "note";
  date: string;
  time: string;
  agent?: string;
  outcome?: string;
  duration?: string;
  amount?: number;
  content?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: "completed" | "pending" | "failed";
}

interface Note {
  id: string;
  date: string;
  author: string;
  content: string;
}

const mockDebtor = {
  id: "DBT-2024-001",
  name: "John Smith",
  email: "john.smith@email.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street, New York, NY 10001",
  accountNumber: "****4521",
  originalBalance: 2400,
  currentBalance: 1850,
  paymentsMade: 550,
  status: "active",
  riskScore: 72,
  riskTrend: "improving",
  lastContact: "2026-01-25",
  nextScheduled: "2026-01-28",
  assignedAgent: "NOVA-01",
  campaign: "Q1 2026 - High Value Recovery",
  createdAt: "2025-11-15",
};

const mockHistory: ContactEvent[] = [
  { id: "1", type: "call", date: "2026-01-25", time: "14:32", agent: "NOVA-01", outcome: "Promise to Pay", duration: "4:23" },
  { id: "2", type: "payment", date: "2026-01-20", time: "10:15", amount: 250, content: "Partial payment received" },
  { id: "3", type: "sms", date: "2026-01-18", time: "09:00", agent: "NOVA-01", outcome: "Delivered", content: "Payment reminder sent" },
  { id: "4", type: "call", date: "2026-01-15", time: "11:45", agent: "NOVA-01", outcome: "Voicemail", duration: "0:32" },
  { id: "5", type: "email", date: "2026-01-10", time: "08:00", outcome: "Opened", content: "Initial contact email" },
  { id: "6", type: "payment", date: "2026-01-05", time: "16:30", amount: 300, content: "First payment received" },
  { id: "7", type: "note", date: "2026-01-03", time: "09:15", content: "Customer requested payment plan options" },
];

const mockPayments: Payment[] = [
  { id: "1", date: "2026-01-20", amount: 250, method: "Credit Card", status: "completed" },
  { id: "2", date: "2026-01-05", amount: 300, method: "Bank Transfer", status: "completed" },
];

const mockNotes: Note[] = [
  { id: "1", date: "2026-01-25", author: "Sarah Mitchell", content: "Customer agreed to payment plan of $150/month starting February. Very cooperative." },
  { id: "2", date: "2026-01-15", author: "NOVA-01", content: "Left voicemail. Customer did not answer. Will retry in 3 days." },
  { id: "3", date: "2026-01-03", author: "System", content: "Account assigned to Q1 2026 - High Value Recovery campaign." },
];

export default function DebtorDetail() {
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState(mockNotes);
  const params = useParams();
  
  // Dialog states
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isCallingInProgress, setIsCallingInProgress] = useState(false);
  
  // Form states
  const [smsMessage, setSmsMessage] = useState("");
  const [smsTemplate, setSmsTemplate] = useState("");
  const [editForm, setEditForm] = useState({
    name: mockDebtor.name,
    email: mockDebtor.email,
    phone: mockDebtor.phone,
    address: mockDebtor.address,
    status: mockDebtor.status,
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: `note_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      author: "Sarah Mitchell",
      content: newNote,
    };
    
    setNotes([note, ...notes]);
    setNewNote("");
    toast.success("Note added");
  };

  const handleInitiateCall = async () => {
    setIsCallingInProgress(true);
    // Simulate call initiation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsCallingInProgress(false);
    setCallDialogOpen(false);
    toast.success("Call initiated", {
      description: `Connecting to ${mockDebtor.phone}...`,
    });
  };

  const handleSendSMS = () => {
    if (!smsMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSmsDialogOpen(false);
    setSmsMessage("");
    setSmsTemplate("");
    toast.success("SMS sent", {
      description: `Message sent to ${mockDebtor.phone}`,
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.name || !editForm.email || !editForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setEditDialogOpen(false);
    toast.success("Profile updated", {
      description: "Debtor information has been saved.",
    });
  };

  const smsTemplates = [
    { id: "reminder", name: "Payment Reminder", content: `Hello ${mockDebtor.name}, this is a friendly reminder about your outstanding balance of $${mockDebtor.currentBalance}. Please contact us to discuss payment options.` },
    { id: "confirmation", name: "Payment Confirmation", content: `Thank you for your payment, ${mockDebtor.name}. Your current balance is now $${mockDebtor.currentBalance}.` },
    { id: "schedule", name: "Schedule Call", content: `Hello ${mockDebtor.name}, we would like to schedule a call to discuss your account. Please reply with a convenient time.` },
  ];

  const handleTemplateSelect = (templateId: string) => {
    const template = smsTemplates.find(t => t.id === templateId);
    if (template) {
      setSmsMessage(template.content);
      setSmsTemplate(templateId);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-neon-green";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="w-4 h-4" />;
      case "sms": return <MessageSquare className="w-4 h-4" />;
      case "email": return <Mail className="w-4 h-4" />;
      case "payment": return <DollarSign className="w-4 h-4" />;
      case "note": return <FileText className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "call": return "bg-neon-blue/20 text-neon-blue";
      case "sms": return "bg-purple-500/20 text-purple-400";
      case "email": return "bg-amber-500/20 text-amber-400";
      case "payment": return "bg-neon-green/20 text-neon-green";
      case "note": return "bg-slate-500/20 text-slate-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-96 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          </div>
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
            <Link href="/debtors">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                  <User className="w-6 h-6 text-background" />
                </div>
                {mockDebtor.name}
              </h1>
              <p className="text-muted-foreground mt-1">Account: {mockDebtor.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCallDialogOpen(true)}>
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </Button>
            <Button variant="outline" onClick={() => setSmsDialogOpen(true)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
            <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={() => setEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-green/20 to-neon-blue/20 flex items-center justify-center">
                    <span className="text-2xl font-display font-bold text-neon-green">
                      {mockDebtor.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{mockDebtor.name}</p>
                    <Badge className={cn(
                      mockDebtor.status === "active" 
                        ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    )}>
                      {mockDebtor.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{mockDebtor.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{mockDebtor.phone}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-foreground">{mockDebtor.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Original Balance</span>
                  <span className="font-semibold text-foreground">${mockDebtor.originalBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payments Made</span>
                  <span className="font-semibold text-neon-green">-${mockDebtor.paymentsMade.toLocaleString()}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Current Balance</span>
                    <span className="text-xl font-display font-bold text-foreground">${mockDebtor.currentBalance.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Score */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  Risk Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("text-4xl font-display font-bold", getRiskColor(mockDebtor.riskScore))}>
                    {mockDebtor.riskScore}
                  </span>
                  <div className="flex items-center gap-1 text-sm">
                    {mockDebtor.riskTrend === "improving" ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-neon-green" />
                        <span className="text-neon-green">Improving</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Declining</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      mockDebtor.riskScore >= 70 ? "bg-neon-green" :
                      mockDebtor.riskScore >= 40 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ width: `${mockDebtor.riskScore}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Higher score = more likely to pay
                </p>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Agent</span>
                  <Badge variant="outline">{mockDebtor.assignedAgent}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Campaign</span>
                  <span className="text-sm text-foreground text-right">{mockDebtor.campaign}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Contact</span>
                  <span className="text-sm text-foreground">{mockDebtor.lastContact}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Next Scheduled</span>
                  <span className="text-sm text-neon-green">{mockDebtor.nextScheduled}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="history">Contact History</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {mockHistory.map((event, index) => (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getEventColor(event.type))}>
                              {getEventIcon(event.type)}
                            </div>
                            {index < mockHistory.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground capitalize">{event.type}</p>
                                <p className="text-sm text-muted-foreground">
                                  {event.date} at {event.time}
                                  {event.agent && ` • ${event.agent}`}
                                </p>
                              </div>
                              {event.outcome && (
                                <Badge variant="outline">{event.outcome}</Badge>
                              )}
                              {event.amount && (
                                <span className="font-semibold text-neon-green">+${event.amount}</span>
                              )}
                            </div>
                            {event.duration && (
                              <p className="text-sm text-muted-foreground mt-1">Duration: {event.duration}</p>
                            )}
                            {event.content && (
                              <p className="text-sm text-muted-foreground mt-1">{event.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {mockPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-neon-green" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{payment.method}</p>
                              <p className="text-sm text-muted-foreground">{payment.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-neon-green">${payment.amount.toLocaleString()}</p>
                            <Badge className={cn(
                              payment.status === "completed" 
                                ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            )}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    {/* Add Note */}
                    <div className="mb-6">
                      <Textarea
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        className="mb-2"
                      />
                      <Button 
                        className="bg-neon-green text-background hover:bg-neon-green/90"
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-neon-green/20 text-neon-green text-xs">
                                  {note.author.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{note.author}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{note.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-neon-green" />
              Initiate Call
            </DialogTitle>
            <DialogDescription>
              Start a call with {mockDebtor.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-neon-green">
                    {mockDebtor.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{mockDebtor.name}</p>
                  <p className="text-sm text-muted-foreground">{mockDebtor.phone}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Call Type</Label>
              <Select defaultValue="outbound">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound Call</SelectItem>
                  <SelectItem value="callback">Scheduled Callback</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select defaultValue="nova-01">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova-01">NOVA-01 (AI Agent)</SelectItem>
                  <SelectItem value="nova-02">NOVA-02 (AI Agent)</SelectItem>
                  <SelectItem value="human">Human Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleInitiateCall}
              disabled={isCallingInProgress}
            >
              {isCallingInProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Start Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Send SMS
            </DialogTitle>
            <DialogDescription>
              Send a text message to {mockDebtor.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{mockDebtor.phone}</span>
            </div>
            <div className="space-y-2">
              <Label>Use Template</Label>
              <Select value={smsTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {smsTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Type your message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {smsMessage.length}/160 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-500 text-white hover:bg-purple-600"
              onClick={handleSendSMS}
            >
              <Send className="w-4 h-4 mr-2" />
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-neon-blue" />
              Edit Debtor Profile
            </DialogTitle>
            <DialogDescription>
              Update contact information for {mockDebtor.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={handleSaveEdit}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
