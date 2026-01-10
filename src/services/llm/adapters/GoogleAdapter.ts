/**
 * Google AI Provider Adapter
 * Adapter for Google Generative AI API (Gemini models)
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseAdapter } from './BaseAdapter';
import { logger } from '@/utils/logger';
import {
  CompletionRequest,
  CompletionResponse,
  LLMProvider,
  GoogleModel,
  TokenUsage,
  ChatMessage,
} from '@/types/llm';

export class GoogleAdapter extends BaseAdapter {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super(LLMProvider.GOOGLE, apiKey);
    this.validateApiKey();

    this.client = new GoogleGenerativeAI(this.apiKey);

    logger.info('Google AI adapter initialized');
  }

  /**
   * Execute completion request
   */
  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const { messages, options } = request;
    
    const modelName = (options?.model as GoogleModel) || GoogleModel.GEMINI_2_PRO_EXP;
    const model = this.getModel(modelName, options);
    
    // Prepare messages for Gemini
    const { systemInstruction, conversationHistory, lastUserMessage } = 
      this.prepareMessages(messages);
    
    // Start chat with history
    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        topP: options?.topP ?? 0.95,
        maxOutputTokens: options?.maxTokens ?? 8192,
        ...(options?.stop && { stopSequences: options.stop }),
      },
    });

    // Send the last user message
    const result = await chat.sendMessage(lastUserMessage);
    const response = result.response;
    
    const text = response.text();
    
    // Get token counts
    const usage: TokenUsage = {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    };

    return {
      content: text,
      model: modelName,
      provider: LLMProvider.GOOGLE,
      usage,
      finishReason: response.candidates?.[0]?.finishReason || 'STOP',
      metadata: {
        safetyRatings: response.candidates?.[0]?.safetyRatings,
      },
    };
  }

  /**
   * Execute streaming completion request
   */
  protected async *executeStreamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    const { messages, options } = request;
    
    const modelName = (options?.model as GoogleModel) || GoogleModel.GEMINI_2_PRO_EXP;
    const model = this.getModel(modelName, options);
    
    const { systemInstruction, conversationHistory, lastUserMessage } = 
      this.prepareMessages(messages);
    
    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        topP: options?.topP ?? 0.95,
        maxOutputTokens: options?.maxTokens ?? 8192,
        ...(options?.stop && { stopSequences: options.stop }),
      },
    });

    const result = await chat.sendMessageStream(lastUserMessage);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  /**
   * Get model instance with configuration
   */
  private getModel(modelName: string, options?: any): GenerativeModel {
    // Extract system instruction from messages if present
    const systemInstruction = options?.systemPrompt;
    
    return this.client.getGenerativeModel({
      model: modelName,
      ...(systemInstruction && { systemInstruction }),
    });
  }

  /**
   * Prepare messages for Gemini API
   * Gemini uses a different message format
   */
  private prepareMessages(messages: ChatMessage[]): {
    systemInstruction?: string;
    conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }>;
    lastUserMessage: string;
  } {
    // Extract system message
    const systemMessages = messages.filter(m => m.role === 'system');
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map(m => m.content).join('\n\n')
      : undefined;

    // Convert conversation messages to Gemini format
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    // Get last user message
    const lastUserMessage = conversationMessages[conversationMessages.length - 1]?.content || '';
    
    // Convert history (all messages except the last one)
    const conversationHistory = conversationMessages
      .slice(0, -1)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    return {
      systemInstruction,
      conversationHistory,
      lastUserMessage,
    };
  }

  /**
   * Count tokens using Gemini's count tokens API
   */
  async countTokens(text: string, model: string): Promise<number> {
    try {
      const modelInstance = this.client.getGenerativeModel({ model });
      const result = await modelInstance.countTokens(text);
      return result.totalTokens;
    } catch (error) {
      // Fallback to rough estimation
      logger.warn(`Token counting failed for model ${model}, using estimation`, { error });
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get cost per token for different Gemini models
   * Prices as of January 2026 (approximate)
   */
  getCostPerToken(model: string): { input: number; output: number } {
    const costs: Record<string, { input: number; output: number }> = {
      [GoogleModel.GEMINI_2_PRO_EXP]: {
        input: 0.00125 / 1000,
        output: 0.005 / 1000,
      },
      [GoogleModel.GEMINI_2_FLASH_EXP]: {
        input: 0.0001 / 1000,
        output: 0.0004 / 1000,
      },
      [GoogleModel.GEMINI_15_PRO]: {
        input: 0.00125 / 1000,
        output: 0.005 / 1000,
      },
      [GoogleModel.GEMINI_15_FLASH]: {
        input: 0.000075 / 1000,
        output: 0.0003 / 1000,
      },
    };

    return costs[model] || costs[GoogleModel.GEMINI_2_PRO_EXP];
  }

  /**
   * Calculate cost for a completion
   */
  calculateCost(usage: TokenUsage, model: string): number {
    const costs = this.getCostPerToken(model);
    return (
      usage.promptTokens * costs.input +
      usage.completionTokens * costs.output
    );
  }
}
