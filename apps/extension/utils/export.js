/* Export helper functions - generate curl, fetch, and JSON exports */

function toCurl(record) {
  const parts = [`curl -X ${record.method}`];
  
  // Add headers
  if (record.requestHeaders) {
    record.requestHeaders.forEach(h => {
      parts.push(`-H '${h.name}: ${h.value}'`);
    });
  }
  
  // Add body
  if (record.requestBodyText) {
    parts.push(`-d '${record.requestBodyText}'`);
  }
  
  // Add URL
  parts.push(`'${record.url}'`);
  
  return parts.join(' \\\n  ');
}

function toFetch(record) {
  const headers = {};
  if (record.requestHeaders) {
    record.requestHeaders.forEach(h => {
      headers[h.name] = h.value;
    });
  }
  
  const options = {
    method: record.method,
    headers
  };
  
  if (record.requestBodyText) {
    options.body = record.requestBodyText;
  }
  
  return `fetch('${record.url}', ${JSON.stringify(options, null, 2)});`;
}

function toJson(record) {
  const exportData = {
    method: record.method,
    url: record.url,
    headers: {},
    body: null,
    metadata: {
      statusCode: record.statusCode,
      timestamp: record.timeStamp,
      duration: record.duration
    }
  };
  
  if (record.requestHeaders) {
    record.requestHeaders.forEach(h => {
      exportData.headers[h.name] = h.value;
    });
  }
  
  if (record.requestBodyText) {
    exportData.body = record.requestBodyText;
  }
  
  return JSON.stringify(exportData, null, 2);
}

function fromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    const record = {
      method: data.method || 'GET',
      url: data.url || '',
      requestHeaders: [],
      requestBodyText: data.body || null,
      statusCode: data.metadata?.statusCode || 0,
      timeStamp: data.metadata?.timestamp || Date.now(),
      duration: data.metadata?.duration
    };
    
    if (data.headers) {
      record.requestHeaders = Object.entries(data.headers).map(([name, value]) => ({
        name,
        value
      }));
    }
    
    return record;
  } catch (e) {
    console.error('Failed to parse import JSON:', e);
    return null;
  }
}

// Copy to clipboard helper
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('Failed to copy:', e);
    return false;
  }
}

window.exportHelpers = {
  toCurl,
  toFetch,
  toJson,
  fromJson,
  copyToClipboard
};
