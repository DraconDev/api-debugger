/* Sync service - manage sync between extension and backend */

const API_URL = 'http://localhost:4321/api';
const AUTH_TOKEN_KEY = 'api_debugger_auth_token';
const USER_KEY = 'api_debugger_user';

async function getAuthToken() {
  const res = await chrome.storage.local.get([AUTH_TOKEN_KEY]);
  return res[AUTH_TOKEN_KEY] || null;
}

async function setAuthToken(token) {
  await chrome.storage.local.set({ [AUTH_TOKEN_KEY]: token });
}

async function getUser() {
  const res = await chrome.storage.local.get([USER_KEY]);
  return res[USER_KEY] || null;
}

async function setUser(user) {
  await chrome.storage.local.set({ [USER_KEY]: user });
}

async function clearAuth() {
  await chrome.storage.local.remove([AUTH_TOKEN_KEY, USER_KEY]);
}

async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
}

// Auth functions
async function register(email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (data.success) {
    await setAuthToken(data.token);
    await setUser(data.user);
  }
  
  return data;
}

async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (data.success) {
    await setAuthToken(data.token);
    await setUser(data.user);
  }
  
  return data;
}

async function logout() {
  await clearAuth();
}

async function getCurrentUser() {
  const user = await getUser();
  if (!user) return null;
  
  try {
    const data = await apiRequest('/auth/me');
    return data.user;
  } catch (e) {
    await clearAuth();
    return null;
  }
}

// Sync functions
async function pushChanges(collections, savedRequests) {
  return apiRequest('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ collections, savedRequests })
  });
}

async function pullChanges() {
  return apiRequest('/sync/pull');
}

async function syncCollections() {
  const localCollections = await window.collectionsHelpers.getAllCollections();
  const localRequests = await window.collectionsHelpers.getAllSavedRequests();
  
  // Push local changes
  await pushChanges(localCollections, localRequests);
  
  // Pull remote changes
  const remote = await pullChanges();
  
  // Merge - for now, prefer remote versions
  await chrome.storage.local.set({
    collections: remote.collections,
    savedRequests: remote.savedRequests
  });
  
  return {
    collections: remote.collections,
    savedRequests: remote.savedRequests
  };
}

window.syncService = {
  getAuthToken,
  getUser,
  register,
  login,
  logout,
  getCurrentUser,
  pushChanges,
  pullChanges,
  syncCollections
};
