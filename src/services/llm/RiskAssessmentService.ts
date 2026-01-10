/**
 * Risk Assessment Service
 * AI-powered customer risk analysis and strategy recommendation
 */

import { logger } from '@/utils/logger';
import { llmService } from './LLMService';
import {
  RiskAssessmentRequest,
  RiskAssessmentResponse,
  StrategyRecommendationRequest,
  StrategyRecommendationResponse,
  ChatMessage,
  GoogleModel,
} from '@/types/llm';

export class RiskAssessmentService {
  /**
   * Assess customer payment risk
   */
  async assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
    const startTime = Date.now();
    
    logger.info('Assessing customer risk', {
      customerId: request.customerId,
    });

    // Build prompt for risk assessment
    const messages = this.buildRiskAssessmentPrompt(request);

    // Use Gemini 2.0 Pro Exp for maximum precision in risk analysis
    const response = await llmService.chat(messages, {
      model: GoogleModel.GEMINI_2_PRO_EXP,
      temperature: 0.1, // Low temperature for precision
      topP: 0.95,
      maxTokens: 8192,
    });

    // Parse the risk assessment response
    const assessment = this.parseRiskAssessment(response.content);

    const result: RiskAssessmentResponse = {
      ...assessment,
      metadata: {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        cost: response.cost.totalCost,
        generatedAt: new Date(),
      },
    };

    const latency = Date.now() - startTime;
    logger.info('Risk assessment completed', {
      customerId: request.customerId,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      tokens: response.usage.totalTokens,
      latency,
    });

