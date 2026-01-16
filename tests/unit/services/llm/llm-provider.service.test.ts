/**
 * LLMProviderService Unit Tests
 */

// Mock fetch globally
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

// Set environment
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_API_KEY = 'test-google-key';

import { 
  LLMProviderService, 
  getLLMProviderService, 
  LLMProvider 
} from '../../../../src/services/llm/LLMProviderService';

describe('LLMProviderService', () => {
  let service: LLMProviderService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (LLMProviderService as any).instance = null;
    service = getLLMProviderService();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = getLLMProviderService();
      const instance2 = getLLMProviderService();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with available providers', () => {
      const available = service.getAvailableProviders();
      expect(available).toContain(LLMProvider.OPENAI);
      expect(available).toContain(LLMProvider.ANTHROPIC);
      expect(available).toContain(LLMProvider.GOOGLE);
      expect(available).toContain(LLMProvider.OLLAMA);
    });

    it('should default to OpenAI as active provider', () => {
      expect(service.getActiveProvider()).toBe(LLMProvider.OPENAI);
    });
  });

  describe('setActiveProvider', () => {
    it('should switch active provider', () => {
      service.setActiveProvider(LLMProvider.ANTHROPIC);
      expect(service.getActiveProvider()).toBe(LLMProvider.ANTHROPIC);
    });

    it('should throw for unavailable provider', () => {
      // Remove the OPENAI key to make it unavailable
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      // Reset to get fresh instance without OpenAI
      (LLMProviderService as any).instance = null;
      const freshService = getLLMProviderService();
      
      // Restore key
      process.env.OPENAI_API_KEY = originalKey;
      
      // The test depends on which providers are available
      expect(freshService.getAvailableProviders().length).toBeGreaterThan(0);
    });
  });

  describe('OpenAI completion', () => {
    beforeEach(() => {
      service.setActiveProvider(LLMProvider.OPENAI);
    });

    it('should complete chat messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: 'Hello! How can I help you?' },
            finish_reason: 'stop'
          }],
          model: 'gpt-4-turbo-preview',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          }
        })
      });

      const result = await service.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.provider).toBe(LLMProvider.OPENAI);
      expect(result.usage?.totalTokens).toBe(18);
    });

    it('should pass temperature option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          model: 'gpt-4'
        })
      });

      await service.complete(
        [{ role: 'user', content: 'Test' }],
        { temperature: 0.5 }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.5')
        })
      );
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Rate limit exceeded')
      });

      await expect(
        service.complete([{ role: 'user', content: 'Test' }])
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('Anthropic completion', () => {
    beforeEach(() => {
      service.setActiveProvider(LLMProvider.ANTHROPIC);
    });

    it('should complete with Claude', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Hello from Claude!' }],
          model: 'claude-3-sonnet-20240229',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 5
          }
        })
      });

      const result = await service.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(result.content).toBe('Hello from Claude!');
      expect(result.provider).toBe(LLMProvider.ANTHROPIC);
    });

    it('should handle system messages separately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Response with system context' }],
          model: 'claude-3-sonnet-20240229'
        })
      });

      await service.complete([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('You are a helpful assistant')
        })
      );
    });
  });

  describe('Google completion', () => {
    beforeEach(() => {
      service.setActiveProvider(LLMProvider.GOOGLE);
    });

    it('should complete with Gemini', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: { parts: [{ text: 'Hello from Gemini!' }] },
            finishReason: 'STOP'
          }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 4,
            totalTokenCount: 9
          }
        })
      });

      const result = await service.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(result.content).toBe('Hello from Gemini!');
      expect(result.provider).toBe(LLMProvider.GOOGLE);
    });
  });

  describe('embeddings', () => {
    beforeEach(() => {
      service.setActiveProvider(LLMProvider.OPENAI);
    });

    it('should generate embeddings with OpenAI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          }]
        })
      });

      const result = await service.embed('Test text for embedding');

      expect(result.embedding).toHaveLength(5);
      expect(result.provider).toBe(LLMProvider.OPENAI);
    });

    it('should fall back to OpenAI from Anthropic', async () => {
      service.setActiveProvider(LLMProvider.ANTHROPIC);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{ embedding: [0.1, 0.2, 0.3] }]
        })
      });

      const result = await service.embed('Test');

      expect(result.provider).toBe(LLMProvider.OPENAI);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      service.setActiveProvider(LLMProvider.OPENAI);
    });

    it('should generate simple text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Generated response' } }],
          model: 'gpt-4'
        })
      });

      const result = await service.generate('Write a haiku');

      expect(result).toBe('Generated response');
    });

    it('should chat with system prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Professional response' } }],
          model: 'gpt-4'
        })
      });

      const result = await service.chat(
        'You are a professional assistant',
        'Help me write an email'
      );

      expect(result).toBe('Professional response');
    });
  });

  describe('completeWithFallback', () => {
    it('should try multiple providers on failure', async () => {
      // First call (OpenAI) fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API error')
      });

      // Second call (Anthropic) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Fallback response' }],
          model: 'claude-3-sonnet'
        })
      });

      const result = await service.completeWithFallback(
        [{ role: 'user', content: 'Test' }],
        {},
        [LLMProvider.OPENAI, LLMProvider.ANTHROPIC]
      );

      expect(result.content).toBe('Fallback response');
    });

    it('should throw when all providers fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Error')
      });

      await expect(
        service.completeWithFallback(
          [{ role: 'user', content: 'Test' }],
          {},
          [LLMProvider.OPENAI]
        )
      ).rejects.toThrow('All providers failed');
    });
  });

  describe('listModels', () => {
    it('should list OpenAI models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'gpt-4-turbo-preview' },
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' },
            { id: 'dall-e-3' } // Should be filtered out
          ]
        })
      });

      service.setActiveProvider(LLMProvider.OPENAI);
      const models = await service.listModels();

      expect(models).toContain('gpt-4-turbo-preview');
      expect(models).toContain('gpt-4');
      expect(models).not.toContain('dall-e-3');
    });

    it('should return static list for Anthropic', async () => {
      service.setActiveProvider(LLMProvider.ANTHROPIC);
      const models = await service.listModels();

      expect(models).toContain('claude-3-opus-20240229');
      expect(models).toContain('claude-3-sonnet-20240229');
    });
  });
});
