import { vi } from 'vitest';
import { createBYOKMockModule } from '../../wxt-shared/src/testing/byok';

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      },
    },
  },
}));

vi.mock('wxt/utils/storage', () => ({
  storage: {
    defineItem: vi.fn(() => ({
      getValue: vi.fn(async () => ({})),
      setValue: vi.fn(async () => undefined),
    })),
  },
}));

vi.mock('@wxt-dev/storage', () => ({
  storage: {
    defineItem: vi.fn(() => ({
      getValue: vi.fn(async () => ({})),
      setValue: vi.fn(async () => undefined),
    })),
  },
}));

vi.mock('@dracon/wxt-shared/byok', () => createBYOKMockModule({
  chatContent: 'Mocked response from wxt-shared',
}, vi.fn));
