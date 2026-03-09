/* Deterministic diagnostics engine for API request failures */

function analyzeRequest(record) {
  const diagnostics = [];

  // Status-based diagnostics
  diagnostics.push(...detectStatusIssues(record));

  // CORS diagnostics
  diagnostics.push(...detectCorsIssues(record));

  // Content type diagnostics
  diagnostics.push(...detectContentTypeIssues(record));

  // Timing diagnostics
  diagnostics.push(...detectTimingIssues(record));

  // Rate limiting
  diagnostics.push(...detectRateLimiting(record));

  // Sort by confidence (highest first)
  diagnostics.sort((a, b) => b.confidence - a.confidence);

  return diagnostics;
}

function detectStatusIssues(record) {
  const diagnostics = [];

  // 401 - Authentication issues
  if (record.statusCode === 401) {
    const authHeader = findHeader(record.requestHeaders, 'authorization');
    if (!authHeader) {
      diagnostics.push({
        type: 'auth_missing',
        severity: 'error',
        title: 'Missing authentication',
        explanation: 'The request was rejected because no authentication credentials were provided.',
        evidence: [
          { source: 'response', field: 'statusCode', value: '401', description: 'Unauthorized status code' },
          { source: 'headers', field: 'Authorization', value: '(missing)', description: 'No Authorization header in request' }
        ],
        suggestions: [
          'Add an Authorization header with a valid token',
          'Check if the endpoint requires Bearer token or Basic authentication',
          'Verify you are logged in or have a valid API key'
        ],
        confidence: 0.95
      });
    } else {
      diagnostics.push({
        type: 'auth_invalid',
        severity: 'error',
        title: 'Invalid or expired authentication',
        explanation: 'Authentication credentials were provided but were rejected by the server.',
        evidence: [
          { source: 'response', field: 'statusCode', value: '401', description: 'Unauthorized status code' },
          { source: 'headers', field: 'Authorization', value: '(present)', description: 'Authorization header was sent' }
        ],
        suggestions: [
          'Check if the token has expired',
          'Verify the token format is correct (Bearer vs Basic)',
          'Ensure the token has the required scopes/permissions',
          'Try refreshing or re-obtaining the token'
        ],
        confidence: 0.85
      });
    }
  }

  // 403 - Permission issues
  if (record.statusCode === 403) {
    diagnostics.push({
      type: 'permission_denied',
      severity: 'error',
      title: 'Permission denied',
      explanation: 'The server understood the request but refuses to authorize it.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '403', description: 'Forbidden status code' }
      ],
      suggestions: [
        'Check if you have the required permissions for this resource',
        'Verify your account has access to this endpoint',
        'Check if the resource requires specific roles or scopes',
        'Ensure the request is coming from an allowed origin/IP'
      ],
      confidence: 0.9
    });
  }

  // 404 - Not found
  if (record.statusCode === 404) {
    diagnostics.push({
      type: 'not_found',
      severity: 'error',
      title: 'Resource not found',
      explanation: 'The requested resource could not be found on the server.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '404', description: 'Not Found status code' }
      ],
      suggestions: [
        'Verify the URL is correct',
        'Check if the resource ID in the path exists',
        'Ensure the API endpoint path is valid',
        'The resource may have been deleted or moved'
      ],
      confidence: 0.95
    });
  }

  // 400 - Bad request
  if (record.statusCode === 400) {
    diagnostics.push({
      type: 'bad_request',
      severity: 'error',
      title: 'Bad request',
      explanation: 'The server could not understand the request due to invalid syntax or malformed data.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '400', description: 'Bad Request status code' }
      ],
      suggestions: [
        'Check request body format (valid JSON?)',
        'Verify all required fields are present',
        'Ensure field types are correct',
        'Check for syntax errors in headers or parameters'
      ],
      confidence: 0.85
    });
  }

  // 422 - Unprocessable entity
  if (record.statusCode === 422) {
    diagnostics.push({
      type: 'validation_failed',
      severity: 'error',
      title: 'Validation failed',
      explanation: 'The request was well-formed but contains semantic errors that prevent processing.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '422', description: 'Unprocessable Entity status code' }
      ],
      suggestions: [
        'Check response body for validation error details',
        'Verify field values meet validation rules',
        'Ensure unique constraints are not violated',
        'Check data types and formats are correct'
      ],
      confidence: 0.9
    });
  }

  // 500 - Internal server error
  if (record.statusCode === 500) {
    diagnostics.push({
      type: 'server_error',
      severity: 'error',
      title: 'Internal server error',
      explanation: 'The server encountered an unexpected condition that prevented it from fulfilling the request.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '500', description: 'Internal Server Error status code' }
      ],
      suggestions: [
        'This is a server-side issue, not a problem with your request',
        'Try the request again later',
        'Check if there are known issues with the API service',
        'Contact API support if the error persists'
      ],
      confidence: 0.95
    });
  }

  // 502 - Bad gateway
  if (record.statusCode === 502) {
    diagnostics.push({
      type: 'bad_gateway',
      severity: 'error',
      title: 'Bad gateway',
      explanation: 'The server received an invalid response from an upstream server.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '502', description: 'Bad Gateway status code' }
      ],
      suggestions: [
        'The server is acting as a gateway and received an invalid response',
        'This is typically a temporary infrastructure issue',
        'Try the request again in a few moments',
        'Check API status page for known outages'
      ],
      confidence: 0.95
    });
  }

  // 503 - Service unavailable
  if (record.statusCode === 503) {
    diagnostics.push({
      type: 'service_unavailable',
      severity: 'error',
      title: 'Service unavailable',
      explanation: 'The server is currently unable to handle the request due to temporary overloading or maintenance.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '503', description: 'Service Unavailable status code' }
      ],
      suggestions: [
        'The service may be temporarily overloaded',
        'Check if there is scheduled maintenance',
        'Wait and retry the request later',
        'Check for Retry-After header in response'
      ],
      confidence: 0.95
    });
  }

  // 504 - Gateway timeout
  if (record.statusCode === 504) {
    diagnostics.push({
      type: 'gateway_timeout',
      severity: 'error',
      title: 'Gateway timeout',
      explanation: 'The server did not receive a timely response from an upstream server.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '504', description: 'Gateway Timeout status code' }
      ],
      suggestions: [
        'The upstream service took too long to respond',
        'This may indicate backend processing issues',
        'Try again or check if your request is too complex',
        'Contact API support if timeouts persist'
      ],
      confidence: 0.95
    });
  }

  return diagnostics;
}

