const express = require('express');
const cors = require('cors');
const http = require('http');
const { URL } = require('url');

class Agent {
  constructor(options = {}) {
    this.port = options.port || 47321;
    this.app = express();
    this.server = null;
    this.activeRequests = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    this.app.use(cors({
      origin: ['chrome-extension://*', 'http://localhost:*'],
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '50mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '0.1.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Replay request to localhost/private network
    this.app.post('/replay', async (req, res) => {
      const { url, method, headers, body, timeout } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      // Validate URL
      try {
        const parsedUrl = new URL(url);
        
        // Only allow http/https
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return res.status(400).json({ error: 'Only HTTP/HTTPS protocols are supported' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Invalid URL' });
      }
      
      const startTime = Date.now();
      
      try {
        const response = await this.makeRequest({
          url,
          method: method || 'GET',
          headers: headers || {},
          body: body,
          timeout: timeout || 30000
        });
        
        const duration = Date.now() - startTime;
        
        res.json({
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          body: response.body,
          duration
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        res.json({
          success: false,
          error: error.message,
          code: error.code || 'UNKNOWN',
          duration
        });
      }
    });
    
    // Get localhost endpoints (discovery)
    this.app.post('/discover', async (req, res) => {
      const { ports } = req.body;
      
      if (!Array.isArray(ports)) {
        return res.status(400).json({ error: 'ports must be an array' });
      }
      
      const results = [];
      
      for (const port of ports.slice(0, 20)) { // Limit to 20 ports
        try {
          const response = await this.makeRequest({
            url: `http://localhost:${port}/`,
            method: 'GET',
            timeout: 2000
          });
          
          if (response.status < 500) {
            results.push({
              port,
              status: response.status,
              available: true
            });
          }
        } catch (e) {
          // Port not available
        }
      }
      
      res.json({ success: true, results });
    });
    
    // Proxy WebSocket connections (future)
    this.app.post('/ws-proxy', (req, res) => {
      res.status(501).json({
        error: 'WebSocket proxying not yet implemented',
        message: 'This feature will be available in a future version'
      });
    });
    
    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }
  
  async makeRequest({ url, method, headers, body, timeout }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const options = {
        method,
        headers: {
          'User-Agent': 'API-Debugger-Agent/0.1.0',
          ...headers
        },
        signal: controller.signal
      };
      
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      
      clearTimeout(timeoutId);
      
      const responseBody = await response.text();
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: responseBody.slice(0, 1024 * 1024) // Limit to 1MB
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`
╔══════════════════════════════════════════╗
║   API Debugger Agent                     ║
║   Version: 0.1.0                         ║
╠══════════════════════════════════════════╣
║   Status: Running                        ║
║   Port: ${this.port}                              ║
║   Health: http://localhost:${this.port}/health   ║
╚══════════════════════════════════════════╝

Waiting for requests from extension...
Press Ctrl+C to stop.
`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      this.server.close(() => {
        console.log('Agent stopped.');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      this.server.close(() => {
        process.exit(0);
      });
    });
  }
  
  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = Agent;

// If run directly
if (require.main === module) {
  const agent = new Agent();
  agent.start();
}
