/**
 * MOJAVOX Mock Data
 * 
 * This file contains all mock data for the standalone Frontend.
 * Used for navigation and UX validation before backend integration.
 */

// ============================================
// USER & AUTH
// ============================================

export const mockUser = {
  id: "user-001",
  name: "Sarah Mitchell",
  email: "sarah.mitchell@acme-collections.com",
  role: "SUPERVISOR" as const,
  avatar: null,
  onboarded: true,
  organization: {
    id: "org-001",
    name: "ACME Collections Inc.",
    plan: "enterprise"
  }
};

export const mockUsers = [
  { id: "user-001", name: "Sarah Mitchell", email: "sarah.mitchell@acme-collections.com", role: "ADMIN", status: "active", lastActive: "2026-01-27T14:30:00Z" },
  { id: "user-002", name: "James Wilson", email: "james.wilson@acme-collections.com", role: "SUPERVISOR", status: "active", lastActive: "2026-01-27T14:25:00Z" },
  { id: "user-003", name: "Emily Chen", email: "emily.chen@acme-collections.com", role: "SUPERVISOR", status: "active", lastActive: "2026-01-27T13:45:00Z" },
  { id: "user-004", name: "Michael Brown", email: "michael.brown@acme-collections.com", role: "AGENT", status: "inactive", lastActive: "2026-01-25T09:00:00Z" },
];

// ============================================
// DASHBOARD KPIs
// ============================================

export const mockDashboardKPIs = {
  totalRecovered: 4750000,
  totalRecoveredChange: 12.5,
  activeAgents: 47,
  totalAgents: 50,
  callsToday: 1247,
  callsTodayChange: 8.3,
  avgCallDuration: 4.2, // minutes
  successRate: 68.5,
  successRateChange: 3.2,
  pendingApprovals: 12,
  activeCampaigns: 8,
};

export const mockRecoveryPerformance = [
  { date: "Mon", recovered: 125000, calls: 180, successRate: 65 },
  { date: "Tue", recovered: 142000, calls: 195, successRate: 68 },
  { date: "Wed", recovered: 138000, calls: 188, successRate: 67 },
  { date: "Thu", recovered: 165000, calls: 210, successRate: 72 },
  { date: "Fri", recovered: 158000, calls: 205, successRate: 70 },
  { date: "Sat", recovered: 89000, calls: 120, successRate: 62 },
  { date: "Sun", recovered: 45000, calls: 65, successRate: 58 },
];

export const mockFleetStatus = {
  online: 42,
  busy: 5,
  offline: 3,
  total: 50,
};

// ============================================
// AI AGENTS
// ============================================

export const mockAgents = [
  {
    id: "agent-001",
    name: "NOVA-01",
    type: "collection",
    personality: "empathetic",
    status: "online",
    callsToday: 45,
    successRate: 72,
    avgCallDuration: 3.8,
    voiceEngine: "elevenlabs",
    voiceId: "rachel",
    maxDiscount: 15,
    maxPaymentPlan: 12,
  },
  {
    id: "agent-002",
    name: "APEX-02",
    type: "collection",
    personality: "assertive",
    status: "busy",
    callsToday: 52,
    successRate: 68,
    avgCallDuration: 4.2,
    voiceEngine: "elevenlabs",
    voiceId: "adam",
    maxDiscount: 10,
    maxPaymentPlan: 6,
  },
  {
    id: "agent-003",
    name: "ECHO-03",
    type: "collection",
    personality: "neutral",
    status: "online",
    callsToday: 38,
    successRate: 65,
    avgCallDuration: 4.5,
    voiceEngine: "elevenlabs",
    voiceId: "josh",
    maxDiscount: 20,
    maxPaymentPlan: 18,
  },
  {
    id: "agent-004",
    name: "PULSE-04",
    type: "reminder",
    personality: "friendly",
    status: "offline",
    callsToday: 0,
    successRate: 58,
    avgCallDuration: 2.1,
    voiceEngine: "google",
    voiceId: "en-US-Neural2-F",
    maxDiscount: 5,
    maxPaymentPlan: 3,
  },
];

// ============================================
// CAMPAIGNS
// ============================================

