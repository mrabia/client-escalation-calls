import { logger } from '@/utils/logger';
import { DatabaseService } from '@/core/services/database';
import { RedisService } from '@/core/services/redis';
import {
  Customer,
  PaymentRecord,
  ContactAttempt,
  CustomerProfile,
  RiskLevel,
  PaymentBehavior,
  CommunicationPreferences,
  CommunicationStyle,
  ContactMethod,
  CompanyInfo,
  CompanySize
} from '@/types';

export interface CustomerContext {
  customer: Customer;
  paymentHistory: PaymentRecord[];
  communicationHistory: ContactAttempt[];
  behaviorAnalysis: BehaviorAnalysis;
  riskAssessment: RiskAssessment;
  recommendations: Recommendation[];
  lastUpdated: Date;
}

export interface BehaviorAnalysis {
  averagePaymentDelay: number;
  paymentPatterns: PaymentPattern[];
  responseRate: number;
  preferredContactTimes: TimePreference[];
  communicationStyle: CommunicationStyle;
  escalationTendency: 'low' | 'medium' | 'high';
  seasonalTrends: SeasonalTrend[];
}

export interface PaymentPattern {
  pattern: 'early' | 'ontime' | 'late' | 'partial' | 'sporadic';
  frequency: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TimePreference {
  dayOfWeek: string;
  hourRange: { start: number; end: number };
  responseRate: number;
  channel: ContactMethod;
}

export interface SeasonalTrend {
  period: string;
  paymentBehavior: 'better' | 'worse' | 'same';
  riskModifier: number;
}

export interface RiskAssessment {
  currentRisk: RiskLevel;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  prediction: RiskPrediction;
  mitigation: string[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  impact: 'positive' | 'negative';
  value: number;
  description: string;
}

export interface RiskPrediction {
  nextPaymentLikelihood: number;
  escalationProbability: number;
  collectionDifficulty: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
  estimatedCollectionTime: number; // days
}

export interface Recommendation {
  type: 'communication' | 'timing' | 'strategy' | 'escalation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action: string;
  reason: string;
  expectedOutcome: string;
  confidence: number;
}

export class ContextEngine {
  private dbService: DatabaseService;
  private redisService: RedisService;
  private isInitialized = false;

  // Caching
  private contextCache: Map<string, CustomerContext> = new Map();
  private cacheExpiryMs = 30 * 60 * 1000; // 30 minutes

  // Analysis parameters
  private readonly ANALYSIS_PARAMS = {
    paymentHistoryMonths: 24,
    communicationHistoryMonths: 12,
    minDataPointsForAnalysis: 3,
    riskScoreWeights: {
      paymentHistory: 0.4,
      communicationResponse: 0.2,
      companyProfile: 0.15,
      accountAge: 0.1,
      escalationHistory: 0.1,
      externalFactors: 0.05
    }
  };

  constructor(dbService: DatabaseService, redisService: RedisService) {
    this.dbService = dbService;
    this.redisService = redisService;
  }

  async initialize(): Promise<void> {
    try {
      // Verify database connections
      const dbHealth = await this.dbService.healthCheck();
      const redisHealth = await this.redisService.healthCheck();

      if (!dbHealth) {
        throw new Error('Database service not healthy');
      }

      if (!redisHealth) {
        logger.warn('Redis service not healthy - running without cache');
      }

      // Set up periodic context refresh
      this.startPeriodicRefresh();

      this.isInitialized = true;
      logger.info('Context Engine initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Context Engine:', error);
      throw error;
    }
  }

  async getCustomerContext(customerId: string, forceRefresh = false): Promise<CustomerContext | null> {
    if (!this.isInitialized) {
      throw new Error('Context Engine not initialized');
    }

    try {
      // Check cache first (if not forcing refresh)
      if (!forceRefresh) {
        const cached = this.contextCache.get(customerId);
        if (cached && (Date.now() - cached.lastUpdated.getTime()) < this.cacheExpiryMs) {
          return cached;
        }

        // Try Redis cache
        const redisCached = await this.redisService.getJson<CustomerContext>(`context:${customerId}`);
        if (redisCached && (Date.now() - new Date(redisCached.lastUpdated).getTime()) < this.cacheExpiryMs) {
          this.contextCache.set(customerId, redisCached);
          return redisCached;
        }
      }

      // Build fresh context
      const context = await this.buildCustomerContext(customerId);
      if (!context) {
        return null;
      }

      // Cache the context
      this.contextCache.set(customerId, context);
      await this.redisService.setJson(`context:${customerId}`, context, 1800); // 30 minutes

      return context;

    } catch (error) {
      logger.error(`Failed to get customer context for ${customerId}:`, error);
      return null;
    }
  }

