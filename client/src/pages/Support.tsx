/**
 * MOJAVOX Support Page
 * Style: Cyberpunk Corporate
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Send,
  Ticket,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const existingTickets = [
  {
    id: "TKT-2026-0127",
    subject: "AI Agent not making calls",
    status: "in_progress",
    priority: "high",
    created: "2026-01-25",
    lastUpdate: "2026-01-27"
  },
  {
    id: "TKT-2026-0098",
    subject: "Payment integration question",
    status: "resolved",
    priority: "medium",
    created: "2026-01-20",
    lastUpdate: "2026-01-22"
  },
  {
    id: "TKT-2026-0045",
    subject: "Campaign report export issue",
    status: "resolved",
    priority: "low",
    created: "2026-01-15",
    lastUpdate: "2026-01-16"
  }
];

const statusConfig = {
  open: { label: "Open", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  resolved: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  closed: { label: "Closed", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" }
};

const priorityConfig = {
  low: { label: "Low", color: "text-slate-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  high: { label: "High", color: "text-red-400" },
  urgent: { label: "Urgent", color: "text-red-500" }
};

const allTickets = [
  { id: "TKT-2026-0127", subject: "AI Agent not making calls", status: "in_progress", priority: "high", created: "2026-01-25", lastUpdate: "2026-01-27" },
  { id: "TKT-2026-0098", subject: "Payment integration question", status: "resolved", priority: "medium", created: "2026-01-20", lastUpdate: "2026-01-22" },
  { id: "TKT-2026-0045", subject: "Campaign report export issue", status: "resolved", priority: "low", created: "2026-01-15", lastUpdate: "2026-01-16" },
  { id: "TKT-2026-0032", subject: "Voice quality feedback", status: "closed", priority: "low", created: "2026-01-10", lastUpdate: "2026-01-12" },
  { id: "TKT-2026-0021", subject: "Dashboard loading slow", status: "resolved", priority: "medium", created: "2026-01-05", lastUpdate: "2026-01-07" },
];

const videoTutorials = [
  { id: 1, title: "Getting Started with MOJAVOX", duration: "5:32", category: "Basics" },
  { id: 2, title: "Setting Up Your First AI Agent", duration: "8:15", category: "Agents" },
  { id: 3, title: "Creating Effective Campaigns", duration: "12:45", category: "Campaigns" },
  { id: 4, title: "Understanding Analytics Dashboard", duration: "7:20", category: "Analytics" },
  { id: 5, title: "Payment Portal Configuration", duration: "6:10", category: "Payments" },
  { id: 6, title: "Advanced Script Editing", duration: "15:30", category: "Scripts" },
];

const systemStatus = [
  { name: "API Services", status: "operational", uptime: "99.99%" },
  { name: "AI Voice Engine", status: "operational", uptime: "99.95%" },
  { name: "Payment Processing", status: "operational", uptime: "100%" },
  { name: "Dashboard & Analytics", status: "operational", uptime: "99.98%" },
  { name: "Database Cluster", status: "operational", uptime: "99.99%" },
];

export default function Support() {
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "",
    description: "",
    email: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog states
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [ticketsDialogOpen, setTicketsDialogOpen] = useState(false);
  const [videosDialogOpen, setVideosDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{from: string; text: string; time: string}[]>([
    { from: "agent", text: "Hello! Welcome to MOJAVOX support. How can I help you today?", time: "Just now" }
  ]);
  
  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    setChatMessages([...chatMessages, { from: "user", text: chatMessage, time: "Just now" }]);
    setChatMessage("");
    // Simulate agent response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { from: "agent", text: "Thank you for your message. Let me look into that for you...", time: "Just now" }]);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.category || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Support ticket created", {
      description: `Ticket #TKT-2026-${Math.floor(Math.random() * 9000) + 1000} has been submitted. We'll respond within 24 hours.`
    });
    
    setFormData({
      subject: "",
      category: "",
      priority: "",
      description: "",
      email: ""
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Support Center</h1>
        </div>
        <p className="text-slate-400">Get help from our support team or browse existing resources</p>
      </div>

      {/* Contact Options */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50 transition-all">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Live Chat</h3>
            <p className="text-sm text-slate-400 mb-4">Chat with our support team in real-time</p>
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={() => setChatDialogOpen(true)}>
              Start Chat
            </Button>
            <p className="text-xs text-slate-500 mt-2">Average response: 2 min</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50 transition-all">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Phone Support</h3>
            <p className="text-sm text-slate-400 mb-4">Speak directly with a support agent</p>
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-800" onClick={() => { navigator.clipboard.writeText("1-800-555-0123"); toast.success("Phone number copied"); }}>
              1-800-555-0123
            </Button>
            <p className="text-xs text-slate-500 mt-2">Mon-Fri, 8am-8pm EST</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50 transition-all">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Email Support</h3>
            <p className="text-sm text-slate-400 mb-4">Send us a detailed message</p>
            <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-800" onClick={() => { navigator.clipboard.writeText("support@mojavox.ai"); toast.success("Email copied"); }}>
              support@mojavox.ai
            </Button>
            <p className="text-xs text-slate-500 mt-2">Response within 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Submit Ticket Form */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-400" />
              Submit a Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-slate-300">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing & Payments</SelectItem>
                      <SelectItem value="ai_agents">AI Agents</SelectItem>
                      <SelectItem value="campaigns">Campaigns</SelectItem>
                      <SelectItem value="integrations">Integrations</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide as much detail as possible about your issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Tickets */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Your Recent Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm text-slate-500">{ticket.id}</p>
                      <p className="font-medium text-white">{ticket.subject}</p>
                    </div>
                    <Badge className={statusConfig[ticket.status as keyof typeof statusConfig].color}>
                      {statusConfig[ticket.status as keyof typeof statusConfig].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <AlertCircle className={`w-3 h-3 ${priorityConfig[ticket.priority as keyof typeof priorityConfig].color}`} />
                      {priorityConfig[ticket.priority as keyof typeof priorityConfig].label}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created: {ticket.created}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Updated: {ticket.lastUpdate}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setTicketsDialogOpen(true)}>
              View All Tickets
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            Quick Resources
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <Button variant="ghost" className="justify-start text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => window.location.href = "/docs"}>
              📚 Documentation
            </Button>
            <Button variant="ghost" className="justify-start text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => setVideosDialogOpen(true)}>
              🎥 Video Tutorials
            </Button>
            <Button variant="ghost" className="justify-start text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => window.location.href = "/docs"}>
              📋 API Reference
            </Button>
            <Button variant="ghost" className="justify-start text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => setStatusDialogOpen(true)}>
              🔧 System Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-700 p-0">
          <DialogHeader className="p-4 border-b border-slate-700">
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Live Chat Support
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] p-4">
            <div className="space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.from === "user" ? "bg-emerald-500/20 text-emerald-100" : "bg-slate-800 text-slate-200"}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs text-slate-500 mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="bg-slate-800 border-slate-600 text-white"
              />
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSendChat}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Tickets Dialog */}
      <Dialog open={ticketsDialogOpen} onOpenChange={setTicketsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-400" />
              All Support Tickets
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              View and manage all your support tickets
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {allTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{ticket.id}</p>
                      <p className="font-medium text-white mt-1">{ticket.subject}</p>
                    </div>
                    <Badge className={statusConfig[ticket.status as keyof typeof statusConfig]?.color}>
                      {statusConfig[ticket.status as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className={priorityConfig[ticket.priority as keyof typeof priorityConfig]?.color}>
                      {priorityConfig[ticket.priority as keyof typeof priorityConfig]?.label} Priority
                    </span>
                    <span>Created: {ticket.created}</span>
                    <span>Updated: {ticket.lastUpdate}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setTicketsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Tutorials Dialog */}
      <Dialog open={videosDialogOpen} onOpenChange={setVideosDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-400" />
              Video Tutorials
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Learn how to use MOJAVOX with our video guides
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {videoTutorials.map((video) => (
                <div key={video.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 rounded bg-slate-700 flex items-center justify-center">
                      <Play className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{video.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{video.duration}</span>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">{video.category}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setVideosDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-400" />
              System Status
              <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                All Systems Operational
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Current status of MOJAVOX services
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {systemStatus.map((service, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">{service.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Uptime: {service.uptime}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Operational
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Last updated: {new Date().toLocaleString()} • Status page refreshes every 60 seconds
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setStatusDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
