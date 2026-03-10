# API Debugger Agent

Local binary for localhost and private network access.

## Purpose

The browser extension cannot access:
- `localhost` endpoints
- Private network IPs (192.168.x.x, 10.x.x.x)
- Corporate intranet resources

The agent solves this by running locally and proxying requests.

## Installation

```bash
cd apps/agent
npm install
npm link  # Makes 'apidbg' available globally
```

## Usage

### Start the agent
```bash
apidbg serve
# or with custom port
apidbg serve 3000
```

### Run diagnostics
```bash
apidbg doctor
```

### Get help
```bash
apidbg help
```

## API Endpoints

### Health Check
```
GET /health
```

### Replay Request
```
POST /replay
{
  "url": "http://localhost:3000/api/data",
  "method": "POST",
  "headers": { "Content-Type": "application/json" },
  "body": "{\"test\": true}"
}
```

### Discover Local Endpoints
```
POST /discover
{
  "ports": [3000, 8080, 5000, 4000]
}
```

## Security

- Only HTTP/HTTPS protocols allowed
- Request body limited to 1MB
- Configurable timeout (default: 30s)
- CORS restricted to extension origins

## Future Features

- WebSocket proxying
- gRPC support
- Request recording
- Certificate handling
- Custom proxy rules