  private async buildCustomerContext(customerId: string): Promise<CustomerContext | null> {
    try {
      // Get customer data
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        return null;
      }

      // Get payment history
      const paymentHistory = await this.getPaymentHistory(customerId);
      
      // Get communication history
      const communicationHistory = await this.getCommunicationHistory(customerId);

      // Perform behavioral analysis
      const behaviorAnalysis = this.analyzeBehavior(paymentHistory, communicationHistory);

      // Assess risk
      const riskAssessment = this.assessRisk(customer, paymentHistory, communicationHistory, behaviorAnalysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(customer, behaviorAnalysis, riskAssessment);

      const context: CustomerContext = {
        customer,
        paymentHistory,
        communicationHistory,
        behaviorAnalysis,
        riskAssessment,
        recommendations,
        lastUpdated: new Date()
      };

      return context;

    } catch (error) {
      logger.error(`Failed to build customer context for ${customerId}:`, error);
      return null;
    }
  }

  private async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM customers WHERE id = $1',
        [customerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        companyName: row.company_name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        mobile: row.mobile,
        address: row.address,
        preferredContactMethod: row.preferred_contact_method,
        paymentHistory: [], // Will be populated separately
        profile: row.profile,
        tags: row.tags,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      logger.error(`Failed to get customer ${customerId}:`, error);
      return null;
    }
  }

  private async getPaymentHistory(customerId: string): Promise<PaymentRecord[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - this.ANALYSIS_PARAMS.paymentHistoryMonths);

      const result = await this.dbService.query(
        `SELECT * FROM payment_records 
         WHERE customer_id = $1 AND created_at >= $2 
         ORDER BY due_date DESC`,
        [customerId, cutoffDate]
      );

