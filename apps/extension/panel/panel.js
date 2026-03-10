async function getRequests() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_REQUESTS" }, (res) => {
      resolve(res?.requests || []);
    });
  });
}

async function clearRequests() {
  await chrome.storage.local.set({ requests: [] });
  render();
}

let currentView = 'history'; // 'history' | 'collections'
let selectedCollectionId = null;

function switchView(view) {
  currentView = view;
  selectedCollectionId = null;
  render();
}

function row(r) {
  const div = document.createElement("div");
  div.style.borderBottom = "1px solid #eee";
  div.style.padding = "6px 0";
  div.style.cursor = "pointer";

  const method = document.createElement("span");
  method.textContent = r.method;
  method.style.fontWeight = "bold";
  method.style.marginRight = "6px";

  const status = document.createElement("span");
  status.textContent = r.statusCode;
  status.style.marginRight = "6px";

  const url = document.createElement("span");
  url.textContent = r.url;
  url.style.fontSize = "11px";
  url.style.wordBreak = "break-all";

  div.appendChild(method);
  div.appendChild(status);
  div.appendChild(url);
  div.onclick = () => showDetail(r);
  return div;
}

async function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";
  
  // Render view tabs
  const tabs = document.createElement("div");
  tabs.style.marginBottom = "8px";
  tabs.style.display = "flex";
  tabs.style.gap = "6px";

  const historyTab = document.createElement("button");
  historyTab.textContent = "History";
  historyTab.style.fontWeight = currentView === 'history' ? 'bold' : 'normal';
  historyTab.onclick = () => switchView('history');
  tabs.appendChild(historyTab);

  const collectionsTab = document.createElement("button");
  collectionsTab.textContent = "Collections";
  collectionsTab.style.fontWeight = currentView === 'collections' ? 'bold' : 'normal';
  collectionsTab.onclick = () => switchView('collections');
  tabs.appendChild(collectionsTab);
  
  // Add sync/auth tab
  const syncTab = document.createElement("button");
  syncTab.textContent = "Sync";
  syncTab.style.fontWeight = currentView === 'sync' ? 'bold' : 'normal';
  syncTab.onclick = () => switchView('sync');
  tabs.appendChild(syncTab);

  list.appendChild(tabs);

  if (currentView === 'history') {
    await renderHistoryView(list);
  } else if (currentView === 'collections') {
    await renderCollectionsView(list);
  } else {
    await renderSyncView(list);
  }
}

async function renderHistoryView(container) {
  const requests = await getRequests();
  
  if (!requests.length) {
    const msg = document.createElement("div");
    msg.textContent = "No requests captured yet.";
    msg.style.color = "#777";
    msg.style.fontSize = "11px";
    container.appendChild(msg);
    return;
  }
  
  requests.forEach((r) => container.appendChild(row(r)));
}

async function renderCollectionsView(container) {
  if (!window.collectionsHelpers) {
    const msg = document.createElement("div");
    msg.textContent = "Collections module not loaded.";
    msg.style.color = "#777";
    container.appendChild(msg);
    return;
  }
  
  const collections = await window.collectionsHelpers.getAllCollections();
  
  if (!collections.length) {
    const msg = document.createElement("div");
    msg.textContent = "No collections yet. Click 'Save to Collection' in request details to create one.";
    msg.style.color = "#777";
    msg.style.fontSize = "11px";
    container.appendChild(msg);
    return;
  }
  
  collections.forEach(collection => {
    container.appendChild(collectionRow(collection));
  });
}

function collectionRow(collection) {
  const div = document.createElement("div");
  div.style.borderBottom = "1px solid #eee";
  div.style.padding = "6px 0";
  div.style.cursor = "pointer";
  
  const name = document.createElement("span");
  name.textContent = collection.name;
  name.style.fontWeight = "bold";
  name.style.marginRight = "6px";
  
  const count = document.createElement("span");
  count.textContent = `(${collection.requestCount || 0} requests)`;
  count.style.color = "#777";
  count.style.fontSize = "11px";
  
  div.appendChild(name);
  div.appendChild(count);
  
  div.onclick = async () => {
    const savedRequests = await window.collectionsHelpers.getRequestsByCollection(collection.id);
    showCollectionDetail(collection, savedRequests);
  };
  
  return div;
}

