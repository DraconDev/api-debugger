# Privacy Policy

**Last updated: 2024-03-19**

## What This Extension Does

API Debugger captures HTTP requests your browser makes to help you debug and inspect API traffic.

## What We DON'T Collect

- **We don't see your data.** This extension runs entirely in your browser.
- **We don't collect API requests or responses.** All data stays on your device.
- **We don't send telemetry or analytics.** No tracking, no crashes reports, no usage data.
- **We don't access your API keys.** If you add an API key for AI features, it stays in your browser's storage and is sent directly to the AI provider. We never see it.
- **We don't know what APIs you debug.** We have no server-side component.

## Data Storage

All data is stored locally in your browser using `chrome.storage`:

- Collections, saved requests, environments: `chrome.storage.sync` (optional, for cross-device sync via your own GitHub)
- Request history: `chrome.storage.local` (stays on your device)
- Settings: `chrome.storage.sync`

## AI Features

If you use AI features:

- You provide your own API key (e.g., OpenRouter)
- Requests are sent directly from your browser to the AI provider
- We have no access to your API key or AI conversations
- See the AI provider's privacy policy for their data practices

## GitHub Sync

If you enable GitHub sync:

- You provide your own GitHub personal access token
- Your token is stored locally in your browser
- We never see or access your GitHub token
- Data is pushed to a repository you control

## Changes to This Policy

If this policy changes, the new policy will be posted on this page.

## Contact

For questions about this privacy policy:

- GitHub Issues: https://github.com/DraconDev/api-debugger/issues
- Website: https://dracon.uk
