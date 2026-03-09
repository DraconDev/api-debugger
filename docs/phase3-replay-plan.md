# Phase 3 — Request Replay Engine

## Goals
- allow users to modify any captured request
- resend the modified request from the extension
- show the replay result (status/headers/body)

## Tasks
1. **Background replay handler**  
   - add `REPLAY_REQUEST` message listener  
   - fetch the stored request (merge overrides)  
   - return status, headers, body preview  

2. **Detail panel UI**  
   - add a “Replay” section inside `#detail`  
   - expose editable fields: method, url, headers, body  
   - show a “Send replay” button  

3. **Replay result UI**  
   - show status and timing of the replay  
   - show response headers  
   - preview response body (truncated)  

4. **UX polish**  
   - keep header formatting consistent  
   - handle fetch errors gracefully  
   - clear previous result when a new request is selected  

After these steps, the extension can actually replay modified captured traffic and display the outcome.
