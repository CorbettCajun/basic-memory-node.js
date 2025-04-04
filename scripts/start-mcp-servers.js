import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const MCP_CONFIG_PATH = path.join(process.env.USERPROFILE, '.codeium', 'windsurf', 'mcp_config.json');

function loadMCPConfig() {
    try {
        const configContent = fs.readFileSync(MCP_CONFIG_PATH, 'utf8');
        return JSON.parse(configContent);
    } catch (error) {
        console.error('Error reading MCP config:', error);
        return null;
    }
}

function startMCPServers() {
    const config = loadMCPConfig();
    if (!config || !config.mcpServers) {
        console.error('Invalid MCP configuration');
        return;
    }

    Object.entries(config.mcpServers).forEach(([serverName, serverConfig]) => {
        // Skip disabled servers
        if (serverConfig.disabled) {
            console.log(`Skipping disabled server: ${serverName}`);
            return;
        }

        // Prepare environment variables
        const env = { ...process.env, ...(serverConfig.env || {}) };

        // Spawn the server process
        const serverProcess = spawn(serverConfig.command, serverConfig.args, { 
            env, 
            stdio: 'inherit',
            shell: true 
        });

        console.log(`Started ${serverName} server (PID: ${serverProcess.pid})`);

        // Basic error handling
        serverProcess.on('error', (err) => {
            console.error(`Error starting ${serverName} server:`, err);
        });

        serverProcess.on('exit', (code, signal) => {
            console.log(`${serverName} server exited with code ${code} and signal ${signal}`);
        });
    });
}

startMCPServers();
