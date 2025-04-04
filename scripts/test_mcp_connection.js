#!/usr/bin/env node
import MCPConnectionDebugger from '../src/mcp_connection_debugger.js';
import fs from 'fs';
import net from 'net';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to safely stringify objects
const safeStringify = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        const cache = new WeakSet();
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      
      // Handle functions and undefined
      if (typeof value === 'function') return '[Function]';
      if (value === undefined) return '[Undefined]';
      
      return value;
    }, indent);
  } catch (error) {
    return `[Stringify Error: ${error.message}]`;
  }
};

// Advanced logging utility with file output
class AdvancedLogger {
  constructor(logDir = path.join(__dirname, '..', 'logs')) {
    this.logDir = logDir;
    this.logFile = path.join(logDir, `mcp_connection_test_${new Date().toISOString().replace(/:/g, '-')}.log`);
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  _formatMessage(level, ...messages) {
    const timestamp = new Date().toISOString();
    const formattedMessages = messages.map(msg => 
      typeof msg === 'object' ? safeStringify(msg) : String(msg)
    );
    return `[${timestamp}] ${level.toUpperCase()}: ${formattedMessages.join(' ')}`;
  }

  _writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(...messages) {
    const message = this._formatMessage('info', ...messages);
    console.log(message);
    this._writeToFile(message);
  }

  warn(...messages) {
    const message = this._formatMessage('warn', ...messages);
    console.warn(message);
    this._writeToFile(message);
  }

  error(...messages) {
    const message = this._formatMessage('error', ...messages);
    console.error(message);
    this._writeToFile(message);
  }

  debug(...messages) {
    const message = this._formatMessage('debug', ...messages);
    console.debug(message);
    this._writeToFile(message);
  }
}

const logger = new AdvancedLogger();

// Helper diagnostic functions
function getActiveProcesses() {
  try {
    const command = process.platform === 'win32' 
      ? 'tasklist /FI "IMAGENAME eq node.exe"' 
      : 'ps aux | grep node';
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (err) {
    return `Failed to get active processes: ${err.message}`;
  }
}

function getNetworkConnections() {
  try {
    const command = process.platform === 'win32' 
      ? 'netstat -ano | findstr LISTENING' 
      : 'netstat -tuln';
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (err) {
    return `Failed to get network connections: ${err.message}`;
  }
}

function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    pid: process.pid,
    memoryUsage: process.memoryUsage()
  };
}

function getProcessEnvironment() {
  // Safely return process environment, excluding sensitive information
  return {
    NODE_ENV: process.env.NODE_ENV,
    HOME: process.env.HOME ? 'SET' : 'UNSET',
    PATH: process.env.PATH ? 'TRUNCATED' : 'UNSET',
    PWD: process.env.PWD,
    SHELL: process.env.SHELL ? 'SET' : 'UNSET'
  };
}

function getNetworkInterfaces() {
  return Object.entries(os.networkInterfaces())
    .filter(([name, interfaces]) => 
      interfaces.some(iface => iface.family === 'IPv4' && !iface.internal)
    )
    .map(([name, interfaces]) => ({
      name,
      addresses: interfaces
        .filter(iface => iface.family === 'IPv4' && !iface.internal)
        .map(iface => iface.address)
    }));
}

function parseConfig(config, configPath) {
  logger.info(`Parsing configuration from: ${configPath}`);
  
  try {
    // Normalize configuration to a consistent format
    if (config.mcpServers) {
      logger.info('Found mcpServers configuration', { serverCount: Object.keys(config.mcpServers).length });
      return config.mcpServers;
    }
    
    // If config is a single server, wrap it
    if (config.command || config.args || config.env) {
      const serverName = config.name || path.basename(configPath, path.extname(configPath));
      logger.info(`Wrapping single server configuration`, { serverName });
      return { [serverName]: config };
    }

    // If config is a dictionary of servers, return as-is
    if (typeof config === 'object' && Object.keys(config).some(key => 
      config[key].command || config[key].args || config[key].env
    )) {
      logger.info('Found dictionary of server configurations', { serverCount: Object.keys(config).length });
      return config;
    }

    // Attempt to extract server configurations from other fields
    const serverConfigs = {};
    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'object' && (value.command || value.args || value.env)) {
        serverConfigs[key] = value;
      }
    });

    if (Object.keys(serverConfigs).length > 0) {
      logger.info('Extracted server configurations from nested objects', { 
        serverCount: Object.keys(serverConfigs).length 
      });
      return serverConfigs;
    }

    // If no recognizable server configuration found
    logger.warn('Unrecognized configuration format', { configKeys: Object.keys(config) });
    return {};
  } catch (error) {
    logger.error('Failed to parse configuration', { 
      configPath, 
      errorMessage: error.message,
      errorStack: error.stack 
    });
    return {};
  }
}

