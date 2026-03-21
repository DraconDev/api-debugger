# Release Checklist

## Store Status

| Store            | Status             | URL                                                           |
| ---------------- | ------------------ | ------------------------------------------------------------- |
| Chrome Web Store | ✅ Submitted       | [Link]()                                                      |
| Firefox AMO      | ✅ Awaiting Review | [Link](https://addons.mozilla.org/addon/api-debugger-capture) |
| Edge Add-ons     | ✅ Submitted       | [Link]()                                                      |

## Pre-Release

### Version & Metadata

- [x] Version in `package.json` matches `wxt.config.ts`
- [x] `docs/RELEASE_NOTES.txt` updated
- [x] `docs/STORE_DESCRIPTION.txt` ready

### Build & Test

- [x] `npm test` - all tests pass
- [x] `npm run build` for Chrome
- [x] `npm run zip:firefox` for Firefox
- [x] Verify `manifest.json` at root in ZIP

### Firefox AMO Specific

See `docs/FIREFOX_AMO_GUIDE.md` and `docs/FIREFOX_SUBMISSION_GUIDE.md`

## Release Process

```bash
# 1. Make code changes
# 2. Update version in package.json AND wxt.config.ts (must match!)
# 3. Update docs/RELEASE_NOTES.txt
# 4. Run tests
npm test

# 5. Build all platforms
npm run build && npm run zip:firefox

# 6. Upload ZIPs to stores:
#    - Chrome: draconapi-debugger-X.X.X-chrome.zip
#    - Firefox: draconapi-debugger-X.X.X-firefox.zip
#    - Edge: same as Chrome ZIP

# 7. Commit and tag
git add -A && git commit -m "release: vX.X.X"
git tag vX.X.X && git push && git push --tags
```

## Version Info

**Current Version:** 1.0.15

**Build Outputs:**

- Chrome: `.output/draconapi-debugger-1.0.15-chrome.zip`
- Firefox: `.output/draconapi-debugger-1.0.15-firefox.zip`
- Sources: `.output/draconapi-debugger-1.0.15-sources.zip`

## Store Requirements Summary

### Chrome Web Store

- ZIP with manifest.json at root
- 128x128 icon
- Screenshots (1280x800 or 640x400)
- Privacy policy URL
- Permission justifications

### Firefox AMO

- ZIP with manifest.json at root
- `browser_specific_settings.gecko.id` required
- `browser_specific_settings.gecko.data_collection_permissions = { required: ["none"] }`
- Privacy policy URL
- All Rights Reserved license

### Edge Add-ons

- Same ZIP as Chrome (MV3 works on Edge)
- Additional: 1400x560 promotional tile
- Search terms (up to 7)
- Notes for certification