function showCollectionDetail(collection, savedRequests) {
  const d = document.getElementById("detail");
  d.style.display = "block";
  d.innerHTML = "";
  
  const heading = document.createElement("h2");
  heading.textContent = collection.name;
  d.appendChild(heading);
  
  if (collection.description) {
    const desc = document.createElement("div");
    desc.style.fontSize = "11px";
    desc.style.color = "#555";
    desc.textContent = collection.description;
    d.appendChild(desc);
  }
  
  const backBtn = document.createElement("button");
  backBtn.textContent = "Back to Collections";
  backBtn.style.marginTop = "8px";
  backBtn.onclick = () => {
    d.style.display = "none";
    render();
  };
  d.appendChild(backBtn);
  
  if (!savedRequests.length) {
    const msg = document.createElement("div");
    msg.style.marginTop = "8px";
    msg.style.color = "#777";
    msg.textContent = "No saved requests in this collection.";
    d.appendChild(msg);
    return;
  }
  
  const list = document.createElement("div");
  list.style.marginTop = "12px";
  
  savedRequests.forEach(saved => {
    const item = document.createElement("div");
    item.style.padding = "6px";
    item.style.marginBottom = "4px";
    item.style.border = "1px solid #ddd";
    item.style.borderRadius = "4px";
    item.style.cursor = "pointer";
    
    const nameDiv = document.createElement("div");
    nameDiv.style.fontWeight = "bold";
    nameDiv.style.fontSize = "12px";
    nameDiv.textContent = saved.name;
    item.appendChild(nameDiv);
    
    const urlDiv = document.createElement("div");
    urlDiv.style.fontSize = "10px";
    urlDiv.style.color = "#777";
    urlDiv.textContent = `${saved.request.method} ${saved.request.url}`;
    item.appendChild(urlDiv);
    
    item.onclick = () => showSavedRequestDetail(saved);
    list.appendChild(item);
  });
  
  d.appendChild(list);
}

function showSavedRequestDetail(saved) {
  const r = saved.request;
  const d = document.getElementById("detail");
  d.style.display = "block";
  d.innerHTML = "";
  
  const heading = document.createElement("h2");
  heading.textContent = saved.name;
  d.appendChild(heading);
  
  const meta = document.createElement("div");
  meta.style.fontSize = "11px";
  meta.style.color = "#555";
  meta.style.marginBottom = "8px";
  meta.textContent = `Saved on ${new Date(saved.createdAt).toLocaleString()}`;
  d.appendChild(meta);
  
  // Render request details using existing function
  d.appendChild(metadataBlock(r));
  const headers = headerSection("Request headers", r.requestHeaders);
  if (headers) d.appendChild(headers);
  const body = bodySection("Request body", formatBody(r.requestBody));
  if (body) d.appendChild(body);
  
  // Show replay block
  const replay = renderReplayBlock(r);
  if (replay) d.appendChild(replay);
}

