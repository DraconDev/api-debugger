import { vi } from 'vitest';

export const chatCompletion = vi.fn().mockImplementation(async (_messages: any, _key: string, options?: any) => {
  return {
    content: 'Mocked response from wxt-shared',
    model: options?.model || 'openrouter/free',
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  };
});

export const chatWithOpenRouter = vi.fn().mockResolvedValue('Mocked response');

export const byokStore = {
  getValue: vi.fn().mockResolvedValue({ enabled: false, openrouter_key: '', openrouter_model: 'openrouter/free' }),
  setValue: vi.fn(),
};

export const testConnection = vi.fn().mockResolvedValue({ success: true, model: 'openrouter/free' });
export const validateKey = vi.fn().mockResolvedValue(true);
export const isValidApiKey = vi.fn().mockReturnValue(true);

export const getModels = vi.fn().mockResolvedValue([
  { id: 'openrouter/free', name: 'Free Router', provider: 'openrouter' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' },
]);

export const defaultBYOKStore = { enabled: false, openrouter_key: '', openrouter_model: 'openrouter/free' };
export const getBYOKConfig = vi.fn().mockResolvedValue(defaultBYOKStore);
export const setBYOKConfig = vi.fn();
export const enableBYOK = vi.fn();
export const disableBYOK = vi.fn();
export const isBYOKEnabled = vi.fn().mockResolvedValue(false);
export const hasValidKey = vi.fn().mockResolvedValue(false);