function extractConnectionInfo(serverName, serverConfig) {
  logger.info(`Extracting connection details for: ${serverName}`, { 
    serverConfig: safeStringify(serverConfig, null, 2) 
  });

  // Ensure serverConfig is a valid object
  if (!serverConfig || typeof serverConfig !== 'object') {
    logger.warn('Invalid server configuration');
    return null;
  }

  // Comprehensive list of connection extraction strategies
  const connectionPatterns = [
    // Strategy 1: Explicit host and port from environment variables
    () => {
      if (serverConfig.env) {
        logger.info('Checking environment variables');
        const hostKeys = Object.keys(serverConfig.env).filter(key => 
          key.toUpperCase().includes('HOST') || 
          key.toUpperCase().includes('SERVER') || 
          key.toUpperCase().includes('URL')
        );
        const portKeys = Object.keys(serverConfig.env).filter(key => 
          key.toUpperCase().includes('PORT')
        );

        logger.info('Potential host and port keys', { hostKeys, portKeys });

        for (const hostKey of hostKeys) {
          const host = serverConfig.env[hostKey];
          
          // Try to find a matching port
          for (const portKey of portKeys) {
            const port = parseInt(serverConfig.env[portKey]);
            
            if (host && !isNaN(port)) {
              logger.info(`Found connection details from env: ${host}:${port}`);
              return { host, port };
            }
          }

          // If no port found, use default port for common protocols
          if (host) {
            const urlMatch = host.match(/^(https?:\/\/)?([^:/]+)(?::(\d+))?/);
            if (urlMatch) {
              const port = urlMatch[3] ? parseInt(urlMatch[3]) : 
                (urlMatch[1] === 'https://' ? 443 : 
                 urlMatch[1] === 'http://' ? 80 : null);
              
              if (port) {
                logger.info(`Found connection details from URL: ${urlMatch[2]}:${port}`);
                return { 
                  host: urlMatch[2], 
                  port 
                };
              }
            }
          }
        }
      }
      logger.warn('No connection details found in environment variables');
      return null;
    },

    // Strategy 2: Connection details from command arguments
    () => {
      logger.info('Checking command arguments');
      const commandString = [
        serverConfig.command || '', 
        ...(serverConfig.args || [])
      ].join(' ');

      logger.info('Command String', { commandString });

      // Look for common connection string patterns
      const connectionPatterns = [
        // PostgreSQL connection string
        /postgresql:\/\/[^@]+@([^:/]+)(?::(\d+))?/,
        
        // HTTP/HTTPS URLs
        /https?:\/\/([^:/]+)(?::(\d+))?/,
        
        // Hostname or IP with optional port
        /([^:/]+)(?::(\d+))?/,

        // Specific cases for MCP servers
        /mcp-([^/]+)\/(?:src\/)?([^/]+)\/dist\/index\.(js|mts)/
      ];

      for (const pattern of connectionPatterns) {
        const match = commandString.match(pattern);
        if (match) {
          logger.info(`Found connection details from command: ${match[1]}:${match[2] || 'default'}`);
          return { 
            host: match[1], 
            port: match[2] ? parseInt(match[2]) : null 
          };
        }
      }

      // Fallback strategy for MCP servers
      const serverNameMatches = [
        'fetch', 'archon', 'sequential-thinking', 'brave-search', 
        'search1api', 'codex-keeper', 'firecrawl', 'markdownify-mcp', 
        'basic-memory', 'postgres', 'memory-mcp', 'filesystem', 
        'puppeteer', 'mcp-installer'
      ];

      const matchedServer = serverNameMatches.find(name => 
        commandString.toLowerCase().includes(name.toLowerCase())
      );

      if (matchedServer) {
        logger.info(`Found server name in command: ${matchedServer}`);
        return null; // Let the next strategy handle it
      }

      logger.warn('No connection details found in command arguments');
      return null;
    },

    // Strategy 3: Hardcoded defaults for known servers
    () => {
      logger.info('Using hardcoded server defaults');
      const serverDefaults = {
        'fetch': { host: 'localhost', port: 8070 },
        'archon': { host: 'host.docker.internal', port: 8100 },
        'sequential-thinking': { host: 'localhost', port: 8081 },
        'brave-search': { host: 'localhost', port: 8082 },
        'search1api': { host: 'localhost', port: 8083 },
        'codex-keeper': { host: 'localhost', port: 8084 },
        'firecrawl': { host: 'localhost', port: 8085 },
        'markdownify-mcp': { host: 'localhost', port: 8086 },
        'basic-memory': { host: 'localhost', port: 8766 },
        'postgres': { host: '127.0.0.1', port: 5432 },
        'memory-mcp': { host: 'localhost', port: 8090 },
        'filesystem': { host: 'localhost', port: 8091 },
        'puppeteer': { host: 'localhost', port: 8092 },
        'mcp-installer': { host: 'localhost', port: 8093 }
      };

      const defaultConfig = serverDefaults[serverName];
      if (defaultConfig) {
        logger.info(`Using default connection for ${serverName}: ${defaultConfig.host}:${defaultConfig.port}`);
        return defaultConfig;
      }
      logger.warn(`No default connection found for ${serverName}`);
      return null;
    },

    // Strategy 4: Fallback to localhost with incremental port
    () => {
      logger.info('Using incremental port fallback');
      const serverTypes = [
        'fetch', 'archon', 'sequential-thinking', 'brave-search', 
        'search1api', 'codex-keeper', 'firecrawl', 'markdownify-mcp', 
        'basic-memory', 'postgres', 'memory-mcp', 'filesystem', 
        'puppeteer', 'mcp-installer'
      ];

      const index = serverTypes.indexOf(serverName);
      const fallbackConfig = { 
        host: 'localhost', 
        port: index !== -1 ? 8070 + index : 8080 
      };

      logger.warn(`Using fallback connection: ${fallbackConfig.host}:${fallbackConfig.port}`);
      return fallbackConfig;
    }
  ];

  // Try each pattern until a match is found
  for (const pattern of connectionPatterns) {
    const result = pattern();
    if (result) return result;
  }

  logger.error(`Failed to extract connection details for ${serverName}`);
  return null;
}

