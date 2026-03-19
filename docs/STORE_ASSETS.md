# Store Assets Guide

## Chrome Web Store Requirements

### Icon

- **Required sizes**: 128x128 (displayed), 48x48, 96x96
- **Format**: PNG
- **Guidelines**:
  - Simple, recognizable at small sizes
  - No anti-aliasing or drop shadows
  - Use transparency (Chrome applies background)
- **Current**: Icons exist at `/public/icon/` (16, 32, 48, 96, 128 PNGs)
- **Tip**: Use `scripts/generate-icons.js` if you have source SVG

### Screenshots

- **Sizes accepted**: 1280x800 or 640x400 (minimum)
- **Recommended**: 1920x1080 for best quality
- **Format**: PNG or JPEG
- **Quantity**: 1-5 screenshots
- **Aspect ratio**: 16:10 or 16:9

**Recommended Screenshots to Create:**

1. **Request Capture (Hero Shot)**
   - Show the extension capturing requests in action
   - Browser devtools on left, captured request on right
   - Title overlay: "See Every Request"

2. **Request Builder**
   - Show the builder with method, URL, headers, body tabs
   - Highlight auth options
   - Title overlay: "Build Any Request"

3. **Collections + Environments**
   - Show organized collection sidebar
   - Environment variables panel
   - Title overlay: "Stay Organized"

4. **AI Integration**
   - Show AI panel analyzing a request/response
   - Highlight "your key, your data"
   - Title overlay: "AI-Powered Debugging"

5. **Import/Export**
   - Show import modal with format detection
   - Postman/Insomnia/OpenAPI logos
   - Title overlay: "No Lock-In"

### Promotional Image (Optional but Recommended)

- **Size**: 440x280
- **Shows in Chrome Web Store listing page**
- Keep it simple - extension name + one key visual

### Store Text Optimization

#### Title

**Recommended**: `API Debugger - Capture & Debug HTTP Requests`

Maximum 45 characters for full display.

#### Short Description (95 chars max)

`Inspect every HTTP request. Capture, replay, and debug APIs. No account needed.`

#### Description (280 chars shown before "Read more")

```
Inspect every HTTP request your browser makes. Capture, replay, build, and debug APIs with full privacy.

- Auto-capture browser traffic
- Build requests: REST, WebSocket, GraphQL, SSE, Socket.IO
- Collections, environments, scripts
- AI analysis (bring your own key)

No account. No tracking. Your data stays local.
```

#### Keywords (if available)

```
http, https, request, api, debug, inspector, developer, rest, websocket, graphql, postman, insomnia, capture, network, monitor, header, response, header
```

---

## Firefox Add-on Requirements

### Icon

- Same as Chrome (128x128 displayed)

### Screenshots

- 640x400 minimum
- Same style recommendations

### Description

- Plain text, no markdown
- First 250 characters shown in search results

---

## Edge Add-on Requirements

- Similar to Chrome (Chromium-based)
- Uses Chrome package directly

---

## Screenshot Creation Tips

### Method 1: Browser Screenshots (Quick)

1. Open Chrome DevTools → API Debugger extension
2. Set up a demo scenario
3. Screenshot each key view
4. Resize/crop to required dimensions

### Method 2: Mockups (Professional)

Use tools like:

- **Pika** or **Shots** (native screenshot tools)
- **Figma** (create mockups)
- **Cleanmock** (mockup generator)

### Method 3: Design from Extension

Take actual screenshots, then:

- Add title overlay
- Add subtle branding
- Remove distracting elements

---

## Asset Checklist

```
store-assets/
├── icon/
│   ├── icon-128.png      (main store icon)
│   └── icon-256.png      (optional higher res)
├── screenshots/
│   ├── 01-request-capture.png   (1920x1080)
│   ├── 02-request-builder.png   (1920x1080)
│   ├── 03-collections.png       (1920x1080)
│   ├── 04-ai-integration.png    (1920x1080)
│   └── 05-import-export.png     (1920x1080)
├── promo-image.png        (440x280, optional)
└── manifest.json          (store metadata if using centralized config)
```

---

## Quick Start: Take Screenshots Now

```bash
# Build the extension first
npm run build

# Load in Chrome:
# 1. chrome://extensions/
# 2. Load unpacked → select .output/chrome-mv3
# 3. Pin extension, open dashboard

# Take screenshots:
# - Mac: Shift+Cmd+4, Space, click window
# - Or use browser's built-in screenshot in DevTools
```

---

## Image Specs Summary

| Store   | Icon    | Screenshot Min | Screenshot Rec |
| ------- | ------- | -------------- | -------------- |
| Chrome  | 128x128 | 640x400        | 1920x1080      |
| Firefox | 128x128 | 640x400        | 1280x800       |
| Edge    | 128x128 | 640x400        | 1920x1080      |

All should be PNG or JPEG, no explicit size limits but larger = better quality.