    return result;
  }

  /**
   * Build risk assessment prompt
   */
  private buildRiskAssessmentPrompt(request: RiskAssessmentRequest): ChatMessage[] {
    const { customerId, paymentHistory, communicationHistory, businessData, context } = request;

    const systemPrompt = `You are an expert financial risk analyst specializing in B2B payment collection. Your task is to analyze customer data and provide a comprehensive risk assessment.

**Analysis Framework:**

1. **Payment Behavior Analysis**
   - Historical payment patterns
   - Average days to pay
   - Payment consistency
   - Recent payment trends

2. **Communication Response Analysis**
   - Response rate to contact attempts
   - Tone and engagement level
   - Commitment follow-through
   - Escalation patterns

3. **Business Health Indicators**
   - Industry conditions
   - Company size and stability
   - Market position
   - Economic factors

4. **Risk Factors**
   - Current overdue amount
   - Days past due
   - Previous collection issues
   - Dispute history

**Risk Scoring:**
- 0-25: Low Risk (Likely to pay, minimal intervention needed)
- 26-50: Medium-Low Risk (May need gentle reminders)
- 51-75: Medium-High Risk (Requires active collection efforts)
- 76-100: High/Critical Risk (Significant collection challenges)

**Output Requirements:**
Provide a structured analysis in JSON format:
{
  "riskScore": number (0-100),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "keyFactors": ["factor1", "factor2", ...],
  "positiveIndicators": ["indicator1", "indicator2", ...],
  "negativeIndicators": ["indicator1", "indicator2", ...],
  "recommendedStrategy": "detailed strategy description",
  "predictedPaymentTimeline": "timeline estimate",
  "confidence": number (0-1)
}`;

    const userPrompt = this.buildRiskAnalysisContext(request);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Build detailed context for risk analysis
   */
  private buildRiskAnalysisContext(request: RiskAssessmentRequest): string {
    const { paymentHistory, communicationHistory, businessData, context } = request;

    let prompt = `Analyze the following customer for payment risk:\n\n`;

    // Customer information
    prompt += `**Customer Profile:**\n`;
    prompt += `- Customer ID: ${request.customerId}\n`;
    prompt += `- Name: ${context.customerName || 'Unknown'}\n`;
    prompt += `- Company: ${context.companyName || 'Unknown'}\n`;
    prompt += `- Industry: ${context.industry || 'Unknown'}\n`;
    prompt += `- Company Size: ${context.companySize || 'Unknown'}\n`;
    prompt += `\n`;

    // Current situation
    prompt += `**Current Situation:**\n`;
    prompt += `- Outstanding Amount: $${context.outstandingAmount?.toLocaleString() || '0'}\n`;
    prompt += `- Days Past Due: ${context.daysPastDue || 0} days\n`;
    prompt += `- Previous Contact Attempts: ${context.previousAttempts || 0}\n`;
    prompt += `\n`;

    // Payment history
    if (paymentHistory && paymentHistory.length > 0) {
      prompt += `**Payment History (Last ${paymentHistory.length} Payments):**\n`;
      paymentHistory.slice(0, 10).forEach((payment, index) => {
        prompt += `${index + 1}. Amount: $${payment.amount?.toLocaleString() || '0'}, `;
        prompt += `Days to Pay: ${payment.daysToPay || 'N/A'}, `;
        prompt += `Status: ${payment.status || 'N/A'}\n`;
      });
      
      // Calculate payment statistics
      const paymentsWithDays = paymentHistory.filter(p => p.daysToPay);
      const avgDaysToPay = paymentsWithDays.length > 0
        ? paymentsWithDays.reduce((sum, p) => sum + p.daysToPay, 0) / paymentsWithDays.length
        : 0;
      const onTimePayments = paymentHistory.filter(p => p.daysToPay <= 30).length;
      const latePayments = paymentHistory.filter(p => p.daysToPay > 30).length;
      
      prompt += `\nPayment Statistics:\n`;
      prompt += `- Average Days to Pay: ${avgDaysToPay.toFixed(1)} days\n`;
      prompt += `- On-Time Payments: ${onTimePayments} (${paymentHistory.length > 0 ? ((onTimePayments/paymentHistory.length)*100).toFixed(1) : 0}%)\n`;
      prompt += `- Late Payments: ${latePayments} (${paymentHistory.length > 0 ? ((latePayments/paymentHistory.length)*100).toFixed(1) : 0}%)\n`;
      prompt += `\n`;
    }

    // Communication history
    if (communicationHistory && communicationHistory.length > 0) {
      prompt += `**Communication History (Last ${communicationHistory.length} Contacts):**\n`;
      communicationHistory.slice(0, 10).forEach((comm, index) => {
        prompt += `${index + 1}. Channel: ${comm.channel || 'N/A'}, `;
        prompt += `Date: ${comm.date || 'N/A'}, `;
        prompt += `Response: ${comm.responded ? 'Yes' : 'No'}, `;
        prompt += `Outcome: ${comm.outcome || 'N/A'}\n`;
      });
      
      // Calculate communication statistics
      const responseRate = communicationHistory.length > 0
        ? (communicationHistory.filter(c => c.responded).length / communicationHistory.length) * 100
        : 0;
      const commitmentsMade = communicationHistory.filter(c => c.commitmentMade).length;
      const commitmentsKept = communicationHistory.filter(c => c.commitmentKept).length;
      
      prompt += `\nCommunication Statistics:\n`;
      prompt += `- Response Rate: ${responseRate.toFixed(1)}%\n`;
      prompt += `- Commitments Made: ${commitmentsMade}\n`;
      prompt += `- Commitments Kept: ${commitmentsKept} (${commitmentsMade > 0 ? ((commitmentsKept/commitmentsMade)*100).toFixed(1) : 0}%)\n`;
      prompt += `\n`;
    }

    // Business data
    if (businessData) {
      prompt += `**Business Information:**\n`;
      if (businessData.revenue) prompt += `- Annual Revenue: $${businessData.revenue.toLocaleString()}\n`;
      if (businessData.employees) prompt += `- Employees: ${businessData.employees}\n`;
      if (businessData.yearsInBusiness) prompt += `- Years in Business: ${businessData.yearsInBusiness}\n`;
      if (businessData.creditRating) prompt += `- Credit Rating: ${businessData.creditRating}\n`;
      if (businessData.industryTrend) prompt += `- Industry Trend: ${businessData.industryTrend}\n`;
      prompt += `\n`;
    }

    prompt += `**Analysis Request:**\n`;
    prompt += `Please provide a comprehensive risk assessment including:\n`;
    prompt += `1. Overall risk score (0-100)\n`;
    prompt += `2. Risk level classification\n`;
    prompt += `3. Key risk factors\n`;
    prompt += `4. Positive indicators\n`;
    prompt += `5. Negative indicators\n`;
    prompt += `6. Recommended collection strategy\n`;
    prompt += `7. Predicted payment timeline\n`;
    prompt += `8. Confidence level in assessment\n\n`;
    prompt += `Provide the response in the specified JSON format.`;

    return prompt;
  }

  /**
   * Parse risk assessment from LLM response
   */
  private parseRiskAssessment(content: string): Omit<RiskAssessmentResponse, 'metadata'> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          riskScore: parsed.riskScore || 50,
          riskLevel: parsed.riskLevel || 'medium',
          keyFactors: parsed.keyFactors || [],
          positiveIndicators: parsed.positiveIndicators || [],
          negativeIndicators: parsed.negativeIndicators || [],
          recommendedStrategy: parsed.recommendedStrategy || 'Standard collection approach',
          predictedPaymentTimeline: parsed.predictedPaymentTimeline || 'Unknown',
          confidence: parsed.confidence || 0.5,
        };
      }
    } catch (error) {
      logger.warn('Failed to parse risk assessment JSON, using fallback', { error });
    }

    // Fallback parsing
    return {
      riskScore: 50,
      riskLevel: 'medium',
      keyFactors: ['Unable to parse detailed analysis'],
      positiveIndicators: [],
      negativeIndicators: [],
      recommendedStrategy: content.substring(0, 500),
      predictedPaymentTimeline: 'Unknown',
      confidence: 0.5,
    };
  }

  /**
   * Recommend collection strategy
   */
  async recommendStrategy(
    request: StrategyRecommendationRequest
  ): Promise<StrategyRecommendationResponse> {
    const startTime = Date.now();
    
    logger.info('Generating strategy recommendation', {
      customerId: request.customerId,
      riskLevel: request.riskAssessment.riskLevel,
    });

    const messages = this.buildStrategyPrompt(request);

    const response = await llmService.chat(messages, {
      model: GoogleModel.GEMINI_2_PRO_EXP,
      temperature: 0.2,
      topP: 0.95,
      maxTokens: 4096,
    });

    const strategy = this.parseStrategyRecommendation(response.content);

    const result: StrategyRecommendationResponse = {
      ...strategy,
      metadata: {
        model: response.model,
        provider: response.provider,
        tokens: response.usage.totalTokens,
        cost: response.cost.totalCost,
        generatedAt: new Date(),
      },
    };

    const latency = Date.now() - startTime;
    logger.info('Strategy recommendation generated', {
      customerId: request.customerId,
      recommendedChannel: strategy.recommendedChannel,
      tokens: response.usage.totalTokens,
      latency,
    });

    return result;
  }

  /**
   * Build strategy recommendation prompt
   */
  private buildStrategyPrompt(request: StrategyRecommendationRequest): ChatMessage[] {
    const { customerId, riskAssessment, context, availableChannels, constraints } = request;

    const systemPrompt = `You are an expert collection strategy consultant. Based on the risk assessment, recommend the optimal collection approach.

Consider:
- Customer's risk profile
- Available communication channels
- Historical response patterns
- Business relationship value
- Regulatory constraints

Provide recommendations in JSON format:
{
  "recommendedChannel": "email" | "phone" | "sms" | "letter",
  "recommendedTone": "friendly" | "professional" | "urgent" | "formal",
  "recommendedTiming": "immediate" | "morning" | "afternoon" | "end_of_week",
  "messageStrategy": "detailed strategy description",
  "alternativeApproaches": ["approach1", "approach2"],
  "expectedSuccessRate": number (0-100),
  "reasoning": "explanation of recommendation"
}`;

    const userPrompt = `Customer: ${context.customerName}
Outstanding: $${context.outstandingAmount}
Days Overdue: ${context.daysPastDue}

Risk Assessment:
- Risk Score: ${riskAssessment.riskScore}
- Risk Level: ${riskAssessment.riskLevel}
- Key Factors: ${riskAssessment.keyFactors.join(', ')}
- Recommended Strategy: ${riskAssessment.recommendedStrategy}

Available Channels: ${availableChannels.join(', ')}
${constraints ? `Constraints: ${constraints.join(', ')}` : ''}

Recommend the optimal collection strategy.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Parse strategy recommendation
   */
  private parseStrategyRecommendation(content: string): Omit<StrategyRecommendationResponse, 'metadata'> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          recommendedChannel: parsed.recommendedChannel || 'email',
          recommendedTone: parsed.recommendedTone || 'professional',
          recommendedTiming: parsed.recommendedTiming || 'morning',
          messageStrategy: parsed.messageStrategy || 'Standard approach',
          alternativeApproaches: parsed.alternativeApproaches || [],
          expectedSuccessRate: parsed.expectedSuccessRate || 50,
          reasoning: parsed.reasoning || 'Based on risk assessment',
        };
      }
    } catch (error) {
      logger.warn('Failed to parse strategy recommendation, using fallback', { error });
    }

    return {
      recommendedChannel: 'email',
      recommendedTone: 'professional',
      recommendedTiming: 'morning',
      messageStrategy: content.substring(0, 500),
      alternativeApproaches: [],
      expectedSuccessRate: 50,
      reasoning: 'Fallback recommendation',
    };
  }
}

// Export singleton instance
export const riskAssessmentService = new RiskAssessmentService();