async function testMCPConnection(serverName, connectionInfo) {
  // Perform connection test
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      logger.error(`Connection timeout for ${serverName} at ${connectionInfo.host}:${connectionInfo.port}`);
      resolve({ 
        success: false, 
        error: 'Connection timeout',
        details: {
          serverName,
          host: connectionInfo.host,
          port: connectionInfo.port,
          diagnostics: {
            activeProcesses: getActiveProcesses(),
            networkConnections: getNetworkConnections(),
            systemInfo: getSystemInfo()
          }
        }
      });
    }, 5000);

    socket.connect(connectionInfo.port, connectionInfo.host, () => {
      clearTimeout(timeout);
      socket.end();
      logger.info(`MCP Connection Successful for ${serverName} at ${connectionInfo.host}:${connectionInfo.port}!`);
      resolve({ 
        success: true,
        details: {
          serverName,
          host: connectionInfo.host,
          port: connectionInfo.port
        }
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      
      // Enhanced error logging for basic-memory
      if (serverName === 'basic-memory') {
        logger.error(`Detailed Basic Memory Connection Failure`, {
          errorType: err.code,
          errorMessage: err.message,
          host: connectionInfo.host,
          port: connectionInfo.port,
          diagnostics: {
            activeProcesses: getActiveProcesses(),
            networkConnections: getNetworkConnections(),
            systemInfo: getSystemInfo(),
            processEnv: getProcessEnvironment(),
            osNetworkInterfaces: getNetworkInterfaces()
          }
        });
      }

      logger.error(`MCP Connection Failed for ${serverName}: ${err.message}`);
      resolve({ 
        success: false, 
        error: err.message,
        details: {
          serverName,
          host: connectionInfo.host,
          port: connectionInfo.port,
          errorMessage: err.message,
          errorCode: err.code,
          diagnostics: {
            activeProcesses: getActiveProcesses(),
            networkConnections: getNetworkConnections(),
            systemInfo: getSystemInfo()
          }
        }
      });
    });
  });
}

