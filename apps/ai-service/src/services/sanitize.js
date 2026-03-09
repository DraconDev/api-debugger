/* Sanitize request data before sending to AI */
function sanitizeRequest(data) {
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Redact sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'api-key',
    'apikey',
    'access-token',
    'x-access-token'
  ];
  
  if (sanitized.requestHeaders) {
    sanitized.requestHeaders = sanitized.requestHeaders.map(h => {
      const lowerName = h.name.toLowerCase();
      if (sensitiveHeaders.some(s => lowerName.includes(s))) {
        return { name: h.name, value: '[REDACTED]' };
      }
      return h;
    });
  }
  
  if (sanitized.responseHeaders) {
    sanitized.responseHeaders = sanitized.responseHeaders.map(h => {
      const lowerName = h.name.toLowerCase();
      if (sensitiveHeaders.some(s => lowerName.includes(s))) {
        return { name: h.name, value: '[REDACTED]' };
      }
      return h;
    });
  }
  
  // Redact sensitive URL params
  if (sanitized.url) {
    try {
      const url = new URL(sanitized.url);
      const sensitiveParams = ['api_key', 'apikey', 'key', 'token', 'access_token', 'secret'];
      url.searchParams.forEach((value, key) => {
        if (sensitiveParams.some(s => key.toLowerCase().includes(s))) {
          url.searchParams.set(key, '[REDACTED]');
        }
      });
      sanitized.url = url.toString();
    } catch (e) {
      // Invalid URL, keep as is
    }
  }
  
  // Redact body secrets
  if (sanitized.requestBodyText) {
    const patterns = [
      { regex: /"password"\s*:\s*"[^"]*"/gi, replace: '"password":"[REDACTED]"' },
      { regex: /"token"\s*:\s*"[^"]*"/gi, replace: '"token":"[REDACTED]"' },
      { regex: /"secret"\s*:\s*"[^"]*"/gi, replace: '"secret":"[REDACTED]"' },
      { regex: /"apiKey"\s*:\s*"[^"]*"/gi, replace: '"apiKey":"[REDACTED]"' }
    ];
    patterns.forEach(p => {
      sanitized.requestBodyText = sanitized.requestBodyText.replace(p.regex, p.replace);
    });
  }
  
  return sanitized;
}

module.exports = { sanitizeRequest };
