/**
 * MOJAVOX Landing Page
 * Style: Cyberpunk Corporate - Marketing focused
 * 
 * Public-facing landing page showcasing the MOJAVOX AI Collection Platform.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  Headphones,
  LineChart,
  MessageSquare,
  Phone,
  Play,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Agents",
    description: "Deploy intelligent voice agents that handle collection calls 24/7 with human-like conversations and empathy."
  },
  {
    icon: Target,
    title: "Smart Campaign Management",
    description: "Create, monitor, and optimize collection campaigns with real-time analytics and AI-driven insights."
  },
  {
    icon: LineChart,
    title: "Predictive Analytics",
    description: "Leverage machine learning to predict payment likelihood and prioritize high-value accounts."
  },
  {
    icon: Shield,
    title: "Compliance Built-In",
    description: "Stay compliant with TCPA, FDCPA, and state regulations with automated compliance monitoring."
  },
  {
    icon: Headphones,
    title: "Real-Time Monitoring",
    description: "Monitor live calls, intervene when needed, and coach AI agents for continuous improvement."
  },
  {
    icon: DollarSign,
    title: "Seamless Payments",
    description: "Accept payments directly during calls with PCI-compliant processing and multiple payment options."
  }
];

const stats = [
  { value: "47%", label: "Higher Recovery Rate", icon: TrendingUp },
  { value: "3.2x", label: "More Calls Per Day", icon: Phone },
  { value: "68%", label: "Cost Reduction", icon: DollarSign },
  { value: "99.9%", label: "Compliance Rate", icon: Shield },
];

const testimonials = [
  {
    quote: "MOJAVOX transformed our collection operations. We've seen a 52% increase in recovery rates while reducing operational costs by 60%.",
    author: "Jennifer Martinez",
    role: "VP of Collections",
    company: "National Credit Services"
  },
  {
    quote: "The AI agents are remarkably effective. They handle sensitive conversations with empathy while maintaining compliance. Our team can focus on complex cases.",
    author: "Michael Chen",
    role: "Director of Operations",
    company: "Apex Financial Recovery"
  },
  {
    quote: "Implementation was seamless. Within 30 days, we had AI agents handling 80% of our outbound calls. The ROI has been exceptional.",
    author: "Sarah Thompson",
    role: "CEO",
    company: "Midwest Collections Group"
  }
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$2,499",
    period: "/month",
    description: "Perfect for small agencies getting started with AI",
    features: [
      "Up to 5,000 calls/month",
      "2 AI agents",
      "Basic analytics",
      "Email support",
      "Standard compliance tools"
    ],
    cta: "Start Free Trial",
    popular: false
  },
  {
    name: "Professional",
    price: "$7,999",
    period: "/month",
    description: "For growing agencies ready to scale",
    features: [
      "Up to 25,000 calls/month",
      "10 AI agents",
      "Advanced analytics & reporting",
      "Priority support",
      "Custom scripts & personas",
      "API access",
      "A/B testing"
    ],
    cta: "Start Free Trial",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large operations with custom needs",
    features: [
      "Unlimited calls",
      "Unlimited AI agents",
      "Dedicated success manager",
      "24/7 phone support",
      "Custom integrations",
      "On-premise deployment option",
      "SLA guarantees",
      "Custom AI training"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

export default function Landing() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    preferredDate: "",
    preferredTime: "10:00",
    companySize: "1-50",
  });

  const handleScheduleDemo = () => {
    if (!scheduleForm.name || !scheduleForm.email || !scheduleForm.company) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Demo scheduled!", {
      description: "We'll send you a calendar invite shortly.",
    });
    setScheduleDialogOpen(false);
    setScheduleForm({ name: "", email: "", company: "", phone: "", preferredDate: "", preferredTime: "10:00", companySize: "1-50" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Bot className="w-6 h-6 text-slate-900" />
            </div>
            <span className="font-display font-bold text-xl text-white">MOJAVOX</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-slate-400 hover:text-white transition-colors">Testimonials</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">AI-Powered Debt Collection Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
              Collect Smarter with{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI Agents
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Deploy intelligent voice agents that recover more debt, reduce costs, and maintain 
              compliance—all while delivering a better experience for your customers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-lg px-8 h-14">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 text-lg px-8 h-14" onClick={() => setVideoDialogOpen(true)}>
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-slate-500 mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <stat.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-slate-800">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Everything You Need to Scale Collections
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              MOJAVOX combines cutting-edge AI with proven collection strategies to help you 
              recover more while spending less.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-slate-800/30 border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-slate-900/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              How MOJAVOX Works
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Get up and running in minutes, not months. Our platform is designed for rapid deployment.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Upload Your Data", description: "Import your debtor portfolio via CSV or API integration", icon: Users },
              { step: "02", title: "Configure Campaigns", description: "Set up collection strategies, scripts, and compliance rules", icon: Target },
              { step: "03", title: "Deploy AI Agents", description: "Launch intelligent agents that call, negotiate, and collect", icon: Bot },
              { step: "04", title: "Monitor & Optimize", description: "Track performance in real-time and continuously improve", icon: BarChart3 },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-emerald-400 font-mono text-sm mb-2">{item.step}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
                {index < 3 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-slate-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 border-t border-slate-800">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Trusted by Leading Collection Agencies
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              See why top agencies choose MOJAVOX to power their collection operations.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-800/30 border-slate-700/50 p-8">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 mb-6">
                  <MessageSquare className="w-10 h-10 text-emerald-400 shrink-0" />
                  <p className="text-xl text-white italic leading-relaxed">
                    "{testimonials[activeTestimonial].quote}"
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{testimonials[activeTestimonial].author}</p>
                    <p className="text-sm text-slate-400">
                      {testimonials[activeTestimonial].role}, {testimonials[activeTestimonial].company}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {testimonials.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveTestimonial(index)}
                        className={cn(
                          "w-3 h-3 rounded-full transition-all",
                          index === activeTestimonial ? "bg-emerald-500 w-6" : "bg-slate-600 hover:bg-slate-500"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-900/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={cn(
                  "relative bg-slate-800/30 border-slate-700/50",
                  plan.popular && "border-emerald-500 scale-105"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={cn(
                      "w-full",
                      plan.popular 
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-800">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-display font-bold text-white mb-6">
              Ready to Transform Your Collections?
            </h2>
            <p className="text-xl text-slate-400 mb-10">
              Join hundreds of agencies already using MOJAVOX to recover more, faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-lg px-8 h-14">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 text-lg px-8 h-14" onClick={() => setScheduleDialogOpen(true)}>
                <Calendar className="w-5 h-5 mr-2" />
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-slate-900" />
                </div>
                <span className="font-display font-bold text-lg text-white">MOJAVOX</span>
              </div>
              <p className="text-sm text-slate-400">
                AI-powered debt collection platform that helps agencies recover more while maintaining compliance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Mojatoon Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <a href="#" className="hover:text-emerald-400 transition-colors">Twitter</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Demo Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              MOJAVOX Platform Demo
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              See how MOJAVOX transforms debt collection with AI
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Placeholder for video - in production this would be an actual video player */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20" />
              <div className="text-center z-10">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-emerald-500/30 transition-colors">
                  <Play className="w-10 h-10 text-emerald-400 ml-1" />
                </div>
                <p className="text-white font-medium">Click to play demo video</p>
                <p className="text-slate-400 text-sm mt-1">Duration: 3:45</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-slate-800/50 text-center">
                <p className="text-emerald-400 font-bold">AI Agents</p>
                <p className="text-xs text-slate-400">See agents in action</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 text-center">
                <p className="text-cyan-400 font-bold">Dashboard</p>
                <p className="text-xs text-slate-400">Real-time analytics</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 text-center">
                <p className="text-purple-400 font-bold">Campaigns</p>
                <p className="text-xs text-slate-400">Smart automation</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setVideoDialogOpen(false)}>
              Close
            </Button>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
                Start Free Trial
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Demo Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Schedule a Demo
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Book a personalized demo with our team
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email *</Label>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  value={scheduleForm.email}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, email: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Company *</Label>
                <Input
                  placeholder="Acme Collections"
                  value={scheduleForm.company}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, company: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={scheduleForm.phone}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, phone: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Company Size</Label>
              <Select value={scheduleForm.companySize} onValueChange={(v) => setScheduleForm({ ...scheduleForm, companySize: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-50">1-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="500+">500+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Preferred Date</Label>
                <Input
                  type="date"
                  value={scheduleForm.preferredDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, preferredDate: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Preferred Time</Label>
                <Select value={scheduleForm.preferredTime} onValueChange={(v) => setScheduleForm({ ...scheduleForm, preferredTime: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
              onClick={handleScheduleDemo}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Demo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
