/* Agent integration - communicate with local agent binary */

const DEFAULT_AGENT_PORT = 47321;
const AGENT_URL_KEY = 'api_debugger_agent_url';

async function getAgentUrl() {
  const res = await chrome.storage.local.get([AGENT_URL_KEY]);
  return res[AGENT_URL_KEY] || `http://localhost:${DEFAULT_AGENT_PORT}`;
}

async function setAgentUrl(url) {
  await chrome.storage.local.set({ [AGENT_URL_KEY]: url });
}

async function checkAgentHealth() {
  try {
    const agentUrl = await getAgentUrl();
    const response = await fetch(`${agentUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) return null;
    
    return await response.json();
  } catch (e) {
    return null;
  }
}

async function replayViaAgent(request) {
  const agentUrl = await getAgentUrl();
  
  const response = await fetch(`${agentUrl}/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      timeout: request.timeout || 30000
    })
  });
  
  return await response.json();
}

async function discoverLocalPorts(ports) {
  const agentUrl = await getAgentUrl();
  
  const response = await fetch(`${agentUrl}/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ports })
  });
  
  return await response.json();
}

window.agentService = {
  getAgentUrl,
  setAgentUrl,
  checkAgentHealth,
  replayViaAgent,
  discoverLocalPorts
};