export const mockCampaigns = [
  {
    id: "camp-001",
    name: "Q1 2026 - High Value Recovery",
    status: "active",
    startDate: "2026-01-15",
    endDate: "2026-03-31",
    totalDebtors: 1250,
    contacted: 890,
    recovered: 2450000,
    targetAmount: 5000000,
    successRate: 71,
    assignedAgents: ["NOVA-01", "APEX-02"],
  },
  {
    id: "camp-002",
    name: "Payment Reminder - 30 Days",
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    totalDebtors: 3500,
    contacted: 2100,
    recovered: 890000,
    targetAmount: 1500000,
    successRate: 62,
    assignedAgents: ["PULSE-04"],
  },
  {
    id: "camp-003",
    name: "Legacy Accounts - Final Notice",
    status: "paused",
    startDate: "2025-11-01",
    endDate: "2026-02-28",
    totalDebtors: 450,
    contacted: 380,
    recovered: 125000,
    targetAmount: 800000,
    successRate: 45,
    assignedAgents: ["ECHO-03"],
  },
];

// ============================================
// DEBTORS
// ============================================

export const mockDebtors = [
  {
    id: "debtor-001",
    name: "Acme Logistics Inc.",
    contactName: "John Smith",
    email: "john.smith@acmelogistics.com",
    phone: "+1 (555) 123-4567",
    totalOwed: 45000,
    daysOverdue: 45,
    riskScore: 72,
    lastContact: "2026-01-25T10:30:00Z",
    status: "in_progress",
    paymentHistory: [
      { date: "2025-12-15", amount: 5000, method: "wire" },
      { date: "2025-11-01", amount: 10000, method: "check" },
    ],
  },
  {
    id: "debtor-002",
    name: "Global Shipping Co.",
    contactName: "Maria Garcia",
    email: "m.garcia@globalshipping.com",
    phone: "+1 (555) 234-5678",
    totalOwed: 125000,
    daysOverdue: 90,
    riskScore: 45,
    lastContact: "2026-01-20T14:15:00Z",
    status: "escalated",
    paymentHistory: [],
  },
  {
    id: "debtor-003",
    name: "FastFreight LLC",
    contactName: "Robert Johnson",
    email: "r.johnson@fastfreight.com",
    phone: "+1 (555) 345-6789",
    totalOwed: 18500,
    daysOverdue: 15,
    riskScore: 85,
    lastContact: "2026-01-26T09:00:00Z",
    status: "promised",
    paymentHistory: [
      { date: "2026-01-10", amount: 5000, method: "card" },
    ],
  },
];

// ============================================
// LIVE CALLS
// ============================================

export const mockLiveCalls = [
  {
    id: "call-001",
    agentId: "agent-001",
    agentName: "NOVA-01",
    debtorId: "debtor-001",
    debtorName: "Acme Logistics Inc.",
    contactName: "John Smith",
    startTime: "2026-01-27T14:25:00Z",
    duration: 185, // seconds
    sentiment: 0.65, // 0-1, positive
    status: "active",
    amountDiscussed: 45000,
    currentTopic: "payment_plan",
  },
  {
    id: "call-002",
    agentId: "agent-002",
    agentName: "APEX-02",
    debtorId: "debtor-002",
    debtorName: "Global Shipping Co.",
    contactName: "Maria Garcia",
    startTime: "2026-01-27T14:20:00Z",
    duration: 485,
    sentiment: 0.35,
    status: "active",
    amountDiscussed: 125000,
    currentTopic: "dispute_resolution",
  },
];

export const mockTranscript = [
  { speaker: "agent", text: "Good afternoon, Mr. Smith. This is NOVA from ACME Collections. I'm calling regarding your outstanding balance of $45,000.", timestamp: "14:25:05" },
  { speaker: "debtor", text: "Yes, I've been meaning to discuss this. We've had some cash flow issues lately.", timestamp: "14:25:18" },
  { speaker: "agent", text: "I understand. Many businesses face similar challenges. Let's explore some options that could work for your situation.", timestamp: "14:25:28" },
  { speaker: "debtor", text: "What kind of options are we talking about?", timestamp: "14:25:42" },
  { speaker: "agent", text: "We can offer a structured payment plan. For instance, spreading the balance over 6 to 12 months with manageable monthly payments.", timestamp: "14:25:52" },
  { speaker: "debtor", text: "12 months sounds more feasible for us right now.", timestamp: "14:26:10" },
];

// ============================================
// NOTIFICATIONS
// ============================================

