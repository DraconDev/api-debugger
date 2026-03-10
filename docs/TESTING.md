# Testing Guide

## Manual Testing Checklist

### 1. Extension Installation

**Steps:**
1. Open Chrome/Edge browser
2. Navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `apps/extension` folder
6. Verify extension icon appears

**Expected:**
- ✅ Extension loads without errors
- ✅ Icon visible in toolbar
- ✅ No console errors on load

### 2. Request Capture

**Test capturing regular HTTP requests:**

1. Open any website (e.g., https://jsonplaceholder.typicode.com)
2. Make some API calls or navigate around
3. Click extension icon
4. Check "History" tab

**Expected:**
- ✅ Requests appear in list
- ✅ Method, status, URL shown
- ✅ Requests ordered by time (newest first)

**Test different request types:**
- [ ] GET requests
- [ ] POST requests
- [ ] PUT/PATCH requests
- [ ] DELETE requests
- [ ] XHR requests
- [ ] Fetch API requests
- [ ] Different status codes (200, 201, 400, 401, 404, 500)

### 3. Request Details

**Test viewing request details:**

1. Click on any captured request
2. View detail panel

**Expected:**
- ✅ Method and URL displayed
- ✅ Status code shown
- ✅ Request headers visible
- ✅ Request body shown (if applicable)
- ✅ Response headers visible
- ✅ Timing/duration shown
- ✅ Scrollable if content is large

### 4. Diagnostics

**Test 401 Unauthorized:**

1. Make request to endpoint requiring auth without token
2. View request details

**Expected:**
- ✅ Diagnostics section appears
- ✅ Shows "Missing authentication" or similar
- ✅ Provides suggestions
- ✅ Shows evidence (status 401, missing header)

**Test 404 Not Found:**

1. Make request to non-existent endpoint
2. View request details

**Expected:**
- ✅ Shows "Resource not found"
- ✅ Suggests checking URL

**Test 500 Server Error:**

1. Make request that causes server error
2. View request details

**Expected:**
- ✅ Shows "Internal server error"
- ✅ Indicates server-side issue

**Test CORS issues:**

1. Make cross-origin request without proper CORS
2. View request details

**Expected:**
- ✅ Shows CORS policy violation
- ✅ Suggests solutions

### 5. Request Replay

**Test basic replay:**

1. Click on a captured request
2. Scroll to "Replay request" section
3. Click "Send replay" without changes

**Expected:**
- ✅ Request sent successfully
- ✅ Response status shown
- ✅ Response headers displayed
- ✅ Response body preview shown
- ✅ Duration calculated

**Test editing before replay:**

1. Modify method (e.g., GET → POST)
2. Modify URL (add/change query params)
3. Modify headers
4. Modify body
5. Click "Send replay"

**Expected:**
- ✅ Modified request sent
- ✅ Changes reflected in response

**Test invalid requests:**

1. Enter invalid URL
2. Try to send

**Expected:**
- ✅ Error message shown
- ✅ Doesn't crash extension

### 6. Diff Engine

**Test diff between original and replay:**

1. Replay a request with changes
2. View diff section at bottom

**Expected:**
- ✅ Status diff shown (e.g., "401 → 200")
- ✅ Header changes highlighted
- ✅ Added headers in green
- ✅ Removed headers in red
- ✅ Changed headers in orange

### 7. Export

**Test cURL export:**

1. Click on request
2. Scroll to "Export" section
3. Click "Copy as cURL"

**Expected:**
- ✅ Valid cURL command generated
- ✅ Method, headers, body included
- ✅ Copied to clipboard
- ✅ Button shows "Copied!" briefly

**Test Fetch export:**

1. Click "Copy as Fetch"

**Expected:**
- ✅ Valid JavaScript fetch code
- ✅ Method, headers, body included
- ✅ Copied to clipboard

**Test JSON export:**

1. Click "Copy as JSON"

**Expected:**
- ✅ Valid JSON format
- ✅ All request data included
- ✅ Copied to clipboard

### 8. Collections

**Test creating collection:**

1. Click on request
2. Scroll to "Save to Collection"
3. Enter new collection name
4. Click "Save Request"

**Expected:**
- ✅ Collection created
- ✅ Request saved
- ✅ Success message shown

**Test saving to existing collection:**

1. Select existing collection from dropdown
2. Click "Save Request"

**Expected:**
- ✅ Request saved to collection
- ✅ Request count updated

**Test viewing collections:**

1. Click "Collections" tab in main view
2. View collection list

**Expected:**
- ✅ All collections shown
- ✅ Request count displayed
- ✅ Collections clickable

**Test viewing saved requests:**

1. Click on collection
2. View saved requests list

**Expected:**
- ✅ All saved requests shown
- ✅ Request name and URL visible
- ✅ Requests clickable

**Test replaying saved request:**

1. Click on saved request
2. View details
3. Click "Send replay"

**Expected:**
- ✅ Request replayed successfully
- ✅ Response shown

### 9. Local Agent

**Test agent status:**

1. Start agent: `cd apps/agent && npm start`
2. Open extension, go to "Sync" tab
3. Click "Check Agent Status"

**Expected:**
- ✅ Shows "Agent OK"
- ✅ Shows version and uptime

**Test replay via agent:**

1. Check "Use local agent" in replay section
2. Enter localhost URL (e.g., http://localhost:3000/api)
3. Click "Send replay"

**Expected:**
- ✅ Request sent via agent
- ✅ Localhost endpoint reached
- ✅ Response shown

**Test agent not running:**

1. Stop agent (Ctrl+C)
2. Check "Use local agent"
3. Try to replay

**Expected:**
- ✅ Error shown: "Agent not running" or similar
- ✅ Doesn't crash extension

### 10. Cloud Sync

**Test registration:**

1. Start backend: `cd apps/api && npm start`
2. Open extension, go to "Sync" tab
3. Enter email and password
4. Click "Register"

**Expected:**
- ✅ Account created
- ✅ Logged in automatically
- ✅ Shows user email

**Test login:**

1. Logout (if logged in)
2. Enter credentials
3. Click "Login"

**Expected:**
- ✅ Login successful
- ✅ Shows user email
- ✅ Token stored

**Test sync:**

1. Create some collections
2. Click "Sync Now"

**Expected:**
- ✅ Collections pushed to server
- ✅ Remote collections pulled
- ✅ Success message shown

**Test logout:**

1. Click "Logout"

**Expected:**
- ✅ Logged out
- ✅ Token cleared
- ✅ Login form shown

### 11. Edge Cases

**Test empty history:**

1. Clear all requests
2. Open extension

**Expected:**
- ✅ Shows "No requests captured yet"
- ✅ Doesn't crash

**Test large request body:**

1. Capture request with large body (> 1MB)
2. View details

**Expected:**
- ✅ Body truncated or scrollable
- ✅ Doesn't slow down UI

**Test special characters:**

1. Capture request with special characters in headers/body
2. View and replay

**Expected:**
- ✅ Characters displayed correctly
- ✅ Export handles escaping

**Test concurrent requests:**

1. Trigger many requests simultaneously
2. View history

**Expected:**
- ✅ All requests captured
- ✅ No duplicates
- ✅ Correct order

**Test across multiple tabs:**

1. Open multiple tabs
2. Make requests in each
3. View history

**Expected:**
- ✅ Requests from all tabs shown
- ✅ Tab ID correct for each

**Test extension reload:**

1. Capture some requests
2. Reload extension
3. View history

**Expected:**
- ✅ Requests persist (in chrome.storage)
- ✅ Collections persist

### 12. Performance

**Test with many requests:**

1. Capture 200+ requests
2. Scroll through history
3. Click different requests

**Expected:**
- ✅ No lag or stuttering
- ✅ Scrolling smooth
- ✅ Details load quickly

**Test memory usage:**

1. Capture many requests over time
2. Check Chrome task manager

**Expected:**
- ✅ Memory reasonable (< 100MB)
- ✅ No memory leaks

## Automated Testing

### Unit Tests

Create test files in `tests/` directory:

```javascript
// tests/diagnostics.test.js
const { analyzeRequest } = require('../apps/extension/utils/diagnostics.js');

function test401Detection() {
  const record = {
    statusCode: 401,
    requestHeaders: [],
    responseHeaders: []
  };
  
  const diagnostics = analyzeRequest(record);
  console.assert(diagnostics.length > 0, 'Should detect 401');
  console.assert(diagnostics[0].type === 'auth_missing', 'Should detect missing auth');
}

test401Detection();
```

### Integration Tests

Test full workflows:

```javascript
// tests/integration.test.js
// Test request capture → replay → diff
async function testFullWorkflow() {
  // 1. Capture request
  // 2. View details
  // 3. Replay request
  // 4. Check diff
}
```

### API Tests

Test backend endpoints:

```bash
# Test health
curl http://localhost:4321/health

# Test registration
curl -X POST http://localhost:4321/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test login
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test collections
curl -X GET http://localhost:4321/api/collections \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Agent Tests

Test local agent:

```bash
# Test health
curl http://localhost:47321/health

# Test replay
curl -X POST http://localhost:47321/replay \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:3000","method":"GET"}'

# Test discover
curl -X POST http://localhost:47321/discover \
  -H "Content-Type: application/json" \
  -d '{"ports":[3000,8080,5000]}'
```

## Test Results Template

### Date: _____

**Environment:**
- Browser: Chrome ___ / Edge ___
- Node version: ___
- OS: ___

**Results:**

| Test | Status | Notes |
|------|--------|-------|
| Extension installation | ✅/❌ | |
| Request capture | ✅/❌ | |
| Request details | ✅/❌ | |
| Diagnostics | ✅/❌ | |
| Request replay | ✅/❌ | |
| Diff engine | ✅/❌ | |
| Export | ✅/❌ | |
| Collections | ✅/❌ | |
| Local agent | ✅/❌ | |
| Cloud sync | ✅/❌ | |
| Edge cases | ✅/❌ | |
| Performance | ✅/❌ | |

**Issues Found:**
1. 
2. 
3. 

**Fixed:**
1. 
2. 
3. 

## Regression Testing

After any changes, re-run:

1. ✅ All extension tests
2. ✅ API endpoint tests
3. ✅ Agent tests
4. ✅ Integration tests

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Chrome (previous version)
- [ ] Edge (latest)
- [ ] Edge (previous version)
- [ ] Other Chromium browsers (Brave, etc.)

## Known Issues

Document any known issues:

1. Response body may not capture for some requests (Chrome limitation)
2. WebSocket traffic not captured (future feature)
3. Extension must be reloaded after code changes