async function renderSyncView(container) {
  const syncDiv = document.createElement("div");
  syncDiv.style.padding = "8px";
  
  const heading = document.createElement("h2");
  heading.textContent = "Sync & Account";
  heading.style.margin = "0 0 12px";
  syncDiv.appendChild(heading);
  
  if (!window.syncService) {
    const msg = document.createElement("div");
    msg.textContent = "Sync service not loaded.";
    msg.style.color = "#777";
    syncDiv.appendChild(msg);
    container.appendChild(syncDiv);
    return;
  }
  
  const user = await window.syncService.getUser();
  
  if (user) {
    const userDiv = document.createElement("div");
    userDiv.style.marginBottom = "12px";
    userDiv.innerHTML = `<strong>Logged in as:</strong> ${user.email}`;
    syncDiv.appendChild(userDiv);
    
    const syncBtn = document.createElement("button");
    syncBtn.textContent = "Sync Now";
    syncBtn.onclick = async () => {
      syncBtn.disabled = true;
      syncBtn.textContent = "Syncing...";
      try {
        if (window.collectionsHelpers) {
          await window.syncService.syncCollections();
          syncBtn.textContent = "Synced!";
        } else {
          syncBtn.textContent = "Collections not available";
        }
      } catch (err) {
        syncBtn.textContent = `Error: ${err.message}`;
      }
      setTimeout(() => {
        syncBtn.textContent = "Sync Now";
        syncBtn.disabled = false;
      }, 2000);
    };
    syncDiv.appendChild(syncBtn);
    
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Logout";
    logoutBtn.style.marginLeft = "6px";
    logoutBtn.onclick = async () => {
      await window.syncService.logout();
      render();
    };
    syncDiv.appendChild(logoutBtn);
  } else {
    const loginForm = document.createElement("div");
    loginForm.style.marginBottom = "12px";
    
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.placeholder = "Email";
    emailInput.style.width = "100%";
    emailInput.style.marginBottom = "6px";
    emailInput.style.padding = "6px";
    loginForm.appendChild(emailInput);
    
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Password";
    passwordInput.style.width = "100%";
    passwordInput.style.marginBottom = "6px";
    passwordInput.style.padding = "6px";
    loginForm.appendChild(passwordInput);
    
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Login";
    loginBtn.onclick = async () => {
      try {
        await window.syncService.login(emailInput.value, passwordInput.value);
        render();
      } catch (err) {
        alert(`Login failed: ${err.message}`);
      }
    };
    loginForm.appendChild(loginBtn);
    
    const registerBtn = document.createElement("button");
    registerBtn.textContent = "Register";
    registerBtn.style.marginLeft = "6px";
    registerBtn.onclick = async () => {
      try {
        await window.syncService.register(emailInput.value, passwordInput.value);
        render();
      } catch (err) {
        alert(`Registration failed: ${err.message}`);
      }
    };
    loginForm.appendChild(registerBtn);
    
    syncDiv.appendChild(loginForm);
  }
  
  const note = document.createElement("div");
  note.style.marginTop = "12px";
  note.style.fontSize = "10px";
  note.style.color = "#888";
  note.textContent = "Backend must be running on localhost:4321";
  syncDiv.appendChild(note);
  
  // Agent status section
  const agentSection = document.createElement("div");
  agentSection.style.marginTop = "16px";
  agentSection.style.paddingTop = "12px";
  agentSection.style.borderTop = "1px solid #ddd";
  
  const agentHeading = document.createElement("h3");
  agentHeading.textContent = "Local Agent";
  agentHeading.style.margin = "0 0 8px";
  agentHeading.style.fontSize = "13px";
  agentSection.appendChild(agentHeading);
  
  if (window.agentService) {
    const checkBtn = document.createElement("button");
    checkBtn.textContent = "Check Agent Status";
    checkBtn.onclick = async () => {
      checkBtn.disabled = true;
      checkBtn.textContent = "Checking...";
      
      const health = await window.agentService.checkAgentHealth();
      
      if (health) {
        checkBtn.textContent = `Agent OK (v${health.version})`;
        
        const statusDiv = document.createElement("div");
        statusDiv.style.marginTop = "8px";
        statusDiv.style.fontSize = "10px";
        statusDiv.style.color = "#666";
        statusDiv.innerHTML = `
          <div>✓ Agent running</div>
          <div>Port: ${health.port || 'unknown'}</div>
          <div>Uptime: ${Math.floor(health.uptime)}s</div>
        `;
        agentSection.appendChild(statusDiv);
      } else {
        checkBtn.textContent = "Agent Not Running";
        
        const helpDiv = document.createElement("div");
        helpDiv.style.marginTop = "8px";
        helpDiv.style.fontSize = "10px";
        helpDiv.style.color = "#888";
        helpDiv.innerHTML = `
          <div style="margin-bottom:4px;">To start the agent:</div>
          <div style="font-family:monospace;background:#f5f5f5;padding:4px;">
            cd apps/agent && npm start
          </div>
        `;
        agentSection.appendChild(helpDiv);
      }
      
      setTimeout(() => {
        checkBtn.textContent = "Check Agent Status";
        checkBtn.disabled = false;
      }, 3000);
    };
    agentSection.appendChild(checkBtn);
  }
  
  syncDiv.appendChild(agentSection);
  
  container.appendChild(syncDiv);
}

