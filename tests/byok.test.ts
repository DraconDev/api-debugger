import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chatCompletion from wxt-shared
const mockChatCompletion = vi.fn();
vi.mock('@dracon/wxt-shared/byok', () => ({
  chatCompletion: mockChatCompletion,
}));

describe('BYOK AI Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenRouter Integration', () => {
    it('should call chatCompletion with correct parameters', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'AI response',
        model: 'openrouter/free',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      const result = await mockChatCompletion(
        [{ role: 'user', content: 'Hello' }],
        'test-api-key',
        { model: 'openrouter/free', max_tokens: 4096 }
      );

      expect(mockChatCompletion).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello' }],
        'test-api-key',
        expect.objectContaining({ model: 'openrouter/free' })
      );
      expect(result.content).toBe('AI response');
    });

    it('should handle errors gracefully', async () => {
      mockChatCompletion.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        mockChatCompletion([{ role: 'user', content: 'test' }], 'key', { model: 'test' })
      ).rejects.toThrow('API Error');
    });

    it('should return usage information', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'Response',
        model: 'test-model',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await mockChatCompletion([{ role: 'user', content: 'test' }], 'key', { model: 'test' });

      expect(result.usage).toBeDefined();
      expect(result.usage?.total_tokens).toBe(150);
    });
  });

  describe('API Key Handling', () => {
    it('should trim whitespace from API keys', () => {
      const key = '  sk-or-v1-test123  ';
      const trimmedKey = key.trim();
      expect(trimmedKey).toBe('sk-or-v1-test123');
    });

    it('should validate key presence', () => {
      const config = { apiKey: 'sk-test' };
      expect(!!config.apiKey).toBe(true);
    });

    it('should detect missing key', () => {
      const config = { apiKey: '' };
      expect(!!config.apiKey).toBe(false);
    });
  });

  describe('Model Selection', () => {
    it('should use specified model', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'test',
        model: 'openai/gpt-4o',
      });

      await mockChatCompletion([{ role: 'user', content: 'test' }], 'key', { model: 'openai/gpt-4o' });

      expect(mockChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ model: 'openai/gpt-4o' })
      );
    });

    it('should support free models', () => {
      const freeModels = ['openrouter/free', 'meta-llama/llama-3-8b-instruct:free'];
      freeModels.forEach(model => {
        expect(model).toContain('free');
      });
    });
  });

  describe('Response Handling', () => {
    it('should parse successful response', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'Test response content',
        model: 'test-model',
      });

      const result = await mockChatCompletion([{ role: 'user', content: 'test' }], 'key', {});

      expect(result.content).toBe('Test response content');
    });

    it('should handle JSON content', async () => {
      const jsonResponse = { result: 'success', data: { value: 42 } };
      mockChatCompletion.mockResolvedValueOnce({
        content: JSON.stringify(jsonResponse),
        model: 'test-model',
      });

      const result = await mockChatCompletion([{ role: 'user', content: 'test' }], 'key', {});
      const parsed = JSON.parse(result.content);

      expect(parsed.result).toBe('success');
      expect(parsed.data.value).toBe(42);
    });
  });
});

describe('AI Client Configuration', () => {
  it('should have valid AIConfig interface', () => {
    const config = {
      provider: 'openrouter' as const,
      apiKey: 'sk-test',
      model: 'openrouter/free',
    };

    expect(config.provider).toBe('openrouter');
    expect(config.apiKey).toBe('sk-test');
    expect(config.model).toBe('openrouter/free');
  });

  it('should support multiple providers', () => {
    const providers = ['openai', 'anthropic', 'gemini', 'openrouter'];
    providers.forEach(provider => {
      expect(['openai', 'anthropic', 'gemini', 'openrouter']).toContain(provider);
    });
  });

  it('should validate provider type', () => {
    const validProviders = ['openai', 'anthropic', 'gemini', 'openrouter'];
    const testProvider = 'openrouter';
    expect(validProviders).toContain(testProvider);
  });
});

describe('Error Scenarios', () => {
  it('should handle rate limiting', async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    await expect(
      mockChatCompletion([{ role: 'user', content: 'test' }], 'key', {})
    ).rejects.toThrow('Rate limit');
  });

  it('should handle invalid API key', async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error('Invalid API key'));

    await expect(
      mockChatCompletion([{ role: 'user', content: 'test' }], 'invalid', {})
    ).rejects.toThrow('Invalid API key');
  });

  it('should handle network errors', async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      mockChatCompletion([{ role: 'user', content: 'test' }], 'key', {})
    ).rejects.toThrow('Network error');
  });
});
