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
      renderReplayResult(resultBox, response);
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

function renderReplayResult(target, data) {
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
}
