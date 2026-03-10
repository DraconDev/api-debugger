# New Extension Project Checklist

Use this checklist when creating a new extension from the starter template.

## ✅ Initial Setup

### 1. Copy Template
- [ ] Copy `wxt-starter` to new folder: `cp -r wxt-starter my-new-extension`
- [ ] Enter project directory: `cd my-new-extension`
- [ ] Remove `.git` folder if copied: `rm -rf .git`
- [ ] Initialize new git repo: `git init`

### 2. Configure Project
- [ ] Update `package.json`:
  - [ ] Change `name` to your extension name
  - [ ] Update `description`
  - [ ] Set initial `version` (e.g., "0.1.0")
- [ ] Update `wxt.config.ts`:
  - [ ] Change extension `name`
  - [ ] Update `description`
  - [ ] Review and adjust `permissions`
  - [ ] Update `host_permissions` if needed
- [ ] Update `public/_locales/en/messages.json`:
  - [ ] Change `extName`
  - [ ] Change `extDescription`
  - [ ] Add `extNameDev` for development

### 3. Configure Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Set `VITE_APP_ENV=local`
- [ ] Set `WXT_DRACON_URL` and `WXT_API_URL`
- [ ] Add any extension-specific env vars

### 4. Configure Shared Library
- [ ] Update `utils/api.ts`:
  - [ ] Change `appName` to your extension name
  - [ ] Change `appId` for OAuth (e.g., "myextension")
- [ ] Update `utils/store.ts`:
  - [ ] Rename `MyExtensionSettings` to your settings type
  - [ ] Add your custom settings properties

## 🔐 Authentication Setup

### 5. Configure OAuth
- [ ] In Momo/Pages DB, create a new product entry
- [ ] Set `slug` to match your `appId` from step 4
- [ ] Configure `allowed_origin_prefixes`:
  - Add `chrome-extension://{extension-id}` (get ID after first load)
- [ ] Set `project_id` for billing
- [ ] Add `system_prompt` if using AI features

### 6. Auth Callback Page
- [ ] Verify `entrypoints/auth-callback/` exists
- [ ] Customize the UI if needed
- [ ] Test OAuth flow after first install

## 🎨 UI Development

### 7. Popup UI
- [ ] Customize `entrypoints/popup/App.tsx`
- [ ] Add your logo/icon
- [ ] Implement main user flows
- [ ] Use shared UI components:
  - [ ] `Button` for actions
  - [ ] `Card` for containers
  - [ ] `AuthGuard` for protected content

### 8. Options Page (if needed)
- [ ] Create `entrypoints/options/` folder
- [ ] Implement settings UI
- [ ] Use `useStorage` hook for settings

### 9. Content Script
- [ ] Customize `entrypoints/content.ts`
- [ ] Set appropriate `matches` pattern
- [ ] Implement DOM interaction logic

## ⚙️ Feature Implementation

### 10. Feature Flags (Optional)
- [ ] Define features in `utils/features.ts`
- [ ] Use `isEnabled()` to gate new features
- [ ] Add UI to toggle features (dev mode)

### 11. Analytics (Optional)
- [ ] Use `analytics.track()` for key events
- [ ] Track errors with `analytics.trackError()`
- [ ] Disable analytics in dev mode by default

### 12. Error Handling
- [ ] Wrap components with `ErrorBoundary`
- [ ] Add error states to async operations
- [ ] Use `useAsync` hook for data fetching

## 🧪 Testing

### 13. Unit Tests
- [ ] Write tests for utility functions
- [ ] Test API client with mocks
- [ ] Test React components

### 14. Integration Tests
- [ ] Test auth flow end-to-end
- [ ] Test API calls
- [ ] Test storage operations

### 15. Manual Testing Checklist
- [ ] Install extension in Chrome (dev mode)
- [ ] Test login/logout flow
- [ ] Test all popup interactions
- [ ] Test content script on target sites
- [ ] Test background script messages
- [ ] Verify storage persists correctly
- [ ] Check error handling
- [ ] Test on different screen sizes

## 📦 Build & Release

### 16. Pre-Build Checks
- [ ] Run `npm run compile` (TypeScript check)
- [ ] Run `npm run lint` (if configured)
- [ ] Run `npm test` (if tests exist)
- [ ] Verify no console.log in production code

### 17. Production Build
- [ ] Build for Chrome: `npm run build`
- [ ] Build for Firefox: `npm run build:firefox`
- [ ] Create zip files: `npm run zip`
- [ ] Test production build locally

### 18. Chrome Web Store Preparation
- [ ] Create 128x128 icon (if not using starter)
- [ ] Create screenshots (1280x800 or 640x400)
- [ ] Write detailed description
- [ ] List all permissions with justifications
- [ ] Create privacy policy (if needed)
- [ ] Prepare promotional images

### 19. GitHub Setup
- [ ] Create repository on GitHub
- [ ] Push code: `git push -u origin main`
- [ ] Verify GitHub Actions workflows run
- [ ] Configure branch protection (optional)

## 📚 Documentation

### 20. README
- [ ] Update project title
- [ ] Add description
- [ ] Add installation instructions
- [ ] Add usage examples
- [ ] Document permissions
- [ ] Add development guide
- [ ] Add license information

### 21. Code Documentation
- [ ] Add JSDoc to public functions
- [ ] Document complex logic
- [ ] Add inline comments where needed

## 🚀 Post-Launch

### 22. Monitoring
- [ ] Set up error tracking (if using)
- [ ] Monitor user analytics
- [ ] Check Chrome Web Store reviews

### 23. Maintenance
- [ ] Respond to user feedback
- [ ] Fix reported issues
- [ ] Plan feature updates

## 🎯 Extension-Specific Checklist

Based on your extension type, check these additional items:

### For AI-Powered Extensions
- [ ] Test AI prompts for quality
- [ ] Implement rate limiting
- [ ] Add usage tracking
- [ ] Test with different AI models
- [ ] Handle AI service downtime

### For Content Script Extensions
- [ ] Test on all target sites
- [ ] Handle site layout changes
- [ ] Test with different browsers
- [ ] Check performance impact

### For Form-Filling Extensions
- [ ] Test on various form types
- [ ] Handle different input types
- [ ] Test with autofill
- [ ] Verify data privacy

### For Dashboard/Analytics Extensions
- [ ] Test data visualization
- [ ] Handle large datasets
- [ ] Test export functionality
- [ ] Verify data accuracy

## 🔍 Final Review

Before submitting to Chrome Web Store:

- [ ] Extension icon displays correctly
- [ ] All text is readable
- [ ] No broken images or links
- [ ] Loading states work
- [ ] Error messages are helpful
- [ ] UI is responsive
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (if applicable)
- [ ] No console errors in production
- [ ] Privacy policy linked (if required)

## 📝 Release Notes Template

```markdown
## v1.0.0 - Initial Release

### Features
- Feature 1 description
- Feature 2 description

### Permissions
- `permission1`: Reason for needing it
- `permission2`: Reason for needing it

### Known Issues
- Issue 1 (if any)

### Future Plans
- Planned feature 1
- Planned feature 2
```

---

**Good luck with your new extension! 🚀**