function detectCorsIssues(record) {
  const diagnostics = [];

  // Check for CORS-related errors (typically visible in browser console)
  const acao = findHeader(record.responseHeaders, 'access-control-allow-origin');
  
  // If request failed (status 0 or network error) and no CORS headers, likely CORS issue
  if ((record.statusCode === 0 || record.statusCode >= 400) && record.type === 'xmlhttprequest') {
    if (!acao) {
      diagnostics.push({
        type: 'cors_missing',
        severity: 'error',
        title: 'CORS policy violation',
        explanation: 'The request was blocked by the browser due to missing CORS headers from the server.',
        evidence: [
          { source: 'headers', field: 'Access-Control-Allow-Origin', value: '(missing)', description: 'No CORS origin header in response' },
          { source: 'request', field: 'type', value: record.type, description: 'Cross-origin request detected' }
        ],
        suggestions: [
          'The server must include Access-Control-Allow-Origin header',
          'Check if the server allows your origin domain',
          'For development, consider using a CORS proxy',
          'Ensure credentials mode matches server CORS configuration'
        ],
        confidence: 0.8
      });
    }
  }

  return diagnostics;
}

function detectContentTypeIssues(record) {
  const diagnostics = [];

  const contentType = findHeader(record.requestHeaders, 'content-type');
  const hasBody = record.requestBody || record.requestBodyText;

  // 415 - Unsupported Media Type
  if (record.statusCode === 415) {
    diagnostics.push({
      type: 'unsupported_media_type',
      severity: 'error',
      title: 'Unsupported media type',
      explanation: 'The server does not support the Content-Type specified in the request.',
      evidence: [
        { source: 'response', field: 'statusCode', value: '415', description: 'Unsupported Media Type status code' },
        { source: 'headers', field: 'Content-Type', value: contentType?.value || '(missing)', description: 'Request Content-Type header' }
      ],
      suggestions: [
        'Check what Content-Type the server expects (application/json, application/xml, etc.)',
        'Add or update the Content-Type header',
        'Ensure the body matches the declared Content-Type'
      ],
      confidence: 0.95
    });
  }

  // Check for JSON parsing issues on 400
  if (record.statusCode === 400 && hasBody && contentType?.value?.includes('json')) {
    const bodyText = record.requestBodyText || '';
    try {
      JSON.parse(bodyText);
    } catch (e) {
      diagnostics.push({
        type: 'json_parse_error',
        severity: 'error',
        title: 'Invalid JSON in request body',
        explanation: 'The request body contains malformed JSON that cannot be parsed.',
        evidence: [
          { source: 'response', field: 'statusCode', value: '400', description: 'Bad Request status code' },
          { source: 'body', field: 'requestBody', value: '(invalid JSON)', description: 'Request body is not valid JSON' }
        ],
        suggestions: [
          'Validate JSON syntax using a JSON linter',
          'Check for missing quotes, commas, or brackets',
          'Ensure proper escaping of special characters',
          'Common issues: trailing commas, unquoted keys, single quotes'
        ],
        confidence: 0.9
      });
    }
  }

  return diagnostics;
}

