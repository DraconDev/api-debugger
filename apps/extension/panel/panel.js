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