document.getElementById("refresh").onclick = render;
document.getElementById("clear").onclick = clearRequests;

render();

/**
 * Display selected request details.
 */
function showDetail(r) {
  const d = document.getElementById("detail");
  d.style.display = "block";
  d.innerHTML = "";

  d.appendChild(metadataBlock(r));
  const headers = headerSection("Request headers", r.requestHeaders);
  if (headers) d.appendChild(headers);
  const body = bodySection("Request body", formatBody(r.requestBody));
  if (body) d.appendChild(body);
  const respHeaders = headerSection("Response headers", r.responseHeaders);
  if (respHeaders) d.appendChild(respHeaders);
  const respNote = document.createElement("div");
  respNote.style.fontSize = "11px";
  respNote.style.color = "#777";
  respNote.style.marginTop = "4px";
  respNote.textContent = "Response body capture is coming soon (Chrome limits it).";
  d.appendChild(respNote);

  // Add diagnostics section for failed requests
  if (r.statusCode >= 400 || r.statusCode === 0) {
    const diagnosticsBlock = renderDiagnostics(r);
    if (diagnosticsBlock) d.appendChild(diagnosticsBlock);
  }

  // Add export section
  const exportBlock = renderExportBlock(r);
  if (exportBlock) d.appendChild(exportBlock);
  
  // Add save to collection section
  const saveBlock = renderSaveToCollectionBlock(r);
  if (saveBlock) d.appendChild(saveBlock);

  const replay = renderReplayBlock(r);
  if (replay) d.appendChild(replay);
}

function metadataBlock(r) {
  const block = document.createElement("div");
  const head = document.createElement("div");
  head.style.marginBottom = "6px";
  head.innerHTML = `<strong>${r.method} ${r.statusCode}</strong> <span style="font-size:11px;color:#333;">${r.url}</span>`;
  block.appendChild(head);

  const table = document.createElement("table");
  const body = document.createElement("tbody");
  const rows = [
    ["Type", r.type || "—"],
    ["Tab ID", r.tabId >= 0 ? r.tabId : "—"],
    ["Started", r.startTime ? new Date(r.startTime).toLocaleString() : "—"],
    ["Completed", r.timeStamp ? new Date(r.timeStamp).toLocaleString() : "—"],
    ["Duration", typeof r.duration === "number" ? `${r.duration.toFixed(1)} ms` : "—"]
  ];

  rows.forEach(([label, value]) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(th);
    tr.appendChild(td);
    body.appendChild(tr);
  });

  table.appendChild(body);
  block.appendChild(table);
  return block;
}

function headerSection(title, headers) {
  if (!headers?.length) return null;
  const block = document.createElement("div");
  const heading = document.createElement("h2");
  heading.textContent = title;
  block.appendChild(heading);

  const table = document.createElement("table");
  const body = document.createElement("tbody");

  headers.forEach((header) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = header.name;
    const td = document.createElement("td");
    td.textContent = header.value;
    tr.appendChild(th);
    tr.appendChild(td);
    body.appendChild(tr);
  });

  table.appendChild(body);
  block.appendChild(table);
  return block;
}

