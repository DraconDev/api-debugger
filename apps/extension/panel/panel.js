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

  const requests = await getRequests();

  if (!requests.length) {
    list.textContent = "No requests captured yet.";
    return;
  }

  requests.forEach((r) => list.appendChild(row(r)));
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

  const resultBox = document.createElement("div");
  resultBox.style.marginTop = "8px";
  block.appendChild(resultBox);

  button.onclick = async () => {
    button.disabled = true;
    resultBox.textContent = "Sending replay...";
    try {
      const response = await sendReplay({
        method: methodInput.value.trim() || "GET",
        url: urlInput.value.trim(),
        headers: parseHeaders(headersArea.value),
        body: bodyArea.value || null,
      });
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
