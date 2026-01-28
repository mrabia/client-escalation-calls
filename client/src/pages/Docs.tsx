/**
 * MOJAVOX Documentation Page
 * Style: Cyberpunk Corporate
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Bot,
  ChevronRight,
  Code,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Layers,
  Play,
  Search,
  Settings,
  Target,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const docSections = [
  {
    title: "Getting Started",
    icon: Play,
    items: [
      { title: "Quick Start Guide", time: "5 min read" },
      { title: "Platform Overview", time: "10 min read" },
      { title: "Account Setup", time: "3 min read" },
      { title: "First Campaign", time: "8 min read" },
    ]
  },
  {
    title: "AI Agents",
    icon: Bot,
    items: [
      { title: "Agent Configuration", time: "12 min read" },
      { title: "Custom Scripts", time: "15 min read" },
      { title: "Persona Settings", time: "8 min read" },
      { title: "Escalation Rules", time: "6 min read" },
    ]
  },
  {
    title: "Campaigns",
    icon: Target,
    items: [
      { title: "Campaign Types", time: "7 min read" },
      { title: "Target Selection", time: "10 min read" },
      { title: "Scheduling", time: "5 min read" },
      { title: "A/B Testing", time: "12 min read" },
    ]
  },
  {
    title: "Debtors",
    icon: Users,
    items: [
      { title: "Import Data", time: "8 min read" },
      { title: "Segmentation", time: "10 min read" },
      { title: "Scoring Models", time: "15 min read" },
      { title: "Communication History", time: "5 min read" },
    ]
  },
  {
    title: "Payments",
    icon: Wallet,
    items: [
      { title: "Payment Methods", time: "6 min read" },
      { title: "Recurring Payments", time: "8 min read" },
      { title: "Refunds & Disputes", time: "10 min read" },
      { title: "Reporting", time: "7 min read" },
    ]
  },
  {
    title: "API Reference",
    icon: Code,
    items: [
      { title: "Authentication", time: "5 min read" },
      { title: "Endpoints", time: "20 min read" },
      { title: "Webhooks", time: "12 min read" },
      { title: "Rate Limits", time: "3 min read" },
    ]
  },
  {
    title: "Integrations",
    icon: Zap,
    items: [
      { title: "CRM Integration", time: "15 min read" },
      { title: "Telephony Setup", time: "10 min read" },
      { title: "Payment Gateways", time: "8 min read" },
      { title: "Custom Webhooks", time: "12 min read" },
    ]
  },
  {
    title: "Compliance",
    icon: FileText,
    items: [
      { title: "TCPA Guidelines", time: "15 min read" },
      { title: "FDCPA Compliance", time: "12 min read" },
      { title: "State Regulations", time: "20 min read" },
      { title: "Audit Logs", time: "5 min read" },
    ]
  }
];

const codeExample = `// Initialize MOJAVOX API Client
import { MojavoxClient } from '@mojavox/sdk';

const client = new MojavoxClient({
  apiKey: process.env.MOJAVOX_API_KEY,
  environment: 'production'
});

// Create a new campaign
const campaign = await client.campaigns.create({
  name: 'Q1 Recovery Campaign',
  targetListId: 'list_abc123',
  agentId: 'agent_nova01',
  schedule: {
    startDate: '2026-02-01',
    endDate: '2026-03-31',
    callHours: { start: '09:00', end: '20:00' }
  }
});

console.log('Campaign created:', campaign.id);`;

export default function Docs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("Getting Started");

  const copyCode = () => {
    navigator.clipboard.writeText(codeExample);
    toast.success("Code copied to clipboard");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white">Documentation</h1>
          </div>
          <p className="text-slate-400">Learn how to integrate and use MOJAVOX effectively</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => toast.info("API Reference", { description: "Opening full API documentation..." })}>
          <ExternalLink className="w-4 h-4 mr-2" />
          API Reference
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1 bg-slate-800/30 border-slate-700/50 h-fit">
          <CardContent className="p-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1">
                {docSections.map((section) => (
                  <button
                    key={section.title}
                    onClick={() => setActiveSection(section.title)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      activeSection === section.title
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Section */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {(() => {
                  const section = docSections.find(s => s.title === activeSection);
                  const Icon = section?.icon || BookOpen;
                  return <Icon className="w-5 h-5 text-emerald-400" />;
                })()}
                {activeSection}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {docSections
                  .find(s => s.title === activeSection)
                  ?.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Code Example */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-400" />
                Quick Example
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={copyCode}
                className="text-slate-400 hover:text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-slate-300 font-mono">
                  <code>{codeExample}</code>
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Popular Topics */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Popular Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  "API Authentication",
                  "Webhook Setup",
                  "Custom Scripts",
                  "TCPA Compliance",
                  "Campaign Templates",
                  "Agent Training",
                  "Payment Integration",
                  "Data Import",
                  "Reporting API",
                  "Error Handling"
                ].map((topic, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-emerald-400"
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
              <CardContent className="p-4 text-center">
                <Database className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-medium text-white">API Reference</p>
                <p className="text-xs text-slate-400">Full endpoint documentation</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Layers className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="font-medium text-white">SDK Libraries</p>
                <p className="text-xs text-slate-400">Node, Python, PHP, Ruby</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <CardContent className="p-4 text-center">
                <Settings className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="font-medium text-white">Postman Collection</p>
                <p className="text-xs text-slate-400">Ready-to-use API requests</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
