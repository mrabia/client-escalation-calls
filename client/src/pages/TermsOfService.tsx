/**
 * MOJAVOX Terms of Service Page
 * Style: Cyberpunk Corporate
 * 
 * Legal terms and conditions that users must accept before using the platform.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  Check,
  FileText,
  Scale,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const termsContent = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing and using the MOJAVOX AI Collection Platform ("Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.

These Terms constitute a legally binding agreement between you and Mojatoon Inc. ("Company", "we", "us", or "our"). We reserve the right to modify these Terms at any time, and such modifications will be effective immediately upon posting.`
  },
  {
    title: "2. Description of Service",
    content: `MOJAVOX is an AI-powered debt collection platform that provides:
• Automated voice agents for debt collection calls
• Real-time call monitoring and analytics
• Campaign management and debtor tracking
• Payment processing and reconciliation
• Compliance monitoring and reporting

The Service is designed for use by licensed debt collection agencies and financial institutions in compliance with applicable laws and regulations.`
  },
  {
    title: "3. User Accounts and Registration",
    content: `To access the Service, you must:
• Create an account with accurate and complete information
• Maintain the security of your account credentials
• Promptly notify us of any unauthorized access
• Be at least 18 years old or the age of majority in your jurisdiction
• Have the legal authority to bind your organization to these Terms

You are responsible for all activities that occur under your account.`
  },
  {
    title: "4. Compliance with Laws",
    content: `You agree to use the Service in compliance with all applicable laws and regulations, including but not limited to:
• Fair Debt Collection Practices Act (FDCPA)
• Telephone Consumer Protection Act (TCPA)
• State debt collection laws and licensing requirements
• Consumer Financial Protection Bureau (CFPB) regulations
• General Data Protection Regulation (GDPR) where applicable
• California Consumer Privacy Act (CCPA) where applicable

You are solely responsible for ensuring your use of the Service complies with all applicable laws in your jurisdiction.`
  },
  {
    title: "5. Prohibited Uses",
    content: `You agree NOT to use the Service to:
• Violate any applicable laws or regulations
• Harass, threaten, or abuse consumers
• Make false or misleading representations
• Contact consumers at prohibited times
• Disclose debt information to unauthorized parties
• Attempt to collect debts not legally owed
• Circumvent any security measures or access restrictions
• Reverse engineer or attempt to extract source code
• Use the Service for any purpose other than legitimate debt collection`
  },
  {
    title: "6. AI Agent Conduct",
    content: `Our AI agents are programmed to:
• Identify themselves as AI-powered assistants
• Comply with disclosure requirements
• Respect consumer rights and requests
• Maintain professional and respectful communication
• Accurately represent debt information
• Honor do-not-call and cease communication requests

You acknowledge that AI agents may occasionally make errors and agree to monitor calls and take corrective action when necessary.`
  },
  {
    title: "7. Data Privacy and Security",
    content: `We implement industry-standard security measures to protect your data. However, you acknowledge that:
• No system is completely secure
• You are responsible for the data you upload to the Service
• You must comply with all applicable data protection laws
• You will only upload data you are legally authorized to process
• Call recordings may be stored for quality and compliance purposes

Please refer to our Privacy Policy for detailed information about data handling practices.`
  },
  {
    title: "8. Payment Terms",
    content: `• Subscription fees are billed in advance on a monthly or annual basis
• Usage-based charges are billed monthly in arrears
• All fees are non-refundable except as required by law
• We may change pricing with 30 days' notice
• Late payments may result in service suspension
• You are responsible for all applicable taxes`
  },
  {
    title: "9. Intellectual Property",
    content: `• The Service and all related intellectual property are owned by Mojatoon Inc.
• You retain ownership of your data uploaded to the Service
• You grant us a license to use your data to provide the Service
• Our trademarks and branding may not be used without permission
• Feedback you provide may be used to improve the Service without compensation`
  },
  {
    title: "10. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW:
• THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES
• WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
• OUR TOTAL LIABILITY IS LIMITED TO FEES PAID IN THE PAST 12 MONTHS
• WE ARE NOT RESPONSIBLE FOR THIRD-PARTY SERVICES OR CONTENT
• YOU ASSUME ALL RISKS ASSOCIATED WITH YOUR USE OF THE SERVICE`
  },
  {
    title: "11. Indemnification",
    content: `You agree to indemnify and hold harmless Mojatoon Inc. and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
• Your use of the Service
• Your violation of these Terms
• Your violation of any applicable laws
• Your infringement of any third-party rights
• Any data you upload or transmit through the Service`
  },
  {
    title: "12. Termination",
    content: `• Either party may terminate with 30 days' written notice
• We may suspend or terminate immediately for Terms violations
• Upon termination, your access will be revoked
• You may request export of your data within 30 days of termination
• Certain provisions survive termination (e.g., limitation of liability)`
  },
  {
    title: "13. Governing Law and Disputes",
    content: `• These Terms are governed by the laws of Delaware, USA
• Disputes will be resolved through binding arbitration
• Class action waiver applies to all disputes
• Small claims court is available for qualifying disputes
• Injunctive relief may be sought in any court of competent jurisdiction`
  },
  {
    title: "14. Contact Information",
    content: `For questions about these Terms, please contact us:

Mojatoon Inc.
Legal Department
123 Innovation Drive, Suite 500
San Francisco, CA 94105

Email: legal@mojavox.ai
Phone: 1-800-555-0123`
  }
];

export default function TermsOfService() {
  const [, setLocation] = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (!accepted) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }
    
    // Store acceptance in localStorage
    localStorage.setItem("mojavox_terms_accepted", JSON.stringify({
      accepted: true,
      timestamp: Date.now(),
      version: "1.0"
    }));
    
    toast.success("Terms accepted", {
      description: "Thank you for accepting our Terms of Service."
    });
    
    // Redirect to privacy policy or dashboard
    setLocation("/privacy");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <Bot className="w-5 h-5 text-slate-900" />
              </div>
              <span className="font-semibold text-white">MOJAVOX</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Scale className="w-4 h-4" />
            <span>Legal Documents</span>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white text-xl">Terms of Service</CardTitle>
                <p className="text-sm text-slate-400 mt-1">Last updated: January 27, 2026 • Version 1.0</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea 
              className="h-[500px] p-6"
              onScrollCapture={handleScroll}
            >
              <div className="space-y-8">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <p className="text-slate-300 text-sm leading-relaxed">
                    <strong className="text-white">IMPORTANT:</strong> Please read these Terms of Service carefully before using the MOJAVOX AI Collection Platform. 
                    By using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, 
                    please do not use the Service.
                  </p>
                </div>

                {termsContent.map((section, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                    {index < termsContent.length - 1 && (
                      <Separator className="bg-slate-700 mt-6" />
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <p className="text-slate-400 text-xs text-center">
                    — End of Terms of Service —
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-slate-700 bg-slate-900/30">
              {!scrolledToEnd && (
                <p className="text-sm text-amber-400 text-center mb-4">
                  Please scroll to the end of the document to accept the Terms
                </p>
              )}
              
              <div className="flex items-start gap-3 mb-6">
                <Checkbox
                  id="accept-terms"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked as boolean)}
                  disabled={!scrolledToEnd}
                  className={cn(
                    "mt-1 border-slate-600",
                    !scrolledToEnd && "opacity-50 cursor-not-allowed"
                  )}
                />
                <label 
                  htmlFor="accept-terms" 
                  className={cn(
                    "text-sm cursor-pointer",
                    scrolledToEnd ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  I have read, understood, and agree to be bound by these Terms of Service. 
                  I acknowledge that I have the authority to accept these Terms on behalf of my organization.
                </label>
              </div>

              <div className="flex gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                    Decline
                  </Button>
                </Link>
                <Button 
                  className={cn(
                    "flex-1",
                    accepted 
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  )}
                  onClick={handleAccept}
                  disabled={!accepted}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept & Continue
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                By clicking "Accept & Continue", you will be directed to review our Privacy Policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-8">
        <div className="container text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Mojatoon Inc. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
            <span>•</span>
            <a href="mailto:legal@mojavox.ai" className="hover:text-emerald-400 transition-colors">Contact Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
