/**
 * OAuth 2.0 token fetching utilities for Chrome extensions
 * Supports: Client Credentials, Authorization Code + PKCE
 */

export type OAuth2Flow = "client_credentials" | "authorization_code";

export interface OAuth2Config {
  flow: OAuth2Flow;
  accessTokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scope: string;
  // For authorization code + PKCE
  authorizationUrl?: string;
  redirectUri?: string;
  // Result
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

/**
 * Generate a random code verifier for PKCE (RFC 7636)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate code challenge from verifier (SHA-256)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Exchange authorization code for tokens (PKCE)
 */
async function exchangeCodeForToken(
  code: string,
  config: OAuth2Config,
  codeVerifier: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri || "https://localhost/callback",
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(config.accessTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Get token via Client Credentials flow
 */
export async function getClientCredentialsToken(
  config: OAuth2Config,
): Promise<{ accessToken: string; tokenType: string; expiresAt?: number }> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    scope: config.scope,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(config.accessTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "Bearer",
    expiresAt: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
  };
}

/**
 * Start Authorization Code + PKCE flow
 * Opens browser tab for user to authorize, returns a promise that resolves with the token
 */
export async function startPKCEFlow(
  config: OAuth2Config,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}> {
  if (!config.authorizationUrl) {
    throw new Error("Authorization URL is required for PKCE flow");
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();
  const redirectUri = config.redirectUri || "https://localhost/callback";

  // Store PKCE state for the callback
  await chrome.storage.session.set({
    oauth2_pkce: { codeVerifier, state, redirectUri, config },
  });

  // Build authorization URL
  const authUrl = new URL(config.authorizationUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // Open authorization page in new tab
  const tab = await chrome.tabs.create({ url: authUrl.toString() });

  // Wait for the redirect with auth code
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        chrome.tabs.onUpdated.removeListener(listener);
        if (tab.id) chrome.tabs.remove(tab.id).catch(() => {});
        reject(new Error("Authorization timed out (5 minutes)"));
      },
      5 * 60 * 1000,
    );

    const listener = async (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ) => {
      if (tabId !== tab.id || !changeInfo.url) return;

      const url = new URL(changeInfo.url);

      // Check if this is our redirect
      if (
        url.origin + url.pathname === redirectUri ||
        url.origin + url.pathname === "https://localhost/callback"
      ) {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);

        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        // Close the auth tab
        if (tab.id) chrome.tabs.remove(tab.id).catch(() => {});

        if (error) {
          reject(new Error(`Authorization denied: ${error}`));
          return;
        }

        if (!code) {
          reject(new Error("No authorization code received"));
          return;
        }

        if (returnedState !== state) {
          reject(new Error("State mismatch - possible CSRF attack"));
          return;
        }

        try {
          const tokenData = await exchangeCodeForToken(
            code,
            config,
            codeVerifier,
          );
          resolve({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenType: tokenData.token_type || "Bearer",
            expiresAt: tokenData.expires_in
              ? Date.now() + tokenData.expires_in * 1000
              : undefined,
          });
        } catch (err) {
          reject(err);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Get a token using the appropriate flow
 */
export async function getOAuth2Token(
  config: OAuth2Config,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}> {
  if (config.flow === "client_credentials") {
    return getClientCredentialsToken(config);
  } else {
    return startPKCEFlow(config);
  }
}
