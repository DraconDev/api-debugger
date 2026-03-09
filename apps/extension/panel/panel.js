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
  d.innerHTML = `
  <div style="margin-bottom:8px;">
    <strong>${r.method} ${r.statusCode}</strong>
    <span style="font-size:11px;color:#333;">${r.url}</span>
  </div>
  <div><strong>Type:</strong> ${r.type}</div>
  <div><strong>Tab:</strong> ${r.tabId}</div>
  <div><strong>Time:</strong> ${new Date(r.timeStamp).toLocaleString()}</div>
  <div style="margin-top:8px;font-style:italic;color:#888;">
    Headers and payload preview coming soon.
  </div>
  `;
}
