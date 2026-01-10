/**
 * Anthropic Provider Adapter
 * Adapter for Anthropic API (Claude models)
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAdapter } from './BaseAdapter';
import { logger } from '@/utils/logger';
import {
  CompletionRequest,
  CompletionResponse,
  LLMProvider,
  AnthropicModel,
  TokenUsage,
  ChatMessage,
} from '@/types/llm';

export class AnthropicAdapter extends BaseAdapter {
  private client: Anthropic;

  constructor(apiKey: string, baseUrl?: string) {
    super(LLMProvider.ANTHROPIC, apiKey, baseUrl);
    this.validateApiKey();

    this.client = new Anthropic({
      apiKey: this.apiKey,
      ...(this.baseUrl && { baseURL: this.baseUrl }),
    });

    logger.info('Anthropic adapter initialized', {
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Execute completion request
   */
  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const { messages, options } = request;
    
    const model = (options?.model as AnthropicModel) || AnthropicModel.CLAUDE_3_SONNET;
    
    // Separate system message from other messages
    const { systemMessage, conversationMessages } = this.prepareMessages(messages);
    
    const response = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 1,
      ...(systemMessage && { system: systemMessage }),
      messages: conversationMessages,
      ...(options?.stop && { stop_sequences: options.stop }),
    });

    const usage: TokenUsage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    return {
      content,
      model: response.model,
      provider: LLMProvider.ANTHROPIC,
      usage,
      finishReason: response.stop_reason || 'complete',
      metadata: {
        id: response.id,
        role: response.role,
      },
    };
  }

  /**
   * Execute streaming completion request
   */
  protected async *executeStreamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    const { messages, options } = request;
    
    const model = (options?.model as AnthropicModel) || AnthropicModel.CLAUDE_3_SONNET;
    
    const { systemMessage, conversationMessages } = this.prepareMessages(messages);
    
    const stream = await this.client.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 1,
      ...(systemMessage && { system: systemMessage }),
      messages: conversationMessages,
      ...(options?.stop && { stop_sequences: options.stop }),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  /**
   * Prepare messages for Anthropic API
   * Anthropic requires system message to be separate
   */
  private prepareMessages(messages: ChatMessage[]): {
    systemMessage?: string;
    conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = systemMessages.length > 0
      ? systemMessages.map(m => m.content).join('\n\n')
      : undefined;

    return { systemMessage, conversationMessages };
  }

  /**
   * Count tokens (rough estimation for Anthropic)
   * Anthropic doesn't provide a public tokenizer
   */
  async countTokens(text: string, model: string): Promise<number> {
    // Rough estimation: ~4 characters per token
    // This is less accurate than OpenAI's tiktoken but sufficient for estimation
    return Math.ceil(text.length / 4);
  }

  /**
   * Get cost per token for different Claude models
   * Prices as of January 2026 (approximate)
   */
  getCostPerToken(model: string): { input: number; output: number } {
    const costs: Record<string, { input: number; output: number }> = {
      [AnthropicModel.CLAUDE_3_OPUS]: {
        input: 0.015 / 1000,
        output: 0.075 / 1000,
      },
      [AnthropicModel.CLAUDE_3_SONNET]: {
        input: 0.003 / 1000,
        output: 0.015 / 1000,
      },
      [AnthropicModel.CLAUDE_3_HAIKU]: {
        input: 0.00025 / 1000,
        output: 0.00125 / 1000,
      },
    };

    return costs[model] || costs[AnthropicModel.CLAUDE_3_SONNET];
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
