# Contributing to API Debugger

🎉 Thanks for your interest in contributing!

## Quick Start

```bash
git clone https://github.com/DraconDev/api-debugger.git
cd api-debugger
npm install
npm run dev
```

Open Chrome at `chrome://extensions/`, enable Developer mode, click "Load unpacked", select the `dev` folder that appears.

## Project Structure

```
api-debugger/
├── components/       # React UI components
│   ├── request/      # Request builder components
│   ├── protocol/     # WebSocket, GraphQL, SSE, Socket.IO
│   └── testing/      # Script editor, test runner
├── lib/              # Core logic
│   ├── ai-client.ts  # OpenRouter AI
│   ├── importers/    # Postman, OpenAPI, etc.
│   ├── oauth2.ts     # OAuth 2.0 flows
│   └── scriptExecutor.ts  # Pre/post scripts
├── hooks/            # React hooks
├── entrypoints/      # Extension entry points
│   ├── background.ts # Service worker
│   └── dashboard/    # Main UI
├── tests/            # Vitest tests (956 passing!)
└── docs/             # Documentation
```

## Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build         # Build for Chrome
npm run build:firefox # Build for Firefox
npm run test          # Run all tests
npm run compile       # TypeScript check
npm run zip           # Create distributable ZIP
```

## Making Changes

1. **Fork** the repo
2. **Clone** your fork
3. **Create a branch** for your feature (`git checkout -b feat/amazing-thing`)
4. **Make your changes** - we're pretty chill about code style
5. **Add tests** if adding logic (we have 956 tests, keep it that way)
6. **Run `npm test`** - all 956 must pass
7. **Submit a PR**

## Code Style

- TypeScript strict mode
- Functional React components preferred
- No inline styles - use Tailwind classes
- No `any` unless absolutely necessary

## Reporting Issues

- Bug reports welcome!
- Search existing issues first
- Include Chrome version, OS, steps to reproduce
- Screenshots help

## Ideas Welcome

- Feature proposals? Open an issue
- Think something could be better? PR welcome
- Don't like our code? Fork it

## License

By contributing, you agree your code will be MIT licensed.