export const mockNotifications = [
  {
    id: "notif-001",
    type: "approval",
    title: "Discount Approval Required",
    message: "NOVA-01 requests 20% discount for Acme Logistics ($9,000)",
    timestamp: "2026-01-27T14:30:00Z",
    read: false,
    priority: "high",
    actionRequired: true,
  },
  {
    id: "notif-002",
    type: "alert",
    title: "High-Value Payment Received",
    message: "Global Shipping Co. paid $50,000 via wire transfer",
    timestamp: "2026-01-27T13:45:00Z",
    read: false,
    priority: "medium",
    actionRequired: false,
  },
  {
    id: "notif-003",
    type: "system",
    title: "Agent PULSE-04 Offline",
    message: "Agent went offline due to voice service interruption",
    timestamp: "2026-01-27T12:00:00Z",
    read: true,
    priority: "low",
    actionRequired: false,
  },
  {
    id: "notif-004",
    type: "compliance",
    title: "Script Deviation Detected",
    message: "APEX-02 deviated from approved script during call #4521",
    timestamp: "2026-01-27T11:30:00Z",
    read: true,
    priority: "high",
    actionRequired: true,
  },
];

// ============================================
// ANALYTICS
// ============================================

export const mockCallHeatmap = {
  hours: ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM"],
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  data: [
    [12, 25, 45, 52, 38, 42, 55, 48, 35, 22, 8],
    [15, 28, 48, 55, 42, 45, 58, 52, 38, 25, 10],
    [10, 22, 42, 48, 35, 38, 52, 45, 32, 20, 6],
    [18, 32, 52, 58, 45, 48, 62, 55, 42, 28, 12],
    [14, 26, 46, 52, 40, 44, 56, 50, 36, 24, 9],
  ],
};

export const mockObjectionAnalysis = [
  { objection: "Can't afford right now", count: 245, resolution: 62 },
  { objection: "Disputing the amount", count: 128, resolution: 45 },
  { objection: "Already paid", count: 89, resolution: 78 },
  { objection: "Need to speak with manager", count: 156, resolution: 52 },
  { objection: "Will call back later", count: 312, resolution: 35 },
];

export const mockAgentLeaderboard = [
  { rank: 1, name: "NOVA-01", recovered: 892000, calls: 1250, successRate: 72 },
  { rank: 2, name: "APEX-02", recovered: 756000, calls: 1180, successRate: 68 },
  { rank: 3, name: "ECHO-03", recovered: 645000, calls: 1050, successRate: 65 },
  { rank: 4, name: "PULSE-04", recovered: 234000, calls: 890, successRate: 58 },
];

// ============================================
// RECORDINGS
// ============================================

export const mockRecordings = [
  {
    id: "rec-001",
    callId: "call-archived-001",
    agentName: "NOVA-01",
    debtorName: "FastFreight LLC",
    contactName: "Robert Johnson",
    date: "2026-01-26T09:15:00Z",
    duration: 245,
    outcome: "payment_plan",
    amount: 18500,
    sentiment: 0.72,
    hasTranscript: true,
  },
  {
    id: "rec-002",
    callId: "call-archived-002",
    agentName: "APEX-02",
    debtorName: "Acme Logistics Inc.",
    contactName: "John Smith",
    date: "2026-01-25T14:30:00Z",
    duration: 380,
    outcome: "callback_scheduled",
    amount: 45000,
    sentiment: 0.55,
    hasTranscript: true,
  },
];

// ============================================
// SETTINGS
// ============================================

export const mockSettings = {
  company: {
    name: "ACME Collections Inc.",
    address: "123 Business Ave, Suite 500",
    city: "New York",
    state: "NY",
    zip: "10001",
    phone: "+1 (555) 000-0000",
    website: "https://acme-collections.com",
  },
  billing: {
    plan: "Enterprise",
    monthlyFee: 4999,
    perCallFee: 0.15,
    nextBillingDate: "2026-02-01",
    paymentMethod: "Visa ending in 4242",
  },
  compliance: {
    maxCallsPerDay: 3,
    callWindowStart: "08:00",
    callWindowEnd: "21:00",
    timezone: "America/New_York",
    recordAllCalls: true,
    consentRequired: true,
  },
  integrations: {
    crm: { name: "Salesforce", connected: true },
    telephony: { name: "Twilio", connected: true },
    payment: { name: "Stripe", connected: true },
  },
};

// ============================================
// REPORTS
// ============================================

export const mockReports = [
  {
    id: "report-001",
    name: "Monthly Recovery Summary - January 2026",
    type: "recovery",
    generatedAt: "2026-01-27T08:00:00Z",
    status: "ready",
    format: "pdf",
    size: "2.4 MB",
  },
  {
    id: "report-002",
    name: "Agent Performance Q4 2025",
    type: "performance",
    generatedAt: "2026-01-15T10:30:00Z",
    status: "ready",
    format: "xlsx",
    size: "1.8 MB",
  },
  {
    id: "report-003",
    name: "Compliance Audit - Week 4",
    type: "compliance",
    generatedAt: "2026-01-27T06:00:00Z",
    status: "generating",
    format: "pdf",
    size: null,
  },
];
