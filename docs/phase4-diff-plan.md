# Phase 4 — Diff Engine Blueprint

## Objective
Highlight what changed between the **captured original request/response** and the **replayed request/response** so users can quickly understand why a replay succeeded or failed differently.

## Inputs
- `record` (captured data saved by `background.js`):
  - method, url, headers, body
  - response status + headers
- `replayResult` (from `fetch` call in background):
  - method/url/headers/body (per user overrides)
  - response status, headers
  - response body preview

## Diff dimensions
1. **Method/URL** – surface textual diff between original and replay (highlight changed HTTP method or path/query).  
2. **Request headers & body** – compare serialized key/value pairs to flag additions/removals.  
3. **Response status** – show original status vs replay status (e.g., `401 → 200`).  
4. **Response headers** – show headers added/removed/changed.  
5. **Response body preview** – show truncated preview but highlight first-line difference if available.

## Tasks
1. Create `utils/diff.js` (or a similar helper) with the following functions:  
   - `diffHeaders(original, modified)` → { added, removed, changed } lists  
   - `diffStatus(originalStatus, replayStatus)` → human-readable string  
   - `diffText(original, modified)` → simple line-by-line diff for URLs/body  

2. Update `panel.js`:  
   - After receiving `replayResult`, call the diff helpers with the stored record  
   - Render a new “Diff” block below the replay result  
   - Diff block should show sections for: Method/URL, Request headers/body, Response status, Response headers  
   - Use color cues (green/orange/gray) to indicate added/removed/changed entries (plain inline styles are fine for MVP)

3. Provide summary text above the diff block (e.g., “Status changed from 401 → 200”).  
4. Optional: store the last replay diff in state so selecting another request clears previous summary (keep UI focused).  

## Acceptance Criteria
- The detail panel now includes a **Diff** section whenever a replay occurs.  
- The diff clearly labels what changed and what stayed the same.  
- Status and headers differences are easy to scan.  
- No functionality relies on backend services.
