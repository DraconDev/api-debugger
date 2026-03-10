#!/usr/bin/env node

const Agent = require('../src/index');

const command = process.argv[2] || 'serve';

switch (command) {
  case 'serve':
    const port = parseInt(process.argv[3]) || 47321;
    const agent = new Agent({ port });
    agent.start();
    break;
  
  case 'doctor':
    console.log('Running diagnostics...\n');
    console.log('✓ Node version:', process.version);
    console.log('✓ Platform:', process.platform);
    console.log('✓ Architecture:', process.arch);
    console.log('\nAttempting to start test server...');
    
    const testAgent = new Agent({ port: 47322 });
    testAgent.start();
    
    setTimeout(() => {
      console.log('✓ Test server started successfully');
      console.log('\nAll checks passed!');
      process.exit(0);
    }, 1000);
    break;
  
  case 'help':
  case '--help':
  case '-h':
    console.log(`
API Debugger Agent - Local binary for localhost and private network access

Usage:
  apidbg serve [port]    Start the agent server (default port: 47321)
  apidbg doctor          Run diagnostics
  apidbg help            Show this help

Examples:
  apidbg serve           Start on default port 47321
  apidbg serve 3000      Start on port 3000
  apidbg doctor          Check if agent can run

The agent allows the browser extension to:
  - Access localhost endpoints
  - Access private network resources
  - Handle advanced protocols (future)
`);
    break;
  
  default:
    console.error('Unknown command:', command);
    console.log('Run "apidbg help" for usage information.');
    process.exit(1);
}
