import { vi } from 'vitest';
import { createBYOKMockModule } from '@dracon/wxt-shared/testing/byok';

vi.mock('@dracon/wxt-shared/byok', () => createBYOKMockModule({
  chatContent: 'Mocked response from wxt-shared',
}, vi.fn));
