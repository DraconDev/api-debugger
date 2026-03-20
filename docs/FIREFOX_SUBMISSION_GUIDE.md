# Firefox AMO Submission Options Guide

## The Options

When submitting to Firefox Add-ons, you see these checkboxes:

### "This add-on is experimental"

- **What it means:** Your add-on won't appear in main AMO search until you remove this flag
- **Recommendation:** ❌ **UNCHECK** - You want visibility

### "This add-on requires payment, non-free services or software, or additional hardware"

- **What it means:** Flags your add-on as having paid components
- **Impact:** May trigger additional review scrutiny

## The Payment Question Explained

The key insight: **you don't charge users, you don't require payment.**

But your AI features require an API key. Here's the nuance:

| Scenario                                             | Payment Checkbox | BYOK Escape Hatch     |
| ---------------------------------------------------- | ---------------- | --------------------- |
| Users must pay you for API access                    | ✅ CHECK         | N/A - you're charging |
| Users bring their own key, pay their own AI provider | ❌ UNCHECK       | ✅ USE THIS           |
| Free AI tier available (OpenRouter free models)      | ❌ UNCHECK       | ✅ USE THIS           |

## Our Strategy: BYOK (Bring Your Own Key)

**We use BYOK model:**

- Extension is 100% free
- AI features are OPTIONAL
- If user wants AI, they bring THEIR OWN API key
- They pay their AI provider (OpenRouter, etc.) directly
- We never handle money or user payment info

**This means: ❌ UNCHECK the payment box**

The "requires payment" warning only appears if:

1. The extension itself costs money, OR
2. A service the extension MUST use costs money

**Our case:**

- Extension is free
- AI is optional
- Free AI tier exists (OpenRouter free models)
- User can use extension 100% without AI
- If they want AI, they pay their own provider directly

## License Selection

| License                 | When to Use                    | Our Case              |
| ----------------------- | ------------------------------ | --------------------- |
| MIT                     | Open source, allow copying     | ❌ We are proprietary |
| Apache 2.0              | Open source with patent grants | ❌ We are proprietary |
| GPL v2/v3               | Copyleft open source           | ❌ We are proprietary |
| LGPL                    | Less restrictive copyleft      | ❌ We are proprietary |
| AGPL                    | Network use requires source    | ❌ We are proprietary |
| ISC                     | Simple permissive              | ❌ We are proprietary |
| BSD 2/3 clause          | Academic/promotional use       | ❌ We are proprietary |
| Mozilla Public 2.0      | Firefox ecosystem alignment    | ❌ Not open source    |
| **All Rights Reserved** | ✅ **PROPRIETARY**             | ✅ **USE THIS**       |

**We use: All Rights Reserved**

This signals:

- Not open source
- Don't copy my code
- We retain all rights
- Doesn't grant permission to redistribute

## What Each Option Really Does

### Experimental Flag

- Checked: "I know this is experimental, show it anyway"
- Unchecked: Full AMO listing
- **We uncheck** - we want users to find us

### Payment Flag

- Checked: "This add-on involves money"
- Reviewers may ask: "Where's the monetization disclosure?"
- **We uncheck** - free extension, BYOK model

### Privacy Policy

- Required if you collect ANY data
- We use: `https://dracondev.github.io/privacy-policy/`
- Make sure this URL actually works before submitting!

## Quick Submission Checklist

- [ ] Name: API Debugger - Capture & Debug HTTP Requests
- [ ] Summary: "Inspect every HTTP request your browser makes. Capture, replay, build, and debug APIs. No account. No tracking."
- [ ] Description: Paste from STORE_DESCRIPTION.txt
- [ ] License: **All Rights Reserved** (NOT MIT)
- [ ] Experimental: ❌ Unchecked
- [ ] Requires payment: ❌ Unchecked
- [ ] Privacy policy URL: `https://dracondev.github.io/privacy-policy/`
- [ ] Support email: (optional, can use GitHub)
- [ ] Support website: `https://dracon.uk`
- [ ] Categories: **Web Development**
- [ ] Notes to reviewer: Explain BYOK model and no data collection

## BYOK Model Justification Text

Add this to Notes to Reviewer:

```
MONETIZATION MODEL - BYOK (Bring Your Own Key)

This extension is 100% free to use.

AI features are OPTIONAL and use a BYOK model:
- Users provide their own API key from OpenRouter or similar
- Extension never handles payment - user pays provider directly
- Default model is OpenRouter's free tier

This is NOT a paid service because:
1. Extension itself is free
2. No mandatory subscription or in-app purchase
3. AI usage is optional and user-pays-directly
4. All core features work without any API key

DATA COLLECTION:
- Zero telemetry, analytics, or crash reports
- All data stored locally in browser (chrome.storage)
- We have zero visibility into user activity
- Manifest includes: data_collection_permissions: { required: ["none"] }
```

## Category Selection

**We use: Web Development**

Good alternatives:

- Privacy & Security (privacy-focused angle)
- Developer Tools (direct fit)

Don't use:

- Appearance (wrong)
- Social & Communication (wrong)
- Games & Entertainment (wrong)
