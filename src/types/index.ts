// Core system types
export interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  currentTasks: Task[];
  performance: PerformanceMetrics;
  config: AgentConfig;
}

export enum AgentType {
  EMAIL = 'email',
  PHONE = 'phone', 
  SMS = 'sms',
  RESEARCH = 'research'
}

export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export interface Task {
  id: string;
  type: TaskType;
  priority: Priority;
  customerId: string;
  campaignId: string;
  status: TaskStatus;
  assignedAgentId?: string;
  context: TaskContext;
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export enum TaskType {
  SEND_EMAIL = 'send_email',
  MAKE_CALL = 'make_call',
  SEND_SMS = 'send_sms',
  RESEARCH_CUSTOMER = 'research_customer',
  ESCALATE = 'escalate',
  FOLLOW_UP = 'follow_up'
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: Address;
  preferredContactMethod: ContactMethod;
  riskLevel?: string; // Added for agent compatibility
  contactAttempts?: number; // Added for agent compatibility
  paymentHistory: PaymentRecord[];
  profile: CustomerProfile;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms'
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  invoiceNumber: string;
  description: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  OVERDUE = 'overdue',
  PAID = 'paid',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

export interface CustomerProfile {
  riskLevel: RiskLevel;
  paymentBehavior: PaymentBehavior;
  communicationPreferences: CommunicationPreferences;
  responseRate: number;
  averagePaymentDelay: number;
  lastContactDate?: Date;
  notes: string[];
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface PaymentBehavior {
  averageDaysLate: number;
  paymentFrequency: string;
  partialPaymentTendency: boolean;
  seasonalPatterns: boolean;
}

export interface CommunicationPreferences {
  preferredTime: TimeSlot;
  timezone: string;
  language: string;
  communicationStyle: CommunicationStyle;
  doNotContact?: boolean;
  contactRestrictions?: string[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export enum CommunicationStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  DIRECT = 'direct',
  DIPLOMATIC = 'diplomatic'
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  customerId: string;
  status: CampaignStatus;
  escalationSteps: EscalationStep[];
  currentStep: number;
  startDate: Date;
  endDate?: Date;
  pausedUntil?: Date;
  results: CampaignResults;
  config: CampaignConfig;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface EscalationStep {
  stepNumber: number;
  channel: ContactMethod;
  template: string;
  delayHours: number;
  maxAttempts: number;
  conditions?: EscalationCondition[];
}

export interface EscalationCondition {
  type: ConditionType;
  value: any;
  operator: Operator;
}

export enum ConditionType {
  PAYMENT_AMOUNT = 'payment_amount',
  DAYS_OVERDUE = 'days_overdue',
  CUSTOMER_RISK_LEVEL = 'customer_risk_level',
  RESPONSE_RATE = 'response_rate',
  TIME_OF_DAY = 'time_of_day'
}

export enum Operator {
  EQUALS = 'equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN = 'in'
}

export interface TaskContext {
  customerId: string;
  campaignId: string;
  paymentRecordId: string;
  previousAttempts: ContactAttempt[];
  customerContext: CustomerContext;
  messageTemplate?: string;
  metadata: Record<string, any>;
}

export interface ContactAttempt {
  id: string;
  channel: ContactMethod;
  timestamp: Date;
  status: ContactStatus;
  response?: string;
  agentId: string;
  duration?: number; // in seconds for calls
  metadata: Record<string, any>;
}

export enum ContactStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened', // for emails
  ANSWERED = 'answered', // for calls
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}

export interface CustomerContext {
  recentPayments: PaymentRecord[];
  openInvoices: PaymentRecord[];
  previousCommunications: ContactAttempt[];
  companyInfo: CompanyInfo;
  relationshipHistory: RelationshipEvent[];
}

export interface CompanyInfo {
  industry: string;
  size: CompanySize;
  website?: string;
  socialProfiles?: SocialProfile[];
  creditRating?: string;
  publicRecords?: PublicRecord[];
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',      // 1-50 employees
  MEDIUM = 'medium',    // 51-250 employees
  LARGE = 'large',      // 251-1000 employees
  ENTERPRISE = 'enterprise' // 1000+ employees
}

export interface SocialProfile {
  platform: string;
  url: string;
  followers?: number;
  lastActivity?: Date;
}

export interface PublicRecord {
  type: string;
  date: Date;
  description: string;
  source: string;
}

export interface RelationshipEvent {
  id: string;
  type: EventType;
  date: Date;
  description: string;
  outcome: EventOutcome;
  involvedParties: string[];
}

export enum EventType {
  PAYMENT_MADE = 'payment_made',
  PAYMENT_MISSED = 'payment_missed',
  COMMUNICATION_SENT = 'communication_sent',
  COMMUNICATION_RECEIVED = 'communication_received',
  DISPUTE_RAISED = 'dispute_raised',
  DISPUTE_RESOLVED = 'dispute_resolved',
  CONTRACT_SIGNED = 'contract_signed',
  SERVICE_DELIVERED = 'service_delivered'
}

export enum EventOutcome {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral'
}

export interface PerformanceMetrics {
  tasksCompleted: number;
  tasksSuccessful: number;
  averageResponseTime: number;
  customerSatisfactionScore: number;
  escalationRate: number;
  lastUpdated: Date;
}

export interface AgentConfig {
  maxConcurrentTasks: number;
  workingHours: TimeSlot;
  timezone: string;
  skills: string[];
  templates: Record<string, string>;
  integrations: IntegrationConfig[];
}

export interface IntegrationConfig {
  service: string;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  enabled: boolean;
}

export interface CampaignResults {
  totalContacts: number;
  successfulContacts: number;
  paymentsReceived: number;
  totalAmountCollected: number;
  averageCollectionTime: number;
  channelPerformance: ChannelMetrics[];
}

export interface ChannelMetrics {
  channel: ContactMethod;
  attempts: number;
  successes: number;
  responseRate: number;
  averageResponseTime: number;
}

export interface CampaignConfig {
  businessHours: TimeSlot;
  timezone: string;
  respectDoNotContact: boolean;
  maxDailyContacts: number;
  cooldownPeriod: number; // hours between contacts
  complianceRules: ComplianceRule[];
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  condition: string; // JSON rule condition
  action: ComplianceAction;
  enabled: boolean;
}

export enum ComplianceAction {
  BLOCK_CONTACT = 'block_contact',
  REQUIRE_APPROVAL = 'require_approval',
  LOG_WARNING = 'log_warning',
  ESCALATE = 'escalate'
}
/**
 * Message interface for conversation history
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
