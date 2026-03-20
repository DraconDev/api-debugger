# Release Checklist

## Pre-Release

### Version & Metadata

- [ ] Update version number in `package.json`
- [ ] Update version in `wxt.config.ts` (must match package.json)
- [ ] Update `docs/RELEASE_NOTES.txt`
- [ ] Store listing description ready (`docs/STORE_DESCRIPTION.txt`)

### Build & Test

- [ ] Run `npm test` - all tests must pass
- [ ] Run `npm run build` for Chrome
- [ ] Run `npm run zip:firefox` for Firefox
- [ ] Verify `draconapi-debugger-X.X.X-firefox.zip` has `manifest.json` at root

### Legal & Documentation

- [ ] Privacy Policy URL ready (e.g., `https://dracondev.github.io/privacy-policy/`)
- [ ] Privacy policy posted to GitHub Pages

## Firefox AMO Specific (CRITICAL)

Firefox validation is strict. See `docs/FIREFOX_AMO_GUIDE.md` for details.

### Required Manifest Fields

```json
"browser_specific_settings": {
  "gecko": {
    "id": "api-debugger@dracon.uk",
    "data_collection_permissions": {
      "required": ["none"]
    }
  }
}
```

### Which ZIP to Upload

**WRONG:** `firefox-mv2.zip` (has `firefox-mv2/` subdirectory - will fail)

**CORRECT:** `draconapi-debugger-1.0.X-firefox.zip` (manifest.json at root)

## Store Uploads

### Chrome Web Store

- Upload: `.output/draconapi-debugger-X.X.X-chrome.zip`
- Use `docs/STORE_DESCRIPTION.txt` for listing
- Use `docs/STORE_JUSTIFICATIONS.txt` for permission justifications
- Category: "Developer Tools"
- Pricing: "Free"

### Firefox Add-ons

- Upload: `.output/draconapi-debugger-X.X.X-firefox.zip` (NOT `firefox-mv2.zip`)
- Review takes ~1-3 days
- Use `docs/PRIVACY.txt` for description

### Microsoft Edge Add-ons

- Upload: Same as Chrome ZIP (`.output/draconapi-debugger-X.X.X-chrome.zip`)
- Usually auto-approved for Chromium-based extensions

## Post-Upload

- [ ] Monitor validation results
- [ ] Address any errors
- [ ] Wait for review (Firefox: 1-3 days)
- [ ] Publish when approved

## Build Commands Reference

```bash
# Build Chrome
npm run build
npm run zip

# Build Firefox (includes manifest fix)
npm run build:firefox
npm run zip:firefox

# Full release build (all platforms)
node scripts/release.js --skip-git
```

## Current Version: 1.0.15

**Builds:**

- Chrome: `.output/draconapi-debugger-1.0.15-chrome.zip`
- Firefox: `.output/draconapi-debugger-1.0.15-firefox.zip`
- Sources: `.output/draconapi-debugger-1.0.15-sources.zip`
