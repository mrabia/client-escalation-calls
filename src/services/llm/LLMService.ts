/**
 * LLM Service
 * Main service for LLM operations with multi-provider support
 */

import { logger } from '@/utils/logger';
import { config } from '@/config';
import { OpenAIAdapter } from './adapters/OpenAIAdapter';
import { AnthropicAdapter } from './adapters/AnthropicAdapter';
import { GoogleAdapter } from './adapters/GoogleAdapter';
import {
  LLMProvider,
  LLMModel,
  ChatMessage,
  GenerationOptions,
  LLMRequest,
  LLMResponse,
  CompletionRequest,
  ProviderAdapter,
  LLMError,
  CostInfo,
} from '@/types/llm';

export class LLMService {
  private adapters: Map<LLMProvider, ProviderAdapter>;
  private defaultProvider: LLMProvider;
  private fallbackChain: LLMProvider[];
  private requestCache: Map<string, LLMResponse>;
  private usageStats: Map<string, any>;

  constructor() {
    this.adapters = new Map();
    this.requestCache = new Map();
    this.usageStats = new Map();
    this.defaultProvider = LLMProvider.OPENAI;
    this.fallbackChain = [
      LLMProvider.OPENAI,
      LLMProvider.ANTHROPIC,
      LLMProvider.GOOGLE,
    ];

    this.initializeAdapters();
  }

  /**
   * Initialize provider adapters
   */
  private initializeAdapters(): void {
    // Initialize OpenAI
    if (config.ai.openai.apiKey) {
      try {
        const adapter = new OpenAIAdapter(config.ai.openai.apiKey);
        this.adapters.set(LLMProvider.OPENAI, adapter);
        logger.info('OpenAI adapter registered');
      } catch (error) {
        logger.error('Failed to initialize OpenAI adapter', { error });
      }
    }

    // Initialize Anthropic
    if (config.ai.anthropic.apiKey) {
      try {
        const adapter = new AnthropicAdapter(config.ai.anthropic.apiKey);
        this.adapters.set(LLMProvider.ANTHROPIC, adapter);
        logger.info('Anthropic adapter registered');
      } catch (error) {
        logger.error('Failed to initialize Anthropic adapter', { error });
      }
    }

    // Initialize Google AI
    if (config.ai.google.apiKey) {
      try {
        const adapter = new GoogleAdapter(config.ai.google.apiKey);
        this.adapters.set(LLMProvider.GOOGLE, adapter);
        logger.info('Google AI adapter registered');
      } catch (error) {
        logger.error('Failed to initialize Google AI adapter', { error });
      }
    }

    if (this.adapters.size === 0) {
      logger.warn('No LLM providers configured. Set API keys in environment variables.');
    }
  }

