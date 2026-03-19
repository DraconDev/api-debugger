# API Debugger

**Stop creating accounts to debug your own API traffic.**

Chrome extension that captures every HTTP request your browser makes. No login. No cloud. No "verify your email to continue."

## Install

**[Chrome Web Store](https://chrome.google.com/webstore/)** · **[Firefox Add-on](https://addons.mozilla.org/)** · **[Source](https://github.com/DraconDev/api-debugger)**

---

## The Story

I was debugging an API at 11pm. Postman wanted to verify my email. Again.

So I built a Chrome extension that captures every request my browser makes.

It works like this:

1. You browse the web like normal
2. Every HTTP request gets captured automatically
3. Open the extension, see everything, replay or modify any request

---

## Features

- **Auto-capture** - Every HTTP request, automatically
- **All protocols** - REST, WebSocket, GraphQL, SSE, Socket.IO
- **Build requests** - Headers, body, auth, params
- **Collections** - Organize, save, sync to GitHub
- **Pre/post scripts** - Postman-compatible syntax
- **Import anything** - Postman, Insomnia, OpenAPI, HAR, cURL

---

## Privacy

- No account required
- No telemetry, no tracking
- Data stays in your browser
- GitHub sync uses your token, not ours

---

## The Frustration

Postman: "Create an account to see your own API calls."
Insomnia: "Download our app, set up an account."
Us: "It's a Chrome extension. Open it. Done."

---

## Source

MIT Licensed. Built with React, TypeScript, WXT.

**github.com/DraconDev/api-debugger**
