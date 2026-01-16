/**
 * LLM Provider Service
 * Unified interface for multiple LLM providers (OpenAI, Anthropic, Google, Ollama)
 */

import { createLogger, Logger } from '@/utils/logger';

/**
 * Supported LLM providers
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  OLLAMA = 'ollama'
}

/**
 * Message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Completion options
 */
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  provider: LLMProvider;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
}

/**
 * LLM Provider interface
 */
interface ILLMProvider {
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse>;
  embed(text: string): Promise<EmbeddingResponse>;
  listModels(): Promise<string[]>;
  isAvailable(): boolean;
}

/**
 * OpenAI Provider
 */
class OpenAIProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: Logger;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview';
    this.logger = createLogger('OpenAIProvider');
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stop: options.stopSequences
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json() as any;
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      provider: LLMProvider.OPENAI,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices[0].finish_reason
    };
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings error: ${await response.text()}`);
    }

    const data = await response.json() as any;
    
    return {
      embedding: data.data[0].embedding,
      model: 'text-embedding-3-small',
      provider: LLMProvider.OPENAI
    };
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    if (!response.ok) return [];

    const data = await response.json() as any;
    return data.data
      .filter((m: any) => m.id.startsWith('gpt'))
      .map((m: any) => m.id);
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }
}

/**
 * Anthropic Provider
 */
class AnthropicProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: Logger;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.defaultModel = config.defaultModel || 'claude-3-sonnet-20240229';
    this.logger = createLogger('AnthropicProvider');
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    // Anthropic uses a different format - system message is separate
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 4096,
        system: systemMessage?.content,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        stop_sequences: options.stopSequences
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json() as any;
    
    return {
      content: data.content[0].text,
      model: data.model,
      provider: LLMProvider.ANTHROPIC,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined,
      finishReason: data.stop_reason
    };
  }

  async embed(_text: string): Promise<EmbeddingResponse> {
    // Anthropic doesn't have embeddings API - use alternative
    throw new Error('Anthropic does not support embeddings. Use OpenAI or another provider.');
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ];
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }
}

/**
 * Google AI (Gemini) Provider
 */
class GoogleProvider implements ILLMProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: Logger;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultModel = config.defaultModel || 'gemini-1.5-pro';
    this.logger = createLogger('GoogleProvider');
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    const model = options.model || this.defaultModel;
    
    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system');
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? {
            parts: [{ text: systemInstruction.content }]
          } : undefined,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens,
            topP: options.topP,
            stopSequences: options.stopSequences
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${error}`);
    }

    const data = await response.json() as any;
    
    return {
      content: data.candidates[0].content.parts[0].text,
      model,
      provider: LLMProvider.GOOGLE,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined,
      finishReason: data.candidates[0].finishReason
    };
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(
      `${this.baseUrl}/models/text-embedding-004:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google embeddings error: ${await response.text()}`);
    }

    const data = await response.json() as any;
    
    return {
      embedding: data.embedding.values,
      model: 'text-embedding-004',
      provider: LLMProvider.GOOGLE
    };
  }

  async listModels(): Promise<string[]> {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ];
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }
}

/**
 * Ollama Provider (Local)
 */
class OllamaProvider implements ILLMProvider {
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: Logger;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'llama3';
    this.logger = createLogger('OllamaProvider');
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens,
          top_p: options.topP,
          stop: options.stopSequences
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json() as any;
    