  /**
   * Generate text completion
   */
  async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ];

    const response = await this.chat(messages, options);
    return response.content;
  }

  /**
   * Chat completion
   */
  async chat(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = this.getCacheKey(messages, options);
    if (config.features.aiGeneration && this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey)!;
      logger.info('Returning cached LLM response', { cacheKey });
      return { ...cached, cached: true };
    }

    // Determine provider
    const provider = this.getProviderForModel(options?.model);
    
    // Execute with fallback
    const response = await this.executeWithFallback(
      { messages, options },
      provider
    );

    // Calculate cost
    const adapter = this.adapters.get(response.provider)!;
    const costPerToken = adapter.getCostPerToken(response.model);
    const cost: CostInfo = {
      inputCostPerToken: costPerToken.input,
      outputCostPerToken: costPerToken.output,
      totalCost:
        response.usage.promptTokens * costPerToken.input +
        response.usage.completionTokens * costPerToken.output,
    };

    const latency = Date.now() - startTime;

    const llmResponse: LLMResponse = {
      content: response.content,
      usage: response.usage,
      cost,
      model: response.model,
      provider: response.provider,
      latency,
      cached: false,
      metadata: response.metadata,
    };

    // Cache response
    if (config.features.aiGeneration) {
      this.requestCache.set(cacheKey, llmResponse);
    }

    // Track usage
    this.trackUsage(llmResponse);

    return llmResponse;
  }

  /**
   * Stream chat completion
   */
  async *streamChat(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): AsyncGenerator<string> {
    const provider = this.getProviderForModel(options?.model);
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const request: CompletionRequest = { messages, options };
    
    try {
      for await (const chunk of adapter.streamCompletion(request)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Stream completion failed', { provider, error });
      throw error;
    }
  }

  /**
   * Execute request with fallback chain
   */
  private async executeWithFallback(
    request: CompletionRequest,
    preferredProvider: LLMProvider
  ): Promise<any> {
    // Try preferred provider first
    const providers = [
      preferredProvider,
      ...this.fallbackChain.filter(p => p !== preferredProvider),
    ];

    let lastError: LLMError | null = null;

    for (const provider of providers) {
      const adapter = this.adapters.get(provider);
      
      if (!adapter) {
        logger.warn(`Provider ${provider} not configured, skipping`);
        continue;
      }

      try {
        logger.info(`Attempting completion with ${provider}`);
        const response = await adapter.generateCompletion(request);
        return response;
      } catch (error: any) {
        lastError = error;
        logger.warn(`Provider ${provider} failed, trying next`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.error('All providers failed', { lastError });
    throw lastError || new Error('All LLM providers failed');
  }

  /**
   * Get provider for a specific model
   */
  private getProviderForModel(model?: LLMModel): LLMProvider {
    if (!model) {
      return this.defaultProvider;
    }

    const modelStr = model.toString();
    
    if (modelStr.startsWith('gpt')) {
      return LLMProvider.OPENAI;
    } else if (modelStr.startsWith('claude')) {
      return LLMProvider.ANTHROPIC;
    } else if (modelStr.startsWith('gemini')) {
      return LLMProvider.GOOGLE;
    }

    return this.defaultProvider;
  }

  /**
   * Count tokens
   */
  async countTokens(text: string, model?: string): Promise<number> {
    const provider = this.getProviderForModel(model as LLMModel);
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      // Fallback to rough estimation
      return Math.ceil(text.length / 4);
    }

    return adapter.countTokens(text, model || 'gpt-4');
  }

  /**
   * Estimate cost
   */
  async estimateCost(
    text: string,
    model?: string,
    outputTokens?: number
  ): Promise<number> {
    const provider = this.getProviderForModel(model as LLMModel);
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      return 0;
    }

    const inputTokens = await this.countTokens(text, model);
    const estimatedOutputTokens = outputTokens || inputTokens * 0.5;
    
    const costPerToken = adapter.getCostPerToken(model || 'gpt-4');
    
    return (
      inputTokens * costPerToken.input +
      estimatedOutputTokens * costPerToken.output
    );
  }

  /**
   * Generate cache key
   */
  private getCacheKey(messages: ChatMessage[], options?: GenerationOptions): string {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    const optionsStr = JSON.stringify(options || {});
    return `${content}:${optionsStr}`;
  }

  /**
   * Track usage statistics
   */
  private trackUsage(response: LLMResponse): void {
    const key = `${response.provider}:${response.model}`;
    
    if (!this.usageStats.has(key)) {
      this.usageStats.set(key, {
        requests: 0,
        totalTokens: 0,
        totalCost: 0,
        totalLatency: 0,
      });
    }

    const stats = this.usageStats.get(key)!;
    stats.requests++;
    stats.totalTokens += response.usage.totalTokens;
    stats.totalCost += response.cost.totalCost;
    stats.totalLatency += response.latency;

    logger.debug('Usage tracked', {
      provider: response.provider,
      model: response.model,
      tokens: response.usage.totalTokens,
      cost: response.cost.totalCost,
    });
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): Map<string, any> {
    return new Map(this.usageStats);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
    logger.info('LLM cache cleared');
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: LLMProvider): boolean {
    return this.adapters.has(provider);
  }
}

// Export singleton instance
export const llmService = new LLMService();
