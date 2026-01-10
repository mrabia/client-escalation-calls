/**
 * LLM Types and Interfaces
 * Type definitions for LLM integration
 */

export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

export enum OpenAIModel {
  GPT4 = 'gpt-4',
  GPT4_TURBO = 'gpt-4-turbo-preview',
  GPT4_O = 'gpt-4o',
  GPT35_TURBO = 'gpt-3.5-turbo',
}

export enum AnthropicModel {
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
}

export enum GoogleModel {
  GEMINI_2_PRO_EXP = 'gemini-2.0-pro-exp',
  GEMINI_2_FLASH_EXP = 'gemini-2.0-flash-exp',
  GEMINI_15_PRO = 'gemini-1.5-pro',
  GEMINI_15_FLASH = 'gemini-1.5-flash',
}

export type LLMModel = OpenAIModel | AnthropicModel | GoogleModel;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface GenerationOptions {
  model?: LLMModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface ChatOptions extends GenerationOptions {
  systemPrompt?: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  options?: GenerationOptions;
}

export interface CompletionResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage: TokenUsage;
  finishReason: string;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostInfo {
  inputCostPerToken: number;
  outputCostPerToken: number;
  totalCost: number;
  inputCost?: number;
  outputCost?: number;
  currency?: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: LLMModel;
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultOptions?: GenerationOptions;
}

export interface ProviderAdapter {
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  streamCompletion(request: CompletionRequest): AsyncGenerator<string>;
  countTokens(text: string, model: string): Promise<number>;
  getCostPerToken(model: string): { input: number; output: number };
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: LLMProvider;
  model: LLMModel;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: PromptVariable[];
  examples?: PromptExample[];
  constraints?: string[];
  outputFormat?: string;
  metadata?: Record<string, any>;
}

export interface PromptExample {
  input: Record<string, any>;
  output: string;
}

export interface LLMRequest {
  templateId?: string;
  messages?: ChatMessage[];
  variables?: Record<string, any>;
  options?: GenerationOptions;
  context?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  cost: CostInfo;
  model: string;
  provider: LLMProvider;
  latency: number;
  cached: boolean;
  metadata?: Record<string, any>;
}

export interface LLMError {
  code: string;
  message: string;
  provider: LLMProvider;
  model?: string;
  retryable: boolean;
  details?: any;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface BudgetLimit {
  daily: {
    total: number;
    perCustomer: number;
    perAgent: number;
  };
  monthly: {
    total: number;
    perCampaign: number;
  };
}

export interface UsageMetrics {
  requestCount: number;
  totalRequests?: number; // Alias for requestCount
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  avgCostPerRequest?: number;
  successRate: number;
  errorRate: number;
  cacheHitRate: number;
  byProvider?: Array<{
    provider: string;
    model: string;
    requests: number;
    cost: number;
    tokens: number;
  }>;
  period?: {
    start: Date;
    end: Date;
  };
}

export interface LLMServiceConfig {
  providers: LLMConfig[];
  defaultProvider: LLMProvider;
  fallbackChain: LLMProvider[];
  retryConfig: RetryConfig;
  budgetLimits: BudgetLimit;
  enableCaching: boolean;
  cacheConfig?: {
    ttl: number;
    maxSize: number;
  };
}

export interface CacheEntry {
  key: string;
  response: LLMResponse;
  timestamp: number;
  hits: number;
}

export interface PromptContext {
  customerId?: string;
  customerName?: string;
  companyName?: string;
  outstandingAmount?: number;
  daysPastDue?: number;
  riskLevel?: string;
  paymentHistory?: any[];
  communicationHistory?: any[];
  previousAttempts?: number;
  preferredChannel?: string;
  communicationStyle?: string;
  industry?: string;
  companySize?: string;
  [key: string]: any;
}

export interface EmailGenerationRequest {
  customerId: string;
  templateType: 'reminder' | 'urgent' | 'final_notice' | 'payment_plan';
  tone: 'professional' | 'friendly' | 'urgent' | 'formal';
  context: PromptContext;
  includePaymentLink?: boolean;
  includeContactInfo?: boolean;
}

export interface EmailGenerationResponse {
  subject: string;
  body: string;
  tone: string;
  estimatedReadingTime: number;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    generatedAt: Date;
  };
}

export interface ConversationRequest {
  customerId: string;
  conversationHistory: ChatMessage[];
  currentInput: string;
  context: PromptContext;
  objective: string;
}

export interface ConversationResponse {
  response: string;
  suggestedActions?: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  nextSteps?: string[];
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    generatedAt: Date;
  };
}

export interface RiskAssessmentRequest {
  customerId: string;
  paymentHistory: any[];
  communicationHistory: any[];
  businessData: any;
  context: PromptContext;
}

export interface RiskAssessmentResponse {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFactors: string[];
  positiveIndicators: string[];
  negativeIndicators: string[];
  recommendedStrategy: string;
  predictedPaymentTimeline: string;
  confidence: number;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    generatedAt: Date;
  };
}

export interface StrategyRecommendationRequest {
  customerId: string;
  riskAssessment: RiskAssessmentResponse;
  context: PromptContext;
  availableChannels: string[];
  constraints?: string[];
}

export interface StrategyRecommendationResponse {
  recommendedChannel: string;
  recommendedTone: string;
  recommendedTiming: string;
  messageStrategy: string;
  alternativeApproaches: string[];
  expectedSuccessRate: number;
  reasoning: string;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    generatedAt: Date;
  };
}