function bodySection(title, content) {
  const block = document.createElement("div");
  const heading = document.createElement("h2");
  heading.textContent = title;
  block.appendChild(heading);

  const pre = document.createElement("pre");
  pre.textContent = content;
  block.appendChild(pre);
  return block;
}

function formatBody(body) {
  if (!body) return "(empty)";
  if (typeof body === "string") return body;
  if (typeof body === "object") {
    const entries = Object.entries(body)
      .map(([key, value]) => {
        const formatted = Array.isArray(value) ? value.join(", ") : String(value);
        return `${key}: ${formatted}`;
      })
      .join("\n");
    return entries || "(empty)";
  }
  return String(body);
}

function renderReplayBlock(record) {
  const block = document.createElement("div");
  block.style.marginTop = "12px";
  block.style.padding = "8px";
  block.style.border = "1px solid #ddd";
  block.style.borderRadius = "4px";

  const heading = document.createElement("h2");
  heading.textContent = "Replay request";
  block.appendChild(heading);

  const formGroup = document.createElement("div");
  formGroup.style.display = "flex";
  formGroup.style.gap = "4px";

  const methodInput = document.createElement("input");
  methodInput.value = record.method;
  methodInput.style.width = "80px";
  formGroup.appendChild(methodInput);

  const urlInput = document.createElement("input");
  urlInput.value = record.url;
  urlInput.style.flex = "1";
  formGroup.appendChild(urlInput);

  block.appendChild(formGroup);

  const headersLabel = document.createElement("div");
  headersLabel.style.marginTop = "8px";
  headersLabel.textContent = "Headers (name: value)";
  block.appendChild(headersLabel);

  const headersArea = document.createElement("textarea");
  headersArea.rows = 3;
  headersArea.style.width = "100%";
  headersArea.value = headersToString(record.requestHeaders);
  block.appendChild(headersArea);

  const bodyLabel = document.createElement("div");
  bodyLabel.style.marginTop = "6px";
  bodyLabel.textContent = "Body";
  block.appendChild(bodyLabel);

  const bodyArea = document.createElement("textarea");
  bodyArea.rows = 4;
  bodyArea.style.width = "100%";
  bodyArea.value = record.requestBodyText || formatBody(record.requestBody);
  block.appendChild(bodyArea);

  const button = document.createElement("button");
  button.textContent = "Send replay";
  button.style.marginTop = "6px";
  block.appendChild(button);
  
  // Add option to use agent for localhost requests
  const useAgentCheckbox = document.createElement("input");
  useAgentCheckbox.type = "checkbox";
  useAgentCheckbox.id = "useAgent";
  useAgentCheckbox.style.marginLeft = "8px";
  
  const useAgentLabel = document.createElement("label");
  useAgentLabel.textContent = "Use local agent";
  useAgentLabel.style.fontSize = "11px";
  useAgentLabel.setAttribute("for", "useAgent");
  
  block.appendChild(useAgentCheckbox);
  block.appendChild(useAgentLabel);

  const resultBox = document.createElement("div");
  resultBox.style.marginTop = "8px";
  block.appendChild(resultBox);

  button.onclick = async () => {
    button.disabled = true;
    resultBox.textContent = "Sending replay...";
    try {
      const payload = {
        method: methodInput.value.trim() || "GET",
        url: urlInput.value.trim(),
        headers: parseHeaders(headersArea.value),
        body: bodyArea.value || null,
      };
      
      let response;
      
      // Check if agent should be used
      if (useAgentCheckbox.checked && window.agentService) {
        resultBox.textContent = "Sending via local agent...";
        response = await window.agentService.replayViaAgent(payload);
        
        if (!response.success) {
          throw new Error(response.error || 'Agent replay failed');
        }
        
        // Transform agent response to match expected format
        response = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          bodyPreview: response.body,
          duration: response.duration
        };
      } else {
        response = await sendReplay(payload);
      }
      
      renderReplayResult(resultBox, response, record);
    } catch (err) {
      resultBox.textContent = `Replay failed: ${err.message}`;
    } finally {
      button.disabled = false;
    }
  };

  return block;
}

