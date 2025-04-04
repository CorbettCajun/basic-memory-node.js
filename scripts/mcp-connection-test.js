import { createServer } from 'net';
import { EventEmitter } from 'events';

// Increase max listeners
EventEmitter.defaultMaxListeners = 50;

function testMCPConnection(host = 'localhost', port = 8766) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to connect to MCP server at ${host}:${port}`);
        
        const client = new createServer();
        
        client.on('connection', (socket) => {
            console.log('Connection established successfully');
            socket.end();
            resolve(true);
        });

        client.on('error', (err) => {
            console.error('Connection error:', err);
            reject(err);
        });

        client.listen(port, host, () => {
            console.log(`Listening on ${host}:${port}`);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            client.close();
            reject(new Error('Connection timeout'));
        }, 10000);
    });
}

async function runDiagnostics() {
    try {
        await testMCPConnection();
        console.log('MCP Server connection test passed');
    } catch (error) {
        console.error('MCP Server connection test failed:', error);
        process.exit(1);
    }
}

runDiagnostics();
