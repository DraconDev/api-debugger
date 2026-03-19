# Changelog

All notable changes will be documented in this file.

## [1.0.0] - 2024-03-19

### Added

- **Request Capture**: Automatically captures all HTTP requests from browser traffic
- **Request Builder**: Full HTTP client with method, URL, headers, body, auth support
- **Authentication**: Bearer tokens, Basic auth, API keys, OAuth 2.0 (Client Credentials + PKCE)
- **Protocols**: WebSocket, GraphQL, SSE, Socket.IO support
- **Collections**: Organize saved requests into collections
- **Environment Variables**: `{{variable}}` syntax with runtime extraction
- **Pre/Post Scripts**: Postman-compatible `pm.*` API for scripting
- **Collection Runner**: Batch execution with variable chaining
- **Importers**: Import from Postman, Insomnia, OpenAPI, HAR, cURL
- **Export**: Export to Postman, OpenAPI, cURL formats
- **AI Integration**: Bring your own key - uses OpenRouter for access to 300+ models
- **GitHub Sync**: Backup collections to your own GitHub repo
- **Code Generation**: Generate cURL, fetch, Python, Go, Java, PHP, Rust code
- **Mock Servers**: Create mock endpoints for local testing
- **API Documentation**: Generate docs from saved requests
- **Diff Viewer**: Compare two responses side-by-side
- **Test Runner**: Assertions and pass/fail reporting

### Default Models

- Default AI model set to `openrouter/free` (best free model routing)
- Fallback models available from OpenRouter's 300+ model catalog

### Privacy

- No account required
- All data stored locally
- No telemetry, no analytics, no tracking
- AI calls go directly to your API provider
- GitHub sync uses your personal access token

### Browser Support

- Chrome/Chromium (Manifest V3)
- Firefox (Manifest V2)
- Edge (Chromium-based)

## [0.1.x] - Previous Releases

See git history for detailed changes in earlier versions.