function headersToString(headers) {
  if (!headers?.length) return "";
  return headers
    .map((header) => `${header.name}: ${header.value}`)
    .join("\n");
}

function parseHeaders(value) {
  const lines = value.split("\n");
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(":");
      return { name: name.trim(), value: rest.join(":").trim() };
    });
}

async function sendReplay(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "REPLAY_REQUEST", payload }, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res) return reject(new Error("No response"));
      if (res.success) return resolve(res);
      reject(new Error(res.error || "Replay failed"));
    });
  });
}

function renderReplayResult(target, data, record) {
  target.innerHTML = `
    <div><strong>Status:</strong> ${data.status} ${data.statusText || ""}</div>
    <div><strong>Duration:</strong> ${data.duration?.toFixed(1) || "—"} ms</div>
  `;

  if (data.headers?.length) {
    const list = document.createElement("div");
    list.style.fontSize = "11px";
    list.style.marginTop = "4px";
    list.innerHTML = `<strong>Response headers:</strong>`;
    data.headers.forEach((header) => {
      const row = document.createElement("div");
      row.textContent = `${header.name}: ${header.value}`;
      list.appendChild(row);
    });
    target.appendChild(list);
  }

  if (data.bodyPreview) {
    const pre = document.createElement("pre");
    pre.textContent = data.bodyPreview;
    pre.style.maxHeight = "120px";
    pre.style.overflow = "auto";
    pre.style.fontSize = "11px";
    pre.style.marginTop = "6px";
    target.appendChild(pre);
  }

  // Diff section: compare original vs replay response
  const diffBlock = document.createElement("div");
  diffBlock.style.marginTop = "12px";
  const diffHeader = document.createElement("h2");
  diffHeader.textContent = "Diff";
  diffBlock.appendChild(diffHeader);
  // Status diff
  const statusDiff = window.diffStatus(record.statusCode, data.status);
  const sd = document.createElement("div");
  sd.textContent = `Status: ${statusDiff.original} → ${statusDiff.replay}`;
  diffBlock.appendChild(sd);
  // Response headers diff
  const hdrDiff = window.diffHeaders(record.responseHeaders, data.headers);
  if (hdrDiff.added.length || hdrDiff.removed.length || hdrDiff.changed.length) {
    const sub = document.createElement("div");
    sub.style.marginTop = "6px";
    sub.innerHTML = `<strong>Response headers changes:</strong>`;
    hdrDiff.added.forEach(h => {
      const row = document.createElement("div");
      row.style.color = "green";
      row.textContent = `+ ${h.name}: ${h.value}`;
      sub.appendChild(row);
    });
    hdrDiff.removed.forEach(h => {
      const row = document.createElement("div");
      row.style.color = "red";
      row.textContent = `- ${h.name}: ${h.value}`;
      sub.appendChild(row);
    });
    hdrDiff.changed.forEach(h => {
      const row = document.createElement("div");
      row.style.color = "orange";
      row.textContent = `~ ${h.name}: ${h.replayValue} (was ${h.originalValue})`;
      sub.appendChild(row);
    });
    diffBlock.appendChild(sub);
  }
  target.appendChild(diffBlock);
}

