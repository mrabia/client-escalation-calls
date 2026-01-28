/**
 * MOJAVOX Privacy Policy Page
 * Style: Cyberpunk Corporate
 * 
 * Privacy policy that users must accept before using the platform.
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
  Lock,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const privacyContent = [
  {
    title: "1. Introduction",
    content: `Mojatoon Inc. ("Company", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the MOJAVOX AI Collection Platform ("Service").

Please read this Privacy Policy carefully. By using the Service, you consent to the data practices described in this policy. If you do not agree with our policies and practices, please do not use our Service.`
  },
  {
    title: "2. Information We Collect",
    content: `We collect several types of information:

Personal Information:
• Name, email address, phone number
• Company name and business address
• Job title and role
• Payment and billing information
• Login credentials

Debtor Information (provided by you):
• Names and contact information
• Account numbers and balances
• Payment history
• Communication preferences

Usage Information:
• Log data (IP address, browser type, pages visited)
• Device information
• Call recordings and transcripts
• Platform usage analytics`
  },
  {
    title: "3. How We Use Your Information",
    content: `We use collected information to:

• Provide and maintain the Service
• Process transactions and send related information
• Send administrative notifications
• Respond to inquiries and provide support
• Improve and personalize the Service
• Monitor and analyze usage patterns
• Detect and prevent fraud and security threats
• Comply with legal obligations
• Train and improve our AI models (with anonymized data)

We do NOT sell your personal information to third parties.`
  },
  {
    title: "4. Data Sharing and Disclosure",
    content: `We may share your information with:

Service Providers:
• Cloud hosting providers (AWS, Google Cloud)
• Payment processors (Stripe)
• Analytics services
• Customer support tools

Legal Requirements:
• To comply with legal obligations
• To respond to lawful requests from authorities
• To protect our rights and property
• To prevent fraud or illegal activities

Business Transfers:
• In connection with mergers, acquisitions, or asset sales

With Your Consent:
• When you explicitly authorize sharing`
  },
  {
    title: "5. Data Security",
    content: `We implement robust security measures including:

• 256-bit SSL/TLS encryption for data in transit
• AES-256 encryption for data at rest
• Multi-factor authentication
• Regular security audits and penetration testing
• SOC 2 Type II compliance
• Role-based access controls
• Automated threat detection
• Regular employee security training

Despite these measures, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.`
  },
  {
    title: "6. Data Retention",
    content: `We retain your information for as long as:

• Your account is active
• Needed to provide the Service
• Required by law or regulation
• Necessary for legitimate business purposes

Call recordings are retained for:
• 7 years for compliance purposes
• Or as required by applicable regulations

You may request deletion of your data subject to legal retention requirements.`
  },
  {
    title: "7. Your Rights and Choices",
    content: `Depending on your location, you may have the right to:

• Access your personal information
• Correct inaccurate data
• Delete your data (right to be forgotten)
• Restrict or object to processing
• Data portability
• Withdraw consent
• Opt-out of marketing communications
• Do not sell my personal information (CCPA)

To exercise these rights, contact us at privacy@mojavox.ai`
  },
  {
    title: "8. Cookies and Tracking",
    content: `We use cookies and similar technologies to:

• Maintain your session and preferences
• Analyze usage patterns
• Improve Service performance
• Provide personalized features

Types of cookies we use:
• Essential cookies (required for Service operation)
• Analytics cookies (usage statistics)
• Preference cookies (remember your settings)

You can control cookies through your browser settings, but disabling certain cookies may affect Service functionality.`
  },
  {
    title: "9. Third-Party Services",
    content: `Our Service may contain links to third-party websites and services. We are not responsible for the privacy practices of these third parties.

Third-party services we integrate with:
• Google Analytics
• Stripe (payment processing)
• Twilio (communications)
• AWS (cloud infrastructure)

Please review the privacy policies of any third-party services you interact with.`
  },
  {
    title: "10. International Data Transfers",
    content: `Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws.

We ensure appropriate safeguards for international transfers:
• Standard Contractual Clauses (SCCs)
• Data Processing Agreements
• Privacy Shield certification (where applicable)
• Adequacy decisions by relevant authorities`
  },
  {
    title: "11. Children's Privacy",
    content: `Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.

If we learn that we have collected information from a child under 18, we will promptly delete that information. If you believe we have collected information from a child, please contact us immediately.`
  },
  {
    title: "12. California Privacy Rights (CCPA)",
    content: `California residents have additional rights under the CCPA:

• Right to know what personal information is collected
• Right to know if personal information is sold or disclosed
• Right to opt-out of the sale of personal information
• Right to delete personal information
• Right to non-discrimination for exercising rights

To exercise CCPA rights, contact us at privacy@mojavox.ai or call 1-800-555-0123.

We do NOT sell personal information as defined by the CCPA.`
  },
  {
    title: "13. European Privacy Rights (GDPR)",
    content: `If you are in the European Economic Area (EEA), you have rights under the GDPR:

• Right of access
• Right to rectification
• Right to erasure
• Right to restrict processing
• Right to data portability
• Right to object
• Rights related to automated decision-making

Our legal bases for processing:
• Contract performance
• Legitimate interests
• Legal compliance
• Consent (where required)

Data Protection Officer: dpo@mojavox.ai`
  },
  {
    title: "14. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes by:

• Posting the new policy on this page
• Updating the "Last Updated" date
• Sending an email notification
• Displaying a notice in the Service

Your continued use of the Service after changes constitutes acceptance of the updated policy.`
  },
  {
    title: "15. Contact Us",
    content: `For questions about this Privacy Policy or our data practices:

Mojatoon Inc.
Privacy Department
123 Innovation Drive, Suite 500
San Francisco, CA 94105

Email: privacy@mojavox.ai
Phone: 1-800-555-0123
Data Protection Officer: dpo@mojavox.ai

For EU residents:
EU Representative: eu-rep@mojavox.ai`
  }
];

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // Check if terms were already accepted
    const terms = localStorage.getItem("mojavox_terms_accepted");
    if (terms) {
      try {
        const parsed = JSON.parse(terms);
        setTermsAccepted(parsed.accepted);
      } catch {
        // Invalid data
      }
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (!accepted) {
      toast.error("Please accept the Privacy Policy to continue");
      return;
    }
    
    // Store acceptance in localStorage
    localStorage.setItem("mojavox_privacy_accepted", JSON.stringify({
      accepted: true,
      timestamp: Date.now(),
      version: "1.0"
    }));
    
    toast.success("Privacy Policy accepted", {
      description: "You can now access the MOJAVOX platform."
    });
    
    // Redirect to dashboard
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={termsAccepted ? "/terms" : "/"}>
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
            <Lock className="w-4 h-4" />
            <span>Privacy & Security</span>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {/* Progress indicator */}
        {termsAccepted && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-emerald-400">Terms of Service</span>
            </div>
            <div className="w-16 h-0.5 bg-emerald-500" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                <span className="text-sm text-emerald-500 font-bold">2</span>
              </div>
              <span className="text-sm text-white">Privacy Policy</span>
            </div>
          </div>
        )}

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-white text-xl">Privacy Policy</CardTitle>
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
                    <strong className="text-white">YOUR PRIVACY MATTERS:</strong> This Privacy Policy describes how Mojatoon Inc. 
                    collects, uses, and protects your personal information when you use the MOJAVOX platform. 
                    We are committed to maintaining the confidentiality and security of your data.
                  </p>
                </div>

                {privacyContent.map((section, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                    {index < privacyContent.length - 1 && (
                      <Separator className="bg-slate-700 mt-6" />
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <p className="text-slate-400 text-xs text-center">
                    — End of Privacy Policy —
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-slate-700 bg-slate-900/30">
              {!scrolledToEnd && (
                <p className="text-sm text-amber-400 text-center mb-4">
                  Please scroll to the end of the document to accept the Privacy Policy
                </p>
              )}
              
              <div className="flex items-start gap-3 mb-6">
                <Checkbox
                  id="accept-privacy"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked as boolean)}
                  disabled={!scrolledToEnd}
                  className={cn(
                    "mt-1 border-slate-600",
                    !scrolledToEnd && "opacity-50 cursor-not-allowed"
                  )}
                />
                <label 
                  htmlFor="accept-privacy" 
                  className={cn(
                    "text-sm cursor-pointer",
                    scrolledToEnd ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  I have read and understood the Privacy Policy. I consent to the collection, use, and processing 
                  of my personal information as described in this policy.
                </label>
              </div>

              <div className="flex gap-3">
                <Link href={termsAccepted ? "/terms" : "/"} className="flex-1">
                  <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                    Back
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
                  Accept & Enter Platform
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                By clicking "Accept & Enter Platform", you will be directed to the MOJAVOX dashboard.
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
            <a href="mailto:privacy@mojavox.ai" className="hover:text-emerald-400 transition-colors">Contact Privacy Team</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
