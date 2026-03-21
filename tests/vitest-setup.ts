import { vi } from 'vitest';

vi.mock('@dracon/wxt-shared/byok', () => ({
  chatCompletion: vi.fn().mockImplementation(async (_messages: any, _key: string, options?: any) => {
    return {
      content: 'Mocked response from wxt-shared',
      model: options?.model || 'openrouter/free',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };
  }),
  chatWithOpenRouter: vi.fn().mockResolvedValue('Mocked response'),
  byokStore: {
    getValue: vi.fn().mockResolvedValue({ enabled: false, openrouter_key: '', openrouter_model: 'openrouter/free' }),
    setValue: vi.fn(),
  },
  testConnection: vi.fn().mockResolvedValue({ success: true, model: 'openrouter/free' }),
  validateKey: vi.fn().mockResolvedValue(true),
  isValidApiKey: vi.fn().mockReturnValue(true),
  getModels: vi.fn().mockResolvedValue([
    { id: 'openrouter/free', name: 'Free Router', provider: 'openrouter' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' },
  ]),
  defaultBYOKStore: { enabled: false, openrouter_key: '', openrouter_model: 'openrouter/free' },
  getBYOKConfig: vi.fn().mockResolvedValue({ enabled: false, openrouter_key: '', openrouter_model: 'openrouter/free' }),
  setBYOKConfig: vi.fn(),
  enableBYOK: vi.fn(),
  disableBYOK: vi.fn(),
  isBYOKEnabled: vi.fn().mockResolvedValue(false),
  hasValidKey: vi.fn().mockResolvedValue(false),
}));