function renderDiagnostics(record) {
  if (!window.analyzeRequest) return null;
  
  const diagnostics = window.analyzeRequest(record);
  if (!diagnostics || !diagnostics.length) return null;
  
  const container = document.createElement("div");
  container.style.marginTop = "12px";
  container.style.padding = "8px";
  container.style.border = "1px solid #ddd";
  container.style.borderRadius = "4px";
  
  const heading = document.createElement("h2");
  heading.textContent = "Diagnostics";
  container.appendChild(heading);
  
  diagnostics.forEach(diag => {
    const block = document.createElement("div");
    block.style.marginTop = "8px";
    block.style.padding = "6px";
    block.style.borderLeft = `3px solid ${getSeverityColor(diag.severity)}`;
    block.style.background = "#f9f9f9";
    
    const title = document.createElement("div");
    title.style.fontWeight = "bold";
    title.style.fontSize = "12px";
    title.textContent = `${getSeverityIcon(diag.severity)} ${diag.title}`;
    block.appendChild(title);
    
    const explanation = document.createElement("div");
    explanation.style.marginTop = "4px";
    explanation.style.fontSize = "11px";
    explanation.style.color = "#333";
    explanation.textContent = diag.explanation;
    block.appendChild(explanation);
    
    if (diag.evidence && diag.evidence.length) {
      const evidenceDiv = document.createElement("div");
      evidenceDiv.style.marginTop = "6px";
      evidenceDiv.style.fontSize = "10px";
      evidenceDiv.style.color = "#666";
      evidenceDiv.innerHTML = "<strong>Evidence:</strong>";
      
      const ul = document.createElement("ul");
      ul.style.margin = "4px 0";
      ul.style.paddingLeft = "16px";
      
      diag.evidence.forEach(e => {
        const li = document.createElement("li");
        li.textContent = `${e.description}: ${e.value}`;
        ul.appendChild(li);
      });
      
      evidenceDiv.appendChild(ul);
      block.appendChild(evidenceDiv);
    }
    
    if (diag.suggestions && diag.suggestions.length) {
      const suggestionsDiv = document.createElement("div");
      suggestionsDiv.style.marginTop = "6px";
      suggestionsDiv.style.fontSize = "10px";
      suggestionsDiv.style.color = "#555";
      suggestionsDiv.innerHTML = "<strong>Suggestions:</strong>";
      
      const ul = document.createElement("ul");
      ul.style.margin = "4px 0";
      ul.style.paddingLeft = "16px";
      
      diag.suggestions.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s;
        ul.appendChild(li);
      });
      
      suggestionsDiv.appendChild(ul);
      block.appendChild(suggestionsDiv);
    }
    
    const confidence = document.createElement("div");
    confidence.style.marginTop = "4px";
    confidence.style.fontSize = "9px";
    confidence.style.color = "#888";
    confidence.textContent = `Confidence: ${Math.round(diag.confidence * 100)}%`;
    block.appendChild(confidence);
    
    container.appendChild(block);
  });
  
  return container;
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'error': return '#d32f2f';
    case 'warning': return '#f57c00';
    case 'info': return '#1976d2';
    default: return '#888';
  }
}

function getSeverityIcon(severity) {
  switch (severity) {
    case 'error': return '🔴';
    case 'warning': return '🟠';
    case 'info': return '🔵';
    default: return '⚪';
  }
}

function renderExportBlock(record) {
  if (!window.exportHelpers) return null;
  
  const container = document.createElement("div");
  container.style.marginTop = "12px";
  container.style.padding = "8px";
  container.style.border = "1px solid #ddd";
  container.style.borderRadius = "4px";
  
  const heading = document.createElement("h2");
  heading.textContent = "Export";
  container.appendChild(heading);
  
  const buttonGroup = document.createElement("div");
  buttonGroup.style.display = "flex";
  buttonGroup.style.gap = "6px";
  buttonGroup.style.flexWrap = "wrap";
  
  const btnCurl = document.createElement("button");
  btnCurl.textContent = "Copy as cURL";
  btnCurl.onclick = async () => {
    const curl = window.exportHelpers.toCurl(record);
    const ok = await window.exportHelpers.copyToClipboard(curl);
    btnCurl.textContent = ok ? "Copied!" : "Failed";
    setTimeout(() => btnCurl.textContent = "Copy as cURL", 1500);
  };
  buttonGroup.appendChild(btnCurl);
  
  const btnFetch = document.createElement("button");
  btnFetch.textContent = "Copy as Fetch";
  btnFetch.onclick = async () => {
    const fetch = window.exportHelpers.toFetch(record);
    const ok = await window.exportHelpers.copyToClipboard(fetch);
    btnFetch.textContent = ok ? "Copied!" : "Failed";
    setTimeout(() => btnFetch.textContent = "Copy as Fetch", 1500);
  };
  buttonGroup.appendChild(btnFetch);
  
  const btnJson = document.createElement("button");
  btnJson.textContent = "Copy as JSON";
  btnJson.onclick = async () => {
    const json = window.exportHelpers.toJson(record);
    const ok = await window.exportHelpers.copyToClipboard(json);
    btnJson.textContent = ok ? "Copied!" : "Failed";
    setTimeout(() => btnJson.textContent = "Copy as JSON", 1500);
  };
  buttonGroup.appendChild(btnJson);
  
  container.appendChild(buttonGroup);
  
  const preview = document.createElement("pre");
  preview.style.marginTop = "8px";
  preview.style.maxHeight = "120px";
  preview.style.overflow = "auto";
  preview.style.fontSize = "10px";
  preview.style.background = "#f5f5f5";
  preview.style.padding = "6px";
  preview.textContent = window.exportHelpers.toCurl(record);
  container.appendChild(preview);

  return container;
}

