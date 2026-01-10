/**
 * Base Provider Adapter
 * Abstract base class for LLM provider adapters
 */

import { logger } from '@/utils/logger';
import {
  CompletionRequest,
  CompletionResponse,
  ProviderAdapter,
  LLMProvider,
  LLMError,
  RetryConfig,
} from '@/types/llm';

export abstract class BaseAdapter implements ProviderAdapter {
  protected provider: LLMProvider;
  protected apiKey: string;
  protected baseUrl?: string;
  protected retryConfig: RetryConfig;

  constructor(
    provider: LLMProvider,
    apiKey: string,
    baseUrl?: string,
    retryConfig?: RetryConfig
  ) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.retryConfig = retryConfig || this.getDefaultRetryConfig();
  }

  /**
   * Generate completion with retry logic
   */
  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    let lastError: LLMError | null = null;
    let attempt = 0;

    while (attempt <= this.retryConfig.maxRetries) {
      try {
        const startTime = Date.now();
        const response = await this.executeCompletion(request);
        const latency = Date.now() - startTime;

        logger.info(`LLM completion successful`, {
          provider: this.provider,
          model: response.model,
          tokens: response.usage.totalTokens,
          latency,
          attempt,
        });

        return response;
      } catch (error: any) {
        lastError = this.normalizeError(error);
        
        if (!this.shouldRetry(lastError, attempt)) {
          logger.error(`LLM completion failed (no retry)`, {
            provider: this.provider,
            error: lastError,
            attempt,
          });
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        logger.warn(`LLM completion failed, retrying in ${delay}ms`, {
          provider: this.provider,
          error: lastError.message,
          attempt,
        });

        await this.sleep(delay);
        attempt++;
      }
    }

    logger.error(`LLM completion failed after ${attempt} attempts`, {
      provider: this.provider,
      error: lastError,
    });
    throw lastError;
  }

  /**
   * Stream completion with retry logic
   */
  async *streamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    let attempt = 0;
    let lastError: LLMError | null = null;

    while (attempt <= this.retryConfig.maxRetries) {
      try {
        const generator = this.executeStreamCompletion(request);
        
        for await (const chunk of generator) {
          yield chunk;
        }
        
        logger.info(`LLM stream completion successful`, {
          provider: this.provider,
          attempt,
        });
        
        return;
      } catch (error: any) {
        lastError = this.normalizeError(error);
        
        if (!this.shouldRetry(lastError, attempt)) {
          logger.error(`LLM stream completion failed (no retry)`, {
            provider: this.provider,
            error: lastError,
            attempt,
          });
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        logger.warn(`LLM stream completion failed, retrying in ${delay}ms`, {
          provider: this.provider,
          error: lastError.message,
          attempt,
        });

        await this.sleep(delay);
        attempt++;
      }
    }

    logger.error(`LLM stream completion failed after ${attempt} attempts`, {
      provider: this.provider,
      error: lastError,
    });
    throw lastError;
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract executeCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  protected abstract executeStreamCompletion(request: CompletionRequest): AsyncGenerator<string>;
  public abstract countTokens(text: string, model: string): Promise<number>;
  public abstract getCostPerToken(model: string): { input: number; output: number };

  /**
   * Normalize errors from different providers
   */
  protected normalizeError(error: any): LLMError {
    const llmError: LLMError = {
      code: error.code || 'unknown_error',
      message: error instanceof Error ? error.message : String(error) || 'An unknown error occurred',
      provider: this.provider,
      model: error.model,
      retryable: false,
      details: error,
    };

    // Check if error is retryable
    if (
      error.code === 'rate_limit_exceeded' ||
      error.code === 'server_error' ||
      error.code === 'timeout' ||
      error.code === 'network_error' ||
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504
    ) {
      llmError.retryable = true;
    }

    return llmError;
  }

  /**
   * Determine if error should be retried
   */
  protected shouldRetry(error: LLMError, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    if (!error.retryable) {
      return false;
    }

    if (this.retryConfig.retryableErrors.length > 0) {
      return this.retryConfig.retryableErrors.includes(error.code);
    }

    return true;
  }

  /**
   * Calculate exponential backoff delay
   */
  protected calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Default retry configuration
   */
  protected getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'rate_limit_exceeded',
        'server_error',
        'timeout',
        'network_error',
      ],
    };
  }

  /**
   * Validate API key
   */
  protected validateApiKey(): void {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error(`API key is required for ${this.provider} provider`);
    }
  }

  /**
   * Get provider name
   */
  getProvider(): LLMProvider {
    return this.provider;
  }
}