function detectTimingIssues(record) {
  const diagnostics = [];

  if (typeof record.duration === 'number') {
    // Very slow response
    if (record.duration > 3000) {
      diagnostics.push({
        type: 'slow_response',
        severity: 'warning',
        title: 'Slow response time',
        explanation: `The request took ${(record.duration / 1000).toFixed(1)} seconds to complete.`,
        evidence: [
          { source: 'timing', field: 'duration', value: `${record.duration.toFixed(0)}ms`, description: 'Response time' }
        ],
        suggestions: [
          'Consider optimizing the request',
          'Check if pagination can reduce response size',
          'The server may be experiencing load issues',
          'Monitor for patterns of slow responses'
        ],
        confidence: 0.95
      });
    }
  }

  return diagnostics;
}

function detectRateLimiting(record) {
  const diagnostics = [];

  if (record.statusCode === 429) {
    const retryAfter = findHeader(record.responseHeaders, 'retry-after');
    const retryText = retryAfter ? ` Retry after ${retryAfter.value} seconds.` : '';
    
    diagnostics.push({
      type: 'rate_limited',
      severity: 'error',
      title: 'Rate limit exceeded',
      explanation: `You have sent too many requests in a given amount of time.${retryText}`,
      evidence: [
        { source: 'response', field: 'statusCode', value: '429', description: 'Too Many Requests status code' },
        ...(retryAfter ? [{ source: 'headers', field: 'Retry-After', value: retryAfter.value, description: 'Retry-After header present' }] : [])
      ],
      suggestions: [
        'Wait before sending more requests',
        retryAfter ? `Wait ${retryAfter.value} seconds before retrying` : 'Check Retry-After header for wait time',
        'Implement exponential backoff in your code',
        'Check API documentation for rate limits'
      ],
      confidence: 0.95
    });
  }

  return diagnostics;
}

function findHeader(headers, name) {
  if (!headers || !Array.isArray(headers)) return null;
  const lower = name.toLowerCase();
  return headers.find(h => h.name.toLowerCase() === lower);
}

// Expose globally
window.analyzeRequest = analyzeRequest;