async function main() {
  logger.info('Starting MCP Connection Diagnostics...');

  // Configuration loading with detailed conflict detection
  const configPaths = [
    'C:\\Users\\Daniel Corbett\\.codeium\\windsurf\\mcp_config.json',
    'C:\\Users\\Daniel Corbett\\AppData\\Roaming\\Windsurf\\User\\globalStorage\\rooveterinaryinc.roo-cline\\settings\\mcp_settings.json'
  ];

  const configDetails = [];
  const loadedConfigs = {};
  const configConflicts = {
    disabled: [],
    command: [],
    args: [],
    env: []
  };

  // Diagnostic logging for configuration loading
  console.log('\n--- Configuration Loading Diagnostics ---');
  console.log('Current Working Directory:', process.cwd());
  console.log('Script Directory:', __dirname);
  console.log('Attempting to load configurations from:');
  configPaths.forEach(path => console.log(`- ${path}`));

  configPaths.forEach(configPath => {
    try {
      // Detailed file existence check
      const fileStats = fs.statSync(configPath);
      console.log(`\nFile: ${configPath}`);
      console.log('File Size:', fileStats.size, 'bytes');
      console.log('Last Modified:', fileStats.mtime.toISOString());

      // Read file with comprehensive error handling
      let rawConfig;
      try {
        rawConfig = fs.readFileSync(configPath, 'utf8');
      } catch (readErr) {
        console.error(`Read Error for ${configPath}:`, readErr.message);
        configDetails.push({
          path: configPath,
          status: 'Read Error',
          error: readErr.message
        });
        return;
      }

      // Parse configuration with detailed validation
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(rawConfig);
        
        // Validate basic structure
        if (!parsedConfig || typeof parsedConfig !== 'object') {
          throw new Error('Invalid configuration: not an object');
        }

        if (!parsedConfig.mcpServers || typeof parsedConfig.mcpServers !== 'object') {
          throw new Error('Invalid configuration: missing or invalid mcpServers');
        }
      } catch (parseErr) {
        console.error(`Parse Error for ${configPath}:`, parseErr.message);
        configDetails.push({
          path: configPath,
          status: 'Parse Error',
          error: parseErr.message,
          rawContent: rawConfig.slice(0, 5000)  // Limit raw content to prevent massive logs
        });
        return;
      }

      // Store loaded configuration
      loadedConfigs[configPath] = parsedConfig;

      // Log full configuration
      console.log(`\n--- Detailed Configuration File: ${configPath} ---`);
      console.log('Configuration Keys:', Object.keys(parsedConfig));
      console.log('MCP Servers:', Object.keys(parsedConfig.mcpServers || {}));

      // Analyze basic-memory server configuration
      const basicMemoryConfig = parsedConfig.mcpServers && parsedConfig.mcpServers['basic-memory'];
      if (basicMemoryConfig) {
        console.log('\n--- Basic Memory Server Details ---');
        console.log('Full Configuration:', safeStringify(basicMemoryConfig, null, 2));

        // Detailed configuration analysis
        const configDetail = {
          path: configPath,
          status: 'Parsed Successfully',
          basicMemoryServer: {
            command: basicMemoryConfig.command,
            argsCount: basicMemoryConfig.args ? basicMemoryConfig.args.length : 0,
            disabled: basicMemoryConfig.disabled || false,
            alwaysAllowCount: basicMemoryConfig.alwaysAllow ? basicMemoryConfig.alwaysAllow.length : 0,
            envVarsCount: basicMemoryConfig.env ? Object.keys(basicMemoryConfig.env).length : 0
          }
        };
        configDetails.push(configDetail);

        // Detect configuration conflicts
        if (configDetails.length > 1) {
          const prevConfig = configDetails[configDetails.length - 2].basicMemoryServer;
          
          // Check for conflicts
          if (prevConfig.disabled !== configDetail.basicMemoryServer.disabled) {
            configConflicts.disabled.push({
              path: configPath,
              value: configDetail.basicMemoryServer.disabled
            });
          }

          if (prevConfig.command !== configDetail.basicMemoryServer.command) {
            configConflicts.command.push({
              path: configPath,
              value: configDetail.basicMemoryServer.command
            });
          }

          // Compare args (if they differ)
          const currentArgs = basicMemoryConfig.args || [];
          const prevArgs = (parsedConfig.mcpServers['basic-memory'].args || []);
          if (JSON.stringify(currentArgs) !== JSON.stringify(prevArgs)) {
            configConflicts.args.push({
              path: configPath,
              value: currentArgs
            });
          }

          // Compare env variables
          const currentEnv = basicMemoryConfig.env || {};
          const prevEnv = (parsedConfig.mcpServers['basic-memory'].env || {});
          if (JSON.stringify(currentEnv) !== JSON.stringify(prevEnv)) {
            configConflicts.env.push({
              path: configPath,
              value: currentEnv
            });
          }
        }
      } else {
        console.log('\n--- No Basic Memory Server Configuration Found ---');
        configDetails.push({
          path: configPath,
          status: 'No Basic Memory Server',
          error: 'basic-memory server not found in mcpServers'
        });
      }

      console.log('--- End of Configuration File ---');
    } catch (err) {
      console.error(`Unexpected error processing ${configPath}:`, err.message);
      configDetails.push({
        path: configPath,
        status: 'Unexpected Error',
        error: err.message
      });
    }
  });

  // Log summary of configuration details
  console.log('\n--- Configuration Analysis Summary ---');
  configDetails.forEach(detail => {
    console.log(`Path: ${detail.path}`);
    console.log(`Status: ${detail.status}`);
    if (detail.error) console.log(`Error: ${detail.error}`);
    if (detail.basicMemoryServer) {
      console.log('Basic Memory Server:');
      console.log(safeStringify(detail.basicMemoryServer, null, 2));
    }
    console.log('---');
  });

  // Log configuration conflicts
  console.log('\n--- Configuration Conflicts ---');
  Object.entries(configConflicts).forEach(([conflictType, conflicts]) => {
    if (conflicts.length > 0) {
      console.log(`${conflictType.toUpperCase()} Conflicts:`);
      conflicts.forEach(conflict => {
        console.log(`- Path: ${conflict.path}`);
        console.log(`  Value: ${safeStringify(conflict.value)}`);
      });
    }
  });

  // Configuration conflict resolution strategy
  const resolveConfigConflicts = (configDetails, configConflicts) => {
    console.log('\n--- Configuration Conflict Resolution ---');
    
    // Prioritize configuration based on specific rules
    const priorityRules = {
      disabled: [
        // Prefer the configuration that enables the server
        (conflicts) => conflicts.find(conflict => conflict.value === false) || conflicts[0]
      ],
      command: [
        // Prefer the most specific or complete path
        (conflicts) => conflicts.reduce((mostSpecific, current) => 
          current.path.includes('roo-cline') ? current : mostSpecific, 
          conflicts[0]
        )
      ],
      args: [
        // Prefer the most complete or normalized path
        (conflicts) => conflicts.reduce((mostComplete, current) => 
          current.value.length > mostComplete.value.length ? current : mostComplete, 
          conflicts[0]
        )
      ],
      env: [
        // Prefer the configuration with more environment variables
        (conflicts) => conflicts.reduce((mostComprehensive, current) => 
          Object.keys(current.value).length > Object.keys(mostComprehensive.value).length 
            ? current 
            : mostComprehensive, 
          conflicts[0]
        )
      ]
    };

    const resolvedConfig = {};

    // Resolve each type of conflict
    Object.entries(configConflicts).forEach(([conflictType, conflicts]) => {
      if (conflicts.length > 0) {
        console.log(`Resolving ${conflictType.toUpperCase()} Conflicts:`);
        
        // Apply priority rules
        const resolvedConflict = priorityRules[conflictType][0](conflicts);
        
        console.log(`Selected Configuration:`);
        console.log(`- Path: ${resolvedConflict.path}`);
        console.log(`- Value: ${safeStringify(resolvedConflict.value)}`);
        
        // Store the resolved configuration
        resolvedConfig[conflictType] = resolvedConflict.value;
      }
    });

    // Provide recommendations
    console.log('\n--- Recommendations ---');
    if (resolvedConfig.disabled === false) {
      console.log('✓ Recommendation: Enable the basic-memory server');
      console.log('  The configuration from roo-cline settings suggests the server should be active.');
    } else {
      console.log('⚠ Warning: The basic-memory server is currently disabled');
      console.log('  Consider reviewing why the server is marked as disabled.');
    }

    // Suggest consolidating configurations
    console.log('\nConfiguration Consolidation Suggestion:');
    console.log('1. Review both configuration files');
    console.log('2. Decide on a single source of truth');
    console.log('3. Update all configuration files to match the chosen configuration');

    return resolvedConfig;
  };

  // Resolve configuration conflicts
  const resolvedConfig = resolveConfigConflicts(configDetails, configConflicts);

  // Merge configurations
  let serverConfigs = {};
  Object.values(loadedConfigs).forEach(config => {
    if (config.mcpServers) {
      serverConfigs = { ...serverConfigs, ...config.mcpServers };
    }
  });

  logger.info('MCP Servers Configuration Found', { 
    serverConfigs: safeStringify(serverConfigs, null, 2) 
  });

  console.log('Full Server Configurations:');
  console.dir(serverConfigs, { depth: null, colors: true });

  logger.info('MCP Servers Configuration Found', { 
    serverConfigs: safeStringify(serverConfigs, null, 2) 
  });

  // Detailed logging for all server configurations
  Object.entries(serverConfigs).forEach(([serverName, config]) => {
    console.log(`\n--- Server: ${serverName} ---`);
    console.log('Full Configuration:', safeStringify(config, null, 2));
  });

  // Log server names and their basic configurations
  console.log('Server Names and Configurations:');
  Object.entries(serverConfigs).forEach(([serverName, config]) => {
    console.log(`Server: ${serverName}`);
    console.log('Disabled:', config.disabled || false);
    console.log('Command:', config.command || 'Not specified');
    console.log('Args:', config.args || 'Not specified');
    console.log('Environment Variables:', Object.keys(config.env || {}));
    console.log('---');
  });

  // Print full configuration for basic-memory server
  const basicMemoryConfig = serverConfigs['basic-memory'];
  if (basicMemoryConfig) {
    console.log('\n--- Detailed Basic Memory Server Configuration ---');
    console.log('Full Configuration:', safeStringify(basicMemoryConfig, null, 2));
    
    // Additional detailed logging
    console.log('\nDetailed Breakdown:');
    console.log('Command:', basicMemoryConfig.command);
    console.log('Args:', safeStringify(basicMemoryConfig.args, null, 2));
    console.log('Environment Variables:', safeStringify(basicMemoryConfig.env || {}, null, 2));
    console.log('Disabled:', basicMemoryConfig.disabled || false);
    console.log('Always Allow:', safeStringify(basicMemoryConfig.alwaysAllow || [], null, 2));
  } else {
    console.log('\n--- No Configuration Found for basic-memory Server ---');
  }

  // Final server validation and recommendation generation
  const validateServerStatus = async (serverConfigs) => {
    console.log('\n--- Server Status Validation ---');
    
    // Check basic-memory server configuration
    const basicMemoryConfig = serverConfigs['basic-memory'];
    if (!basicMemoryConfig) {
      console.log('⚠ Warning: No basic-memory server configuration found');
      return;
    }

    // Detailed configuration logging
    console.log('Server Configuration Details:');
    console.log('Command:', basicMemoryConfig.command);
    console.log('Args:', safeStringify(basicMemoryConfig.args, null, 2));
    console.log('Environment Variables:', safeStringify(basicMemoryConfig.env || {}, null, 2));
    console.log('Disabled:', basicMemoryConfig.disabled || false);
    console.log('Always Allow:', safeStringify(basicMemoryConfig.alwaysAllow || [], null, 2));

    // Validate server path
    const serverPath = basicMemoryConfig.args[0];
    try {
      const serverStats = fs.statSync(serverPath);
      console.log('\n✓ Server Script Found:');
      console.log('Path:', serverPath);
      console.log('Size:', serverStats.size, 'bytes');
      console.log('Last Modified:', serverStats.mtime.toISOString());
    } catch (err) {
      console.log('\n⚠ Warning: Server Script Not Found');
      console.log('Path:', serverPath);
      console.log('Error:', err.message);
    }

    // Check port availability
    const port = basicMemoryConfig.env?.BASIC_MEMORY_PORT || '8766';
    const host = basicMemoryConfig.env?.BASIC_MEMORY_HOST || 'localhost';
    
    try {
      const testConnection = new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Connection timed out'));
        });
        
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
        
        socket.connect(port, host);
      });

      await testConnection;
      console.log('\n⚠ Warning: Port is already in use');
      console.log(`Port ${port} on ${host} is currently active`);
    } catch (err) {
      console.log('\n✓ Port Availability Check:');
      console.log(`Port ${port} on ${host} is available`);
    }

    // Recommendations
    console.log('\n--- Recommendations ---');
    if (basicMemoryConfig.disabled) {
      console.log('⚠ Server is currently disabled');
      console.log('Recommended Actions:');
      console.log('1. Review why the server is disabled');
      console.log('2. Update configuration to enable the server if needed');
    } else {
      console.log('✓ Server configuration looks good');
      console.log('Recommended Next Steps:');
      console.log('1. Verify server functionality');
      console.log('2. Run integration tests');
    }
  };

  // Run server validation
  await validateServerStatus(serverConfigs);

  // Test connections for each server
  const results = {};
  const connectionPromises = [];

  for (const [serverName, serverConfig] of Object.entries(serverConfigs)) {
    logger.info(`Analyzing Server: ${serverName}`, { 
      configuration: safeStringify(serverConfig, null, 2) 
    });
    
    // Skip disabled servers
    if (serverConfig.disabled) {
      logger.warn(`Server ${serverName} is disabled. Skipping.`);
      results[serverName] = { 
        success: true, 
        skipped: true,
        details: {
          serverName,
          reason: 'Server is disabled in configuration'
        }
      };
      continue;
    }

    // Extract connection details
    const connectionInfo = extractConnectionInfo(serverName, serverConfig);

    // Validate connection details
    if (!connectionInfo || !connectionInfo.host || !connectionInfo.port) {
      logger.error(`Could not extract connection details for ${serverName}`);
      results[serverName] = { 
        success: false, 
        error: 'No connection details found',
        details: { serverName }
      };
      continue;
    }

    // Perform connection test
    const connectionPromise = testMCPConnection(serverName, connectionInfo)
      .then(result => {
        results[serverName] = result;
        return result;
      });

    connectionPromises.push(connectionPromise);
  }

  // Wait for all connection tests to complete
  await Promise.all(connectionPromises);

  // Summarize results
  const successCount = Object.values(results).filter(r => r.success).length;
  const failureCount = Object.values(results).filter(r => !r.success && !r.skipped).length;
  const skippedCount = Object.values(results).filter(r => r.skipped).length;

  logger.info('Connection Test Summary', {
    successfulConnections: successCount,
    failedConnections: failureCount,
    skippedServers: skippedCount
  });

  // Generate detailed error report
  if (failureCount > 0) {
    logger.error('Detailed Error Report');
    for (const [serverName, result] of Object.entries(results)) {
      if (!result.success && !result.skipped) {
        logger.error(`Server: ${serverName}`, { 
          errorDetails: safeStringify(result, null, 2) 
        });
      }
    }
  }

  // Exit with non-zero code if any non-skipped connections failed
  process.exit(failureCount > 0 ? 1 : 0);
}

// Improved error handling and logging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Limit console output to prevent truncation
const MAX_OUTPUT_LENGTH = 10000; // 10KB
const originalConsoleLog = console.log;
console.log = (...args) => {
  const output = args.map(arg => 
    typeof arg === 'object' ? safeStringify(arg) : String(arg)
  ).join(' ');
  
  const truncatedOutput = output.length > MAX_OUTPUT_LENGTH 
    ? output.slice(0, MAX_OUTPUT_LENGTH) + '... [OUTPUT TRUNCATED]'
    : output;
  
  originalConsoleLog(truncatedOutput);
};

main().catch(err => {
  logger.error('Unhandled error', { 
    errorMessage: err.message,
    errorStack: err.stack 
  });
  process.exit(1);
});
