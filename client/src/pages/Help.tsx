/**
 * MOJAVOX Help/FAQ Page
 * Style: Cyberpunk Corporate
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Bot,
  BookOpen,
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Phone,
  Search,
  Target,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const categories = [
  { icon: Bot, title: "AI Agents", count: 12 },
  { icon: Target, title: "Campaigns", count: 8 },
  { icon: Users, title: "Debtors", count: 6 },
  { icon: Wallet, title: "Payments", count: 10 },
  { icon: Zap, title: "Integrations", count: 5 },
  { icon: BookOpen, title: "Getting Started", count: 7 },
];

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I create my first campaign?",
        a: "Navigate to Campaigns in the sidebar, click 'New Campaign', and follow the wizard. You'll set up targets, assign AI agents, configure call scripts, and set collection parameters. The wizard guides you through each step."
      },
      {
        q: "What data format is required for debtor imports?",
        a: "MOJAVOX accepts CSV files with columns for: Name, Phone, Email, Account Number, Balance, and optionally Address and Notes. Download our template from the Debtors page for the exact format."
      },
      {
        q: "How long does it take to set up MOJAVOX?",
        a: "Most agencies are up and running within 24-48 hours. Basic setup takes about 30 minutes, including importing your first debtor list and configuring an AI agent."
      }
    ]
  },
  {
    category: "AI Agents",
    questions: [
      {
        q: "How do AI agents handle difficult conversations?",
        a: "Our AI agents are trained on millions of collection conversations and can handle objections, negotiate payment plans, and de-escalate tense situations. They can also transfer to a human supervisor when needed."
      },
      {
        q: "Can I customize what the AI agents say?",
        a: "Yes! You can create custom scripts, adjust tone and personality, set negotiation parameters, and define escalation triggers. Use the Agent Wizard to configure all aspects of agent behavior."
      },
      {
        q: "Do AI agents comply with TCPA and FDCPA?",
        a: "Absolutely. Our agents are programmed to follow all federal and state regulations, including proper identification, time-of-day restrictions, and honoring do-not-call requests."
      }
    ]
  },
  {
    category: "Campaigns",
    questions: [
      {
        q: "How many campaigns can I run simultaneously?",
        a: "There's no limit to concurrent campaigns. However, we recommend starting with 2-3 campaigns to optimize performance before scaling up."
      },
      {
        q: "Can I A/B test different scripts?",
        a: "Yes! Use our A/B testing feature to test different scripts, call times, and agent personas. The system automatically tracks performance and can shift traffic to winning variants."
      }
    ]
  },
  {
    category: "Payments",
    questions: [
      {
        q: "What payment methods are supported?",
        a: "We support credit/debit cards (Visa, Mastercard, Amex, Discover), ACH bank transfers, PayPal, and Apple Pay. All transactions are PCI-DSS compliant."
      },
      {
        q: "How do I set up recurring payments?",
        a: "Go to Recurring Payments in the sidebar. You can create payment plans with weekly, bi-weekly, monthly, or custom schedules. Debtors can also set these up during calls."
      },
      {
        q: "When do I receive collected funds?",
        a: "Funds are typically deposited within 2-3 business days. Enterprise plans can request next-day or same-day deposits."
      }
    ]
  },
  {
    category: "Technical",
    questions: [
      {
        q: "Does MOJAVOX integrate with my CRM?",
        a: "Yes, we offer native integrations with Salesforce, HubSpot, and Zoho. We also provide a REST API for custom integrations with any system."
      },
      {
        q: "Is my data secure?",
        a: "We use bank-level encryption (AES-256), are SOC 2 Type II certified, and comply with GDPR and CCPA. All data is stored in secure, redundant data centers."
      }
    ]
  }
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Help Center</h1>
        <p className="text-slate-400">Find answers to common questions and learn how to get the most out of MOJAVOX</p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((cat, index) => (
          <Card key={index} className="bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50 transition-all cursor-pointer">
            <CardContent className="p-4 text-center">
              <cat.icon className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">{cat.title}</p>
              <p className="text-xs text-slate-500">{cat.count} articles</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQs */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
        
        {filteredFaqs.length === 0 ? (
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No results found for "{searchQuery}"</p>
              <p className="text-sm text-slate-500 mt-2">Try different keywords or browse categories above</p>
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map((category, index) => (
            <Card key={index} className="bg-slate-800/30 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-emerald-400">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((faq, i) => (
                    <AccordionItem key={i} value={`${index}-${i}`} className="border-slate-700">
                      <AccordionTrigger className="text-white hover:text-emerald-400 text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-400">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Contact Support */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Can't find what you're looking for?</h3>
                <p className="text-sm text-slate-400">Our support team is here to help 24/7</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/support">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <LifeBuoy className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800" onClick={() => { navigator.clipboard.writeText("1-800-555-0123"); toast.success("Phone number copied"); }}>
                <Phone className="w-4 h-4 mr-2" />
                1-800-555-0123
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
