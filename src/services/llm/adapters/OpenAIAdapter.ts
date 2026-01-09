/**
 * OpenAI Provider Adapter
 * Adapter for OpenAI API (GPT-4, GPT-3.5, etc.)
 */

import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';
import { BaseAdapter } from './BaseAdapter';
import { logger } from '@/utils/logger';
import {
  CompletionRequest,
  CompletionResponse,
  LLMProvider,
  OpenAIModel,
  TokenUsage,
} from '@/types/llm';

export class OpenAIAdapter extends BaseAdapter {
  private client: OpenAI;

  constructor(apiKey: string, organization?: string, baseUrl?: string) {
    super(LLMProvider.OPENAI, apiKey, baseUrl);
    this.validateApiKey();

    this.client = new OpenAI({
      apiKey: this.apiKey,
      organization,
      baseURL: this.baseUrl,
    });

    logger.info('OpenAI adapter initialized', {
      organization,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Execute completion request
   */
  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const { messages, options } = request;
    
    const model = (options?.model as OpenAIModel) || OpenAIModel.GPT4_TURBO;
    
    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      top_p: options?.topP ?? 1,
      frequency_penalty: options?.frequencyPenalty ?? 0,
      presence_penalty: options?.presencePenalty ?? 0,
      stop: options?.stop,
      stream: false,
    });

    const choice = response.choices[0];
    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    return {
      content: choice.message.content || '',
      model: response.model,
      provider: LLMProvider.OPENAI,
      usage,
      finishReason: choice.finish_reason,
      metadata: {
        id: response.id,
        created: response.created,
        systemFingerprint: response.system_fingerprint,
      },
    };
  }

  /**
   * Execute streaming completion request
   */
  protected async *executeStreamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    const { messages, options } = request;
    
    const model = (options?.model as OpenAIModel) || OpenAIModel.GPT4_TURBO;
    
    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      top_p: options?.topP ?? 1,
      frequency_penalty: options?.frequencyPenalty ?? 0,
      presence_penalty: options?.presencePenalty ?? 0,
      stop: options?.stop,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Count tokens using tiktoken
   */
  async countTokens(text: string, model: string): Promise<number> {
    try {
      const encoding = encoding_for_model(model as any);
      const tokens = encoding.encode(text);
      encoding.free();
      return tokens.length;
    } catch (error) {
      // Fallback to rough estimation if model not supported
      logger.warn(`Token counting failed for model ${model}, using estimation`, { error });
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get cost per token for different models
   * Prices as of January 2026 (approximate)
   */
  getCostPerToken(model: string): { input: number; output: number } {
    const costs: Record<string, { input: number; output: number }> = {
      [OpenAIModel.GPT4]: {
        input: 0.03 / 1000,
        output: 0.06 / 1000,
      },
      [OpenAIModel.GPT4_TURBO]: {
        input: 0.01 / 1000,
        output: 0.03 / 1000,
      },
      [OpenAIModel.GPT4_O]: {
        input: 0.005 / 1000,
        output: 0.015 / 1000,
      },
      [OpenAIModel.GPT35_TURBO]: {
        input: 0.0005 / 1000,
        output: 0.0015 / 1000,
      },
    };

    return costs[model] || costs[OpenAIModel.GPT4_TURBO];
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