    return {
      content: data.message.content,
      model: data.model,
      provider: LLMProvider.OLLAMA,
      usage: data.prompt_eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: data.prompt_eval_count + data.eval_count
      } : undefined
    };
  }

  async embed(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings error: ${await response.text()}`);
    }

    const data = await response.json() as any;
    
    return {
      embedding: data.embedding,
      model: 'nomic-embed-text',
      provider: LLMProvider.OLLAMA
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json() as any;
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  isAvailable(): boolean {
    // Ollama is available if running locally
    return true;
  }
}

/**
 * LLM Provider Service - Unified Interface
 */
export class LLMProviderService {
  private static instance: LLMProviderService | null = null;
  
  private readonly providers: Map<LLMProvider, ILLMProvider> = new Map();
  private activeProvider: LLMProvider;
  private readonly logger: Logger;

  private constructor() {
    this.logger = createLogger('LLMProviderService');
    this.activeProvider = LLMProvider.OPENAI;
    this.initializeProviders();
  }

  static getInstance(): LLMProviderService {
    if (!LLMProviderService.instance) {
      LLMProviderService.instance = new LLMProviderService();
    }
    return LLMProviderService.instance;
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set(LLMProvider.OPENAI, new OpenAIProvider({
        provider: LLMProvider.OPENAI
      }));
      this.logger.info('OpenAI provider initialized');
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set(LLMProvider.ANTHROPIC, new AnthropicProvider({
        provider: LLMProvider.ANTHROPIC
      }));
      this.logger.info('Anthropic provider initialized');
    }

    // Google
    if (process.env.GOOGLE_API_KEY) {
      this.providers.set(LLMProvider.GOOGLE, new GoogleProvider({
        provider: LLMProvider.GOOGLE
      }));
      this.logger.info('Google AI provider initialized');
    }

    // Ollama (always try to initialize)
    this.providers.set(LLMProvider.OLLAMA, new OllamaProvider({
      provider: LLMProvider.OLLAMA
    }));
    this.logger.info('Ollama provider initialized');

    // Set first available as active
    const available = this.getAvailableProviders();
    if (available.length > 0 && !this.providers.get(this.activeProvider)?.isAvailable()) {
      this.activeProvider = available[0];
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([type, _]) => type);
  }

  /**
   * Set active provider
   */
  setActiveProvider(provider: LLMProvider): void {
    const p = this.providers.get(provider);
    if (!p || !p.isAvailable()) {
      throw new Error(`Provider ${provider} is not available`);
    }
    this.activeProvider = provider;
    this.logger.info('Active LLM provider changed', { provider });
  }

  /**
   * Get active provider
   */
  getActiveProvider(): LLMProvider {
    return this.activeProvider;
  }

  /**
   * Complete with active provider
   */
  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`No provider configured for ${this.activeProvider}`);
    }
    return provider.complete(messages, options);
  }

  /**
   * Complete with specific provider
   */
  async completeWith(
    providerType: LLMProvider,
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not configured`);
    }
    return provider.complete(messages, options);
  }

  /**
   * Get embeddings with active provider
   */
  async embed(text: string): Promise<EmbeddingResponse> {
    // Try active provider first, fall back to OpenAI for embeddings
    let provider = this.providers.get(this.activeProvider);
    
    if (this.activeProvider === LLMProvider.ANTHROPIC) {
      // Anthropic doesn't support embeddings, use OpenAI
      provider = this.providers.get(LLMProvider.OPENAI);
      if (!provider) {
        throw new Error('No embedding-capable provider available');
      }
    }

    if (!provider) {
      throw new Error(`No provider configured for embeddings`);
    }

    return provider.embed(text);
  }

  /**
   * List models for active provider
   */
  async listModels(): Promise<string[]> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) return [];
    return provider.listModels();
  }

  /**
   * List models for specific provider
   */
  async listModelsFor(providerType: LLMProvider): Promise<string[]> {
    const provider = this.providers.get(providerType);
    if (!provider) return [];
    return provider.listModels();
  }

  /**
   * Simple text generation helper
   */
  async generate(
    prompt: string,
    options?: CompletionOptions
  ): Promise<string> {
    const response = await this.complete([
      { role: 'user', content: prompt }
    ], options);
    return response.content;
  }

  /**
   * Chat with system prompt
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    options?: CompletionOptions
  ): Promise<string> {
    const response = await this.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], options);
    return response.content;
  }

  /**
   * Try multiple providers with fallback
   */
  async completeWithFallback(
    messages: ChatMessage[],
    options?: CompletionOptions,
    providers?: LLMProvider[]
  ): Promise<CompletionResponse> {
    const providerList = providers || this.getAvailableProviders();
    
    for (const providerType of providerList) {
      try {
        return await this.completeWith(providerType, messages, options);
      } catch (error) {
        this.logger.warn(`Provider ${providerType} failed, trying next`, { error });
      }
    }

    throw new Error('All providers failed');
  }
}

/**
 * Get singleton instance
 */
export function getLLMProviderService(): LLMProviderService {
  return LLMProviderService.getInstance();
}