      return result.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        currency: row.currency,
        dueDate: row.due_date,
        paidDate: row.paid_date,
        status: row.status,
        invoiceNumber: row.invoice_number,
        description: row.description
      }));

    } catch (error) {
      logger.error(`Failed to get payment history for ${customerId}:`, error);
      return [];
    }
  }

  private async getCommunicationHistory(customerId: string): Promise<ContactAttempt[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - this.ANALYSIS_PARAMS.communicationHistoryMonths);

      const result = await this.dbService.query(
        `SELECT ca.* FROM contact_attempts ca
         JOIN tasks t ON ca.task_id = t.id
         WHERE t.customer_id = $1 AND ca.timestamp >= $2
         ORDER BY ca.timestamp DESC`,
        [customerId, cutoffDate]
      );

      return result.rows.map(row => ({
        id: row.id,
        taskId: row.task_id,
        agentId: row.agent_id,
        channel: row.channel,
        timestamp: row.timestamp,
        status: row.status,
        response: row.response,
        duration: row.duration,
        metadata: row.metadata
      }));

    } catch (error) {
      logger.error(`Failed to get communication history for ${customerId}:`, error);
      return [];
    }
  }

  private analyzeBehavior(paymentHistory: PaymentRecord[], communicationHistory: ContactAttempt[]): BehaviorAnalysis {
    const analysis: BehaviorAnalysis = {
      averagePaymentDelay: this.calculateAveragePaymentDelay(paymentHistory),
      paymentPatterns: this.identifyPaymentPatterns(paymentHistory),
      responseRate: this.calculateResponseRate(communicationHistory),
      preferredContactTimes: this.analyzeContactTimePreferences(communicationHistory),
      communicationStyle: this.determineCommunicationStyle(communicationHistory),
      escalationTendency: this.assessEscalationTendency(communicationHistory),
      seasonalTrends: this.identifySeasonalTrends(paymentHistory)
    };

    return analysis;
  }

  private calculateAveragePaymentDelay(paymentHistory: PaymentRecord[]): number {
    const paidRecords = paymentHistory.filter(record => record.paidDate && record.status === 'paid');
    
    if (paidRecords.length === 0) {
      return 0;
    }

    const totalDelay = paidRecords.reduce((sum, record) => {
      const dueDate = new Date(record.dueDate);
      const paidDate = new Date(record.paidDate!);
      const delayDays = Math.max(0, (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + delayDays;
    }, 0);

    return Math.round(totalDelay / paidRecords.length);
  }

  private identifyPaymentPatterns(paymentHistory: PaymentRecord[]): PaymentPattern[] {
    if (paymentHistory.length < this.ANALYSIS_PARAMS.minDataPointsForAnalysis) {
      return [];
    }

    const patterns: PaymentPattern[] = [];
    
    // Analyze early payments
    const earlyCount = paymentHistory.filter(r => r.paidDate && new Date(r.paidDate) < new Date(r.dueDate)).length;
    const earlyFreq = earlyCount / paymentHistory.length;
    
    if (earlyFreq > 0.3) {
      patterns.push({
        pattern: 'early',
        frequency: earlyFreq,
        confidence: Math.min(earlyFreq * 2, 1),
        trend: this.calculateTrend(paymentHistory, 'early')
      });
    }

    // Analyze on-time payments
    const onTimeCount = paymentHistory.filter(r => {
      if (!r.paidDate) return false;
      const paidDate = new Date(r.paidDate);
      const dueDate = new Date(r.dueDate);
      const diffDays = (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 3; // Within 3 days is considered on-time
    }).length;
    
    const onTimeFreq = onTimeCount / paymentHistory.length;
    if (onTimeFreq > 0.2) {
      patterns.push({
        pattern: 'ontime',
        frequency: onTimeFreq,
        confidence: Math.min(onTimeFreq * 1.5, 1),
        trend: this.calculateTrend(paymentHistory, 'ontime')
      });
    }

    // Analyze late payments
    const lateCount = paymentHistory.filter(r => {
      if (!r.paidDate) return r.status === 'overdue';
      const paidDate = new Date(r.paidDate);
      const dueDate = new Date(r.dueDate);
      return paidDate.getTime() > dueDate.getTime() + (3 * 24 * 60 * 60 * 1000); // More than 3 days late
    }).length;
    
    const lateFreq = lateCount / paymentHistory.length;
    if (lateFreq > 0.2) {
      patterns.push({
        pattern: 'late',
        frequency: lateFreq,
        confidence: Math.min(lateFreq * 1.5, 1),
        trend: this.calculateTrend(paymentHistory, 'late')
      });
    }

    // Analyze partial payments
    const partialCount = paymentHistory.filter(r => r.status === 'partial').length;
    const partialFreq = partialCount / paymentHistory.length;
    
    if (partialFreq > 0.1) {
      patterns.push({
        pattern: 'partial',
        frequency: partialFreq,
        confidence: Math.min(partialFreq * 3, 1),
        trend: this.calculateTrend(paymentHistory, 'partial')
      });
    }

    return patterns;
  }

  private calculateTrend(paymentHistory: PaymentRecord[], pattern: string): 'improving' | 'stable' | 'declining' {
    if (paymentHistory.length < 6) return 'stable';

    const recentHistory = paymentHistory.slice(0, Math.floor(paymentHistory.length / 2));
    const olderHistory = paymentHistory.slice(Math.floor(paymentHistory.length / 2));

    let recentScore = 0;
    let olderScore = 0;

    // Score based on pattern type
    for (const record of recentHistory) {
      recentScore += this.scorePaymentForPattern(record, pattern);
    }

    for (const record of olderHistory) {
      olderScore += this.scorePaymentForPattern(record, pattern);
    }

    const recentAvg = recentScore / recentHistory.length;
    const olderAvg = olderScore / olderHistory.length;

    if (recentAvg > olderAvg * 1.2) return 'improving';
    if (recentAvg < olderAvg * 0.8) return 'declining';
    return 'stable';
  }

  private scorePaymentForPattern(record: PaymentRecord, pattern: string): number {
    if (!record.paidDate && pattern !== 'late') return 0;

    const dueDate = new Date(record.dueDate);
    const paidDate = record.paidDate ? new Date(record.paidDate) : new Date();
    const diffDays = (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);

    switch (pattern) {
      case 'early':
        return diffDays < 0 ? 1 : 0;
      case 'ontime':
        return diffDays >= 0 && diffDays <= 3 ? 1 : 0;
      case 'late':
        return diffDays > 3 || !record.paidDate ? 1 : 0;
      case 'partial':
        return record.status === 'partial' ? 1 : 0;
      default:
        return 0;
    }
  }

  private calculateResponseRate(communicationHistory: ContactAttempt[]): number {
    if (communicationHistory.length === 0) return 0;

    const responseCount = communicationHistory.filter(attempt => 
      attempt.status === 'replied' || attempt.status === 'answered'
    ).length;

    return responseCount / communicationHistory.length;
  }

  private analyzeContactTimePreferences(communicationHistory: ContactAttempt[]): TimePreference[] {
    const timePreferences: Map<string, { attempts: number; responses: number; channel: ContactMethod }> = new Map();

    for (const attempt of communicationHistory) {
      const timestamp = new Date(attempt.timestamp);
      const dayOfWeek = timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = timestamp.getHours();
      const timeSlot = `${dayOfWeek}-${Math.floor(hour / 4) * 4}-${Math.floor(hour / 4) * 4 + 4}`; // 4-hour slots

      const key = `${timeSlot}-${attempt.channel}`;
      const existing = timePreferences.get(key) || { attempts: 0, responses: 0, channel: attempt.channel };
      
      existing.attempts++;
      if (attempt.status === 'replied' || attempt.status === 'answered') {
        existing.responses++;
      }
      
      timePreferences.set(key, existing);
    }

    const preferences: TimePreference[] = [];
    for (const [key, data] of timePreferences) {
      const [daySlot, channel] = key.split('-');
      const [dayOfWeek, startHour, endHour] = daySlot.split('-');
      
      if (data.attempts >= 2) { // Only include if we have enough data
        preferences.push({
          dayOfWeek,
          hourRange: { start: parseInt(startHour), end: parseInt(endHour) },
          responseRate: data.responses / data.attempts,
          channel: channel as ContactMethod
        });
      }
    }

    return preferences.sort((a, b) => b.responseRate - a.responseRate).slice(0, 5); // Top 5 preferences
  }

  private determineCommunicationStyle(communicationHistory: ContactAttempt[]): CommunicationStyle {
    // Analyze response patterns to determine communication style preference
    // This is a simplified implementation - in practice, this would use NLP
    
    const responseAttempts = communicationHistory.filter(attempt => 
      attempt.response && attempt.response.length > 10
    );

    if (responseAttempts.length === 0) {
      return CommunicationStyle.FORMAL; // Default
    }

    // Simple heuristics based on response characteristics
    let formalityScore = 0;
    let directnessScore = 0;

    for (const attempt of responseAttempts) {
      const response = attempt.response!.toLowerCase();
      
      // Formality indicators
      if (response.includes('dear') || response.includes('sincerely') || response.includes('regards')) {
        formalityScore += 2;
      }
      if (response.includes('please') || response.includes('thank you')) {
        formalityScore += 1;
      }
      if (response.includes('yeah') || response.includes('ok') || response.includes('sure')) {
        formalityScore -= 1;
      }

      // Directness indicators
      if (response.length < 50) {
        directnessScore += 1;
      }
      if (response.includes('yes') || response.includes('no') || response.includes('will pay')) {
        directnessScore += 1;
      }
    }

    const avgFormality = formalityScore / responseAttempts.length;
    const avgDirectness = directnessScore / responseAttempts.length;

    if (avgFormality >= 1) {
      return CommunicationStyle.FORMAL;
    } else if (avgDirectness >= 1) {
      return CommunicationStyle.DIRECT;
    } else if (avgFormality >= 0) {
      return CommunicationStyle.DIPLOMATIC;
    } else {
      return CommunicationStyle.CASUAL;
    }
  }

  private assessEscalationTendency(communicationHistory: ContactAttempt[]): 'low' | 'medium' | 'high' {
    const totalAttempts = communicationHistory.length;
    if (totalAttempts === 0) return 'low';

    // Count escalation indicators
    const escalationIndicators = communicationHistory.filter(attempt => 
      attempt.metadata?.escalated === true ||
      attempt.response?.toLowerCase().includes('manager') ||
      attempt.response?.toLowerCase().includes('lawyer') ||
      attempt.response?.toLowerCase().includes('dispute')
    ).length;

    const escalationRate = escalationIndicators / totalAttempts;

    if (escalationRate >= 0.3) return 'high';
    if (escalationRate >= 0.1) return 'medium';
    return 'low';
  }

  private identifySeasonalTrends(paymentHistory: PaymentRecord[]): SeasonalTrend[] {
    // Simplified seasonal analysis
    const seasonalData = new Map<string, { payments: number; late: number }>();

    for (const record of paymentHistory) {
      const month = new Date(record.dueDate).getMonth();
      let season: string;
      
      if (month >= 2 && month <= 4) season = 'Spring';
      else if (month >= 5 && month <= 7) season = 'Summer';
      else if (month >= 8 && month <= 10) season = 'Fall';
      else season = 'Winter';

      const existing = seasonalData.get(season) || { payments: 0, late: 0 };
      existing.payments++;
      
      if (!record.paidDate || new Date(record.paidDate) > new Date(record.dueDate)) {
        existing.late++;
      }
      
      seasonalData.set(season, existing);
    }

    const trends: SeasonalTrend[] = [];
    for (const [season, data] of seasonalData) {
      if (data.payments >= 3) { // Only if we have enough data
        const lateRate = data.late / data.payments;
        const overallLateRate = paymentHistory.filter(r => 
          !r.paidDate || new Date(r.paidDate) > new Date(r.dueDate)
        ).length / paymentHistory.length;

        let behavior: 'better' | 'worse' | 'same' = 'same';
        let riskModifier = 0;

        if (lateRate < overallLateRate * 0.8) {
          behavior = 'better';
          riskModifier = -0.1;
        } else if (lateRate > overallLateRate * 1.2) {
          behavior = 'worse';
          riskModifier = 0.1;
        }

        trends.push({
          period: season,
          paymentBehavior: behavior,
          riskModifier
        });
      }
    }

    return trends;
  }

  private assessRisk(
    customer: Customer,
    paymentHistory: PaymentRecord[],
    communicationHistory: ContactAttempt[],
    behaviorAnalysis: BehaviorAnalysis
  ): RiskAssessment {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Payment history factor (40%)
    const latePaymentRate = paymentHistory.filter(r => 
      !r.paidDate || new Date(r.paidDate) > new Date(r.dueDate)
    ).length / Math.max(paymentHistory.length, 1);
    
    const paymentScore = Math.max(0, Math.min(100, latePaymentRate * 100));
    factors.push({
      factor: 'Payment History',
      weight: this.ANALYSIS_PARAMS.riskScoreWeights.paymentHistory,
      impact: 'negative',
      value: paymentScore,
      description: `${Math.round(latePaymentRate * 100)}% late payment rate`
    });
    totalScore += paymentScore * this.ANALYSIS_PARAMS.riskScoreWeights.paymentHistory;

    // Communication response factor (20%)
    const responseScore = Math.max(0, (1 - behaviorAnalysis.responseRate) * 100);
    factors.push({
      factor: 'Communication Response',
      weight: this.ANALYSIS_PARAMS.riskScoreWeights.communicationResponse,
      impact: 'negative',
      value: responseScore,
      description: `${Math.round(behaviorAnalysis.responseRate * 100)}% response rate`
    });
    totalScore += responseScore * this.ANALYSIS_PARAMS.riskScoreWeights.communicationResponse;

    // Average payment delay factor (within payment history weight)
    const delayScore = Math.min(100, behaviorAnalysis.averagePaymentDelay * 2);
    factors.push({
      factor: 'Payment Delays',
      weight: this.ANALYSIS_PARAMS.riskScoreWeights.paymentHistory * 0.3,
      impact: 'negative',
      value: delayScore,
      description: `Average ${behaviorAnalysis.averagePaymentDelay} days late`
    });
    totalScore += delayScore * this.ANALYSIS_PARAMS.riskScoreWeights.paymentHistory * 0.3;

    // Escalation tendency factor (10%)
    const escalationScore = behaviorAnalysis.escalationTendency === 'high' ? 80 :
                           behaviorAnalysis.escalationTendency === 'medium' ? 40 : 10;
    factors.push({
      factor: 'Escalation Tendency',
      weight: this.ANALYSIS_PARAMS.riskScoreWeights.escalationHistory,
      impact: 'negative',
      value: escalationScore,
      description: `${behaviorAnalysis.escalationTendency} escalation tendency`
    });
    totalScore += escalationScore * this.ANALYSIS_PARAMS.riskScoreWeights.escalationHistory;

    // Account age factor (10%) - newer accounts are higher risk
    const accountAge = (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30); // months
    const ageScore = Math.max(0, Math.min(100, (12 - accountAge) * 10));
    factors.push({
      factor: 'Account Age',
      weight: this.ANALYSIS_PARAMS.riskScoreWeights.accountAge,
      impact: 'negative',
      value: ageScore,
      description: `${Math.round(accountAge)} months old`
    });
    totalScore += ageScore * this.ANALYSIS_PARAMS.riskScoreWeights.accountAge;

    // Determine risk level
    let currentRisk: RiskLevel;
    if (totalScore >= 75) currentRisk = RiskLevel.CRITICAL;
    else if (totalScore >= 60) currentRisk = RiskLevel.HIGH;
    else if (totalScore >= 40) currentRisk = RiskLevel.MEDIUM;
    else currentRisk = RiskLevel.LOW;

    // Generate prediction
    const prediction = this.generateRiskPrediction(totalScore, behaviorAnalysis);

    return {
      currentRisk,
      riskScore: Math.round(totalScore),
      factors,
      prediction,
      mitigation: this.generateMitigationStrategies(totalScore, factors, behaviorAnalysis)
    };
  }

  private generateRiskPrediction(riskScore: number, behaviorAnalysis: BehaviorAnalysis): RiskPrediction {
    // Next payment likelihood
    const basePaymentLikelihood = Math.max(0.1, 1 - (riskScore / 100));
    const paymentLikelihood = Math.min(0.95, basePaymentLikelihood + (behaviorAnalysis.responseRate * 0.2));

    // Escalation probability
    const escalationMultiplier = behaviorAnalysis.escalationTendency === 'high' ? 0.8 :
                                behaviorAnalysis.escalationTendency === 'medium' ? 0.4 : 0.1;
    const escalationProbability = Math.min(0.9, (riskScore / 100) * escalationMultiplier);

    // Collection difficulty
    let collectionDifficulty: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
    if (riskScore < 30) collectionDifficulty = 'easy';
    else if (riskScore < 50) collectionDifficulty = 'moderate';
    else if (riskScore < 75) collectionDifficulty = 'difficult';
    else collectionDifficulty = 'very_difficult';

    // Estimated collection time
    const baseCollectionTime = behaviorAnalysis.averagePaymentDelay || 0;
    const riskMultiplier = 1 + (riskScore / 100);
    const estimatedCollectionTime = Math.round(baseCollectionTime * riskMultiplier + (riskScore / 10));

    return {
      nextPaymentLikelihood: Math.round(paymentLikelihood * 100) / 100,
      escalationProbability: Math.round(escalationProbability * 100) / 100,
      collectionDifficulty,
      estimatedCollectionTime
    };
  }

  private generateMitigationStrategies(riskScore: number, factors: RiskFactor[], behaviorAnalysis: BehaviorAnalysis): string[] {
    const strategies: string[] = [];

    // Based on risk level
    if (riskScore >= 75) {
      strategies.push('Consider immediate phone contact and payment plan options');
      strategies.push('Escalate to senior collections specialist');
      strategies.push('Document all communications for potential legal action');
    } else if (riskScore >= 60) {
      strategies.push('Increase contact frequency and use multiple channels');
      strategies.push('Offer payment plan or settlement options');
    } else if (riskScore >= 40) {
      strategies.push('Send formal notice before escalating');
      strategies.push('Use preferred communication channel and time');
    }

    // Based on specific factors
    const highFactors = factors.filter(f => f.value > 60);
    for (const factor of highFactors) {
      switch (factor.factor) {
        case 'Communication Response':
          strategies.push('Try alternative contact methods or times');
          strategies.push('Consider reaching out to alternative contacts');
          break;
        case 'Payment History':
          strategies.push('Review account for any billing errors or disputes');
          strategies.push('Offer payment plan to establish payment pattern');
          break;
        case 'Escalation Tendency':
          strategies.push('Use diplomatic communication style');
          strategies.push('Prepare detailed account documentation');
          break;
      }
    }

    // Based on behavioral analysis
    if (behaviorAnalysis.preferredContactTimes.length > 0) {
      const bestTime = behaviorAnalysis.preferredContactTimes[0];
      strategies.push(`Contact during preferred time: ${bestTime.dayOfWeek} ${bestTime.hourRange.start}:00-${bestTime.hourRange.end}:00 via ${bestTime.channel}`);
    }

    if (behaviorAnalysis.communicationStyle !== CommunicationStyle.FORMAL) {
      strategies.push(`Adapt communication style to: ${behaviorAnalysis.communicationStyle}`);
    }

    return Array.from(new Set(strategies)); // Remove duplicates
  }

  private generateRecommendations(
    customer: Customer,
    behaviorAnalysis: BehaviorAnalysis,
    riskAssessment: RiskAssessment
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Communication channel recommendation
    if (behaviorAnalysis.preferredContactTimes.length > 0) {
      const bestChannel = behaviorAnalysis.preferredContactTimes[0];
      recommendations.push({
        type: 'communication',
        priority: riskAssessment.currentRisk === RiskLevel.HIGH ? 'high' : 'medium',
        action: `Use ${bestChannel.channel} communication on ${bestChannel.dayOfWeek}`,
        reason: `Customer has ${Math.round(bestChannel.responseRate * 100)}% response rate for this channel/time`,
        expectedOutcome: 'Increased response likelihood',
        confidence: bestChannel.responseRate
      });
    }

    // Timing recommendation
    const currentHour = new Date().getHours();
    const preferredTimes = behaviorAnalysis.preferredContactTimes.filter(pt => 
      currentHour >= pt.hourRange.start && currentHour < pt.hourRange.end
    );

    if (preferredTimes.length === 0 && behaviorAnalysis.preferredContactTimes.length > 0) {
      const nextBestTime = behaviorAnalysis.preferredContactTimes[0];
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        action: `Wait until ${nextBestTime.hourRange.start}:00 to contact`,
        reason: 'Customer responds better during specific time windows',
        expectedOutcome: 'Better response rate',
        confidence: nextBestTime.responseRate * 0.8
      });
    }

    // Strategy recommendation based on risk
    if (riskAssessment.currentRisk === RiskLevel.CRITICAL) {
      recommendations.push({
        type: 'escalation',
        priority: 'urgent',
        action: 'Escalate to senior collections and consider legal options',
        reason: `Critical risk score: ${riskAssessment.riskScore}`,
        expectedOutcome: 'Formal resolution process',
        confidence: 0.7
      });
    } else if (riskAssessment.currentRisk === RiskLevel.HIGH) {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        action: 'Offer payment plan or settlement discount',
        reason: 'High risk customer may benefit from flexible payment options',
        expectedOutcome: 'Partial or full payment',
        confidence: 0.6
      });
    }

    // Pattern-based recommendations
    const latePattern = behaviorAnalysis.paymentPatterns.find(p => p.pattern === 'late');
    if (latePattern && latePattern.frequency > 0.5) {
      recommendations.push({
        type: 'strategy',
        priority: 'medium',
        action: 'Set up automated reminders before due date',
        reason: 'Customer has consistent late payment pattern',
        expectedOutcome: 'Reduced payment delays',
        confidence: latePattern.confidence * 0.7
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private startPeriodicRefresh(): void {
    // Refresh contexts periodically to keep them current
    setInterval(async () => {
      try {
        // Clear expired contexts from memory cache
        const now = Date.now();
        for (const [customerId, context] of this.contextCache) {
          if ((now - context.lastUpdated.getTime()) > this.cacheExpiryMs) {
            this.contextCache.delete(customerId);
          }
        }

        logger.debug(`Context cache cleanup completed. Active contexts: ${this.contextCache.size}`);
      } catch (error) {
        logger.error('Error during context cache cleanup:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async invalidateCustomerContext(customerId: string): Promise<void> {
    try {
      this.contextCache.delete(customerId);
      await this.redisService.del(`context:${customerId}`);
      logger.info(`Invalidated context for customer: ${customerId}`);
    } catch (error) {
      logger.error(`Failed to invalidate context for customer ${customerId}:`, error);
    }
  }

  async getContextStats(): Promise<any> {
    return {
      memoryCacheSize: this.contextCache.size,
      cacheExpiryMs: this.cacheExpiryMs,
      analysisParams: this.ANALYSIS_PARAMS,
      isInitialized: this.isInitialized
    };
  }

  async shutdown(): Promise<void> {
    try {
      this.contextCache.clear();
      this.isInitialized = false;
      logger.info('Context Engine shut down successfully');
    } catch (error) {
      logger.error('Error shutting down Context Engine:', error);
    }
  }
}