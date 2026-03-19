# Release Checklist

## Pre-Release

### Version & Metadata

- [ ] Update version number in `package.json` (currently 0.1.726+)
- [x] Store listing description ready (`docs/STORE_LISTING.md`)
- [x] Manifest description updated ("No account. No cloud. No spying.")
- [x] Build verified for Chrome (chrome-mv3)
- [x] Build verified for Firefox (firefox-mv2)

### Legal & Documentation

- [ ] Create LICENSE file (MIT - mentioned in README but file missing)
- [ ] Create CHANGELOG.md
- [ ] Privacy Policy URL (needed for stores)
- [ ] Terms of Service URL (optional)

### Store Assets

- [ ] Screenshots for Chrome Web Store (1920x1080 or similar)
- [ ] Promotional image / store banner
- [ ] Video walkthrough (optional but recommended)
- [ ] Verify icon looks good at all sizes (16, 32, 48, 96, 128)

### Chrome Web Store

- [ ] Developer account set up (chrome://chrome-webstore/)
- [ ] Upload ZIP: `.output/chrome-mv3.zip`
- [ ] Add screenshots
- [ ] Add description
- [ ] Set category: "Developer Tools"
- [ ] Set pricing: "Free"
- [ ] Mark as "Stable" when ready

### Firefox Add-ons

- [ ] Mozilla Add-ons developer account
- [ ] Upload `.output/firefox-mv2.zip`
- [ ] Review takes ~1-3 days
- [ ] Add AMO description

### Microsoft Edge Add-ons

- [ ] Dev center account at https://partner.microsoft.com/
- [ ] Upload extension package
- [ ] Usually auto-approved for Chromium-based

### GitHub Release

- [ ] Create git tag (e.g., v0.2.0)
- [ ] Write release notes
- [ ] Attach pre-built ZIPs
- [ ] Attach source code

## Post-Release

### Verification

- [ ] Extension loads in Chrome without errors
- [ ] Extension loads in Firefox without errors
- [ ] Extension loads in Edge without errors
- [ ] Basic functionality tested manually
- [ ] Request capture works
- [ ] Request building works
- [ ] Settings save works

### Monitoring

- [ ] Watch for crash reports
- [ ] Monitor store reviews
- [ ] Set up error tracking (optional - Sentry?)

## Optional / Nice to Have

### AI Marketplace Listings

- [ ] OpenRouter featured models listing
- [ ] Consider if there's an AI plugins marketplace

### Distribution

- [ ] Consider homebrew package
- [ ] Consider snap store
- [ ] Consider flatpak

---

## Current Status

**Version:** 1.0.0

**Builds:**

- [x] Chrome (chrome-mv3) - ✅ Working
- [x] Firefox (firefox-mv2) - ✅ Working
- [x] Edge (uses Chrome package) - ✅ Works

**ZIPs Built:**

- `.output/draconapi-debugger-1.0.0-chrome.zip` (168 KB)
- `.output/draconapi-debugger-1.0.0-firefox.zip` (168 KB)
- `.output/draconapi-debugger-1.0.0-sources.zip` (319 KB)

**Documentation:**

- [x] README.md - Updated with feature table
- [x] Store listing: `docs/STORE_LISTING.md` - Brutally explicit
- [x] LICENSE file - MIT license created
- [x] CHANGELOG.md - Version 1.0.0 documented

**Tests:** 956 passing

## Remaining Items for Store Upload

### Chrome Web Store

- [ ] Create developer account at https://chrome.google.com/webstore/dev
- [ ] Upload `draconapi-debugger-1.0.0-chrome.zip`
- [ ] Add screenshots (1920x1080)
- [ ] Verify store listing text
- [ ] Submit for review

### Firefox Add-ons

- [ ] Create account at https://addons.mozilla.org/developers/
- [ ] Upload `draconapi-debugger-1.0.0-firefox.zip`
- [ ] Add AMO description
- [ ] Submit for review (~1-3 days)

### Edge Add-ons

- [ ] Use Chrome package - upload at https://partner.microsoft.com/dashboard/microsoftedge/
- [ ] Usually auto-approved for Chromium extensions

### GitHub Release

- [ ] Create tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Create release at https://github.com/dracon/api-debugger/releases
- [ ] Attach ZIPs
- [ ] Write release notes

### Store Assets Needed

- [ ] 1-5 screenshots (1920x1080 recommended)
- [ ] Store icon (optional - uses extension icons)
- [ ] Promotional image (optional)
- [ ] Privacy policy URL (can use GitHub Pages)
- [ ] Support URL (can use GitHub issues)