function renderSaveToCollectionBlock(record) {
  if (!window.collectionsHelpers) return null;
  
  const container = document.createElement("div");
  container.style.marginTop = "12px";
  container.style.padding = "8px";
  container.style.border = "1px solid #ddd";
  container.style.borderRadius = "4px";
  
  const heading = document.createElement("h2");
  heading.textContent = "Save to Collection";
  container.appendChild(heading);
  
  const nameInput = document.createElement("input");
  nameInput.placeholder = "Request name (optional)";
  nameInput.style.width = "100%";
  nameInput.style.marginBottom = "6px";
  nameInput.style.padding = "4px";
  nameInput.style.fontSize = "11px";
  container.appendChild(nameInput);
  
  const tagsInput = document.createElement("input");
  tagsInput.placeholder = "Tags (comma-separated)";
  tagsInput.style.width = "100%";
  tagsInput.style.marginBottom = "6px";
  tagsInput.style.padding = "4px";
  tagsInput.style.fontSize = "11px";
  container.appendChild(tagsInput);
  
  const collectionSelect = document.createElement("select");
  collectionSelect.style.width = "100%";
  collectionSelect.style.marginBottom = "6px";
  collectionSelect.style.padding = "4px";
  collectionSelect.style.fontSize = "11px";
  
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select collection...";
  collectionSelect.appendChild(defaultOption);
  
  // Populate collections asynchronously
  window.collectionsHelpers.getAllCollections().then(collections => {
    collections.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      collectionSelect.appendChild(opt);
    });
  });
  
  container.appendChild(collectionSelect);
  
  const newCollectionGroup = document.createElement("div");
  newCollectionGroup.style.marginBottom = "6px";
  
  const newCollectionInput = document.createElement("input");
  newCollectionInput.placeholder = "Or create new collection";
  newCollectionInput.style.width = "100%";
  newCollectionInput.style.padding = "4px";
  newCollectionInput.style.fontSize = "11px";
  newCollectionGroup.appendChild(newCollectionInput);
  
  container.appendChild(newCollectionGroup);
  
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Request";
  saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const collectionId = collectionSelect.value;
    const newCollectionName = newCollectionInput.value.trim();
    
    try {
      let targetCollectionId = collectionId;
      
      if (!targetCollectionId && newCollectionName) {
        const newCollection = await window.collectionsHelpers.createCollection(newCollectionName);
        targetCollectionId = newCollection.id;
      }
      
      if (!targetCollectionId) {
        alert("Please select or create a collection");
        return;
      }
      
      await window.collectionsHelpers.saveRequestToCollection(
        targetCollectionId,
        record,
        name,
        tags
      );
      
      saveBtn.textContent = "Saved!";
      setTimeout(() => saveBtn.textContent = "Save Request", 1500);
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to save request");
    }
  };
  container.appendChild(saveBtn);
  
  return container;
}
