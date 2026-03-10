# Extension Constraints Guide

Browser extensions have unique constraints that regular web apps don't have. This guide explains how this starter handles them.

## 1. Content Scripts Can't Make Direct API Calls

### The Problem
Content scripts run on `https://example.com`, not your extension's origin. They can't:
- Access your extension's `chrome.storage`
- Make authenticated calls to Momo (different origin = CORS issues)
- Access cookies from the extension context

### The Solution: Background Script Proxy

**Content Script** (`entrypoints/content.ts`):
```typescript
import { sendToBackground } from "@dracon/wxt-shared/extension";

// Proxy through background script
const user = await sendToBackground({
  type: "apiProxyRequest",
  endpoint: "/api/v1/user",
  method: "GET",
});
```

**Background Script** (`entrypoints/background.ts`):
```typescript
import { createMessageRouter } from "@dracon/wxt-shared/background";

const router = createMessageRouter({ apiClient });

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  router(msg, sender).then(sendResponse);
  return true;
});
```

### Even Easier: Use apiClient (Auto-Proxies)

```typescript
import { apiClient } from "@/utils/api";

// Automatically detects content script and proxies
const user = await apiClient.getUser();
```

## 2. OAuth Redirect Must Be Extension URL

### The Problem
Regular web OAuth uses `https://mysite.com/callback`. Extensions must use:
```
chrome-extension://{extension-id}/auth-callback.html
```

### The Solution

```typescript
import { authFlow } from "@/utils/api";

// Generates chrome-extension:// URL automatically
authFlow.openLogin();

// Momo redirects to: chrome-extension://{id}/auth-callback.html#code=xxx

// In auth-callback page:
const result = await authFlow.handleAuthCallback();
```

## 3. Storage Must Use chrome.storage

### The Problem
`localStorage` doesn't work reliably in extensions:
- Content scripts can't access it
- It doesn't sync across devices
- Can be cleared by user unexpectedly

### The Solution

```typescript
import { authStore, settingsStore } from "@/utils/store";

// Uses chrome.storage.local (persists until extension uninstalled)
await authStore.setValue({ accessToken: "..." });

// Uses chrome.storage.sync (syncs across user's devices)
await settingsStore.setValue({ theme: "dark" });
```

## 4. Extension Contexts

Extensions have multiple contexts with different capabilities:

| Context | Origin | Can Access chrome.storage | Can Call Momo API |
|---------|--------|---------------------------|-------------------|
| Popup | `chrome-extension://{id}` | ✅ Yes | ✅ Direct |
| Options | `chrome-extension://{id}` | ✅ Yes | ✅ Direct |
| Background | Service Worker | ✅ Yes | ✅ Direct |
| Content Script | `https://example.com` | ❌ No | ❌ Must proxy |

### Detecting Context

```typescript
import { isContentScript, isExtensionContext } from "@dracon/wxt-shared/extension";

if (isContentScript()) {
  // Running on a web page
  // Must use sendToBackground() for API calls
}

if (isExtensionContext()) {
  // Running in popup/options page
  // Can use apiClient directly
}
```

## 5. Required Permissions

Your extension needs these permissions in `wxt.config.ts`:

```typescript
manifest: {
  // Basic extension permissions
  permissions: ["storage", "activeTab"],
  
  // Required to inject content scripts on any site
  host_permissions: ["<all_urls>"],
  
  // Required for OAuth callback
  web_accessible_resources: [
    {
      resources: ["auth-callback.html"],
      matches: ["<all_urls>"]
    }
  ]
}
```

## 6. CORS and Cookies

### Extension Origin vs Web Page Origin

```
Your Popup:      chrome-extension://abc123/popup.html
Content Script:  https://example.com/some-page
Momo API:        https://dracon.uk/api/v1/...
```

These are **three different origins**:
- Popup can call Momo API (with proper CORS headers)
- Content script on example.com CANNOT call Momo API directly (CORS)
- Content script must proxy through background script (same origin as popup)

### Cookies

Extensions don't rely on cookies for auth. Instead:
1. Store tokens in `chrome.storage.local` (via `authStore`)
2. Send tokens as `Authorization: Bearer {token}` header
3. Momo validates the JWT token

## Common Patterns

### Pattern 1: Content Script Needs User Data

```typescript
// content.ts
import { sendToBackground } from "@dracon/wxt-shared/extension";

async function enhancePage() {
  // Get user data via background proxy
  const { user } = await sendToBackground({
    type: "apiProxyRequest",
    endpoint: "/api/v1/user",
    method: "GET",
  });
  
  if (user) {
    // Show user-specific UI on page
    showLoggedInBanner(user);
  }
}
```

### Pattern 2: Popup Accesses Page Content

```typescript
// popup/App.tsx
import { executeInActiveTab } from "@/utils/extension";

async function scrapePage() {
  // Execute code in active tab's context
  const content = await executeInActiveTab(() => {
    return document.body.innerText;
  });
  
  // Send to Momo API
  const summary = await apiClient.chatCompletions({
    messages: [
      { role: "system", content: "Summarize this:" },
      { role: "user", content: content }
    ]
  });
}
```

### Pattern 3: Content Script Listens for Commands

```typescript
// content.ts
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "highlightElements") {
    // Perform DOM manipulation
    const elements = document.querySelectorAll(msg.selector);
    elements.forEach(el => el.style.backgroundColor = "yellow");
    sendResponse({ count: elements.length });
  }
  return true;
});
```

```typescript
// popup/App.tsx
import { sendMessageToActiveTab } from "@/utils/extension";

async function highlight() {
  const result = await sendMessageToActiveTab({
    type: "highlightElements",
    selector: "h1"
  });
  console.log("Highlighted", result?.count, "elements");
}
```

## Debugging Tips

### Check Which Context You're In

```typescript
console.log("Location:", window.location.href);
console.log("Protocol:", window.location.protocol);
console.log("Is content script:", isContentScript());
console.log("Is extension context:", isExtensionContext());
```

### Content Script Not Receiving Messages?

1. Check if content script is injected on the page
2. Verify `matches` pattern in `content.ts`
3. Check extension console (not page console) for errors

### API Calls Failing in Content Script?

Content scripts **cannot** make direct authenticated API calls. You must:
1. Proxy through background script using `sendToBackground()`
2. Or use `apiClient` which auto-detects and proxies

### Storage Not Persisting?

- Use `authStore`/`settingsStore` (chrome.storage), not localStorage
- Check if using correct storage area (`local` vs `sync`)
- Verify `storage` permission in manifest

## Summary

| Constraint | Solution |
|------------|----------|
| Content script can't call Momo API | Proxy through background script |
| OAuth redirect | Use `chrome-extension://` URLs |
| Storage | Use `chrome.storage` via WXT |
| Multiple contexts | Use context detection helpers |

The shared library handles all of these for you - just use `apiClient`, `authFlow`, and the storage utilities!
