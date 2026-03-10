# WXT Starter Template for Momo

A modern, production-ready starter template for building Chrome extensions that integrate with **Momo** (the Dracon backend).

## Features

- ⚡ **WXT Framework** - Modern web extension toolkit with hot reload
- ⚛️ **React 19** - Latest React with TypeScript
- 🎨 **Tailwind CSS** - Utility-first styling
- 🔐 **Momo Auth** - OAuth integration with Momo/Dracon
- 📦 **Momo API Client** - Pre-configured for Momo's API structure
- 🧪 **Testing Ready** - Vitest configured
- 📱 **Type Safe** - Full TypeScript support

## Quick Start

```bash
# 1. Copy the starter template
cp -r wxt-starter my-new-extension
cd my-new-extension

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Momo settings

# 4. Start development
npm run dev
```

## Extension Constraints

Browser extensions have unique constraints. See [EXTENSION_CONSTRAINTS.md](./EXTENSION_CONSTRAINTS.md) for details.

Quick overview:
- **Content scripts** (running on web pages) cannot make direct API calls - they proxy through background script
- **OAuth** uses `chrome-extension://` URLs, not `https://`
- **Storage** uses `chrome.storage`, not `localStorage`

## Momo Integration

This starter is pre-configured to work with Momo:

### OAuth Flow

1. User clicks "Sign In" → calls `authFlow.openLogin()`
2. Momo handles Google OAuth
3. Momo redirects to extension with exchange code (`#code=xxx`)
4. Extension exchanges code for tokens via `POST /api/v1/auth/exchange`

### API Structure

The starter uses the reusable starter layer from `@dracon/wxt-shared/starter`.
That means your extension gets a prewired extension bundle plus starter-ready hooks.

The `apiClient` provides methods for Momo's API:

```typescript
// User info (includes subscription status)
const user = await apiClient.getUser();

// AI Chat Completions (OpenAI-compatible)
const response = await apiClient.chatCompletions({
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hello!' }
  ],
  project_id: 'my-project'
});

// Product-specific endpoints (if configured in Momo)
const userInfo = await apiClient.getProductUser('myproduct');
const chat = await apiClient.productChatCompletions('myproduct', { messages });
const sub = await apiClient.productSubscribe('myproduct', 'price_xxx');
```

## Project Structure

```
wxt-starter/
├── entrypoints/          # Extension entry points
│   ├── popup/           # Popup UI
│   ├── background.ts    # Service worker (handles API proxy)
│   ├── content.ts       # Content script
│   └── auth-callback/   # OAuth callback handler
├── components/          # React components
├── utils/              # Utilities
│   ├── api.ts         # Momo API client setup
│   └── store.ts       # Storage definitions
├── types/              # TypeScript types
├── lib/                # Helper functions
└── public/            # Static assets
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Momo Environment
VITE_APP_ENV=local          # local | stage | prod
WXT_DRACON_URL=http://localhost:8080
WXT_API_URL=http://localhost:8080

# Optional: Stripe price IDs for your extension
# WXT_STRIPE_PRICE_ID=price_xxx
```

### Customize for Your Extension

1. **Update `wxt.config.ts`**
   - Change extension name, description
   - Add/remove permissions
   - Configure host permissions

2. **Update `utils/api.ts`**
   - Change `appName` to your extension name
   - Change `appId` to your Momo product slug

3. **Update `utils/store.ts`**
   - Add custom settings
   - Define app-specific stores

4. **Update `public/_locales/en/messages.json`**
   - Add translations

## Development

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Build for Firefox
npm run build:firefox

# Create zip for Chrome Web Store
npm run zip

# Run tests
npm test

# Type check
npm run compile
```

## Using Momo APIs

### Authentication

```typescript
import { authFlow } from '@/utils/api';

// Open Momo login
authFlow.openLogin();

// Handle OAuth callback (in auth-callback page)
const result = await authFlow.handleAuthCallback();

// Logout
await authFlow.logout();
```

### API Calls

```typescript
import { apiClient } from '@/utils/api';

// Get user with subscription status
const { user, subscription } = await apiClient.getUser();

// AI chat
const response = await apiClient.chatCompletions({
  messages: [{ role: 'user', content: 'Hello!' }],
  project_id: 'my-project'
});

// Custom API calls
const data = await apiClient.get('/api/v1/my-endpoint');
const result = await apiClient.post('/api/v1/my-endpoint', { data });
```

### Product-Specific Endpoints

If your extension has a product config in Momo (via Pages DB):

```typescript
// These endpoints include subscription checking
const user = await apiClient.getProductUser('myproduct');

// Chat with product-specific settings
const chat = await apiClient.productChatCompletions('myproduct', {
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Subscribe to product
const { checkout_url } = await apiClient.productSubscribe('myproduct', 'price_xxx');
```

## Momo Auth Flow Details

The auth flow follows Momo's security model:

1. **Login URL**: `GET /api/v1/auth/login/google?redirect_uri={ext}&app={appId}`
2. **Redirect**: Momo redirects to extension with `#code=xxx` in URL fragment
3. **Exchange**: Extension calls `POST /api/v1/auth/exchange` with the code
4. **Tokens**: Momo returns `{ session_token, refresh_token }`
5. **User Info**: Extension fetches user info via `GET /api/v1/user`

This keeps tokens out of browser history and logs.

## Common Patterns

### Adding a New Content Script

```typescript
// entrypoints/my-content.ts
export default defineContentScript({
  matches: ['https://example.com/*'],
  main() {
    // Proxy requests through background script
    const result = await browser.runtime.sendMessage({
      type: 'apiProxyRequest',
      endpoint: '/api/v1/user',
      method: 'GET'
    });
  },
});
```

### Background Message Handling

```typescript
// background.ts
const router = createMessageRouter({
  apiClient,
  handlers: {
    'myAction': async (msg, sender) => {
      // Handle custom messages
      return { result: 'done' };
    },
  },
});
```

### Using Storage

```typescript
import { authStore, settingsStore } from '@/utils/store';

// Auth is automatically persisted
const auth = await authStore.getValue();

// Settings sync across devices
await settingsStore.setValue({ theme: 'dark' });
```

## Deployment

1. Build the extension:
   ```bash
   npm run build
   ```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `.output/chrome-mv3-dev`

3. Publish to Chrome Web Store:
   ```bash
   npm run zip
   # Upload .output/my-extension.zip to Chrome Web Store
   ```

4. Configure in Momo:
   - Add your extension as a product in Momo's Pages DB
   - Set allowed origins to `chrome-extension://{your-extension-id}`
   - Configure pricing if needed

## License

MIT
