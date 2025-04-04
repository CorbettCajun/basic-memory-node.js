import fs from 'fs';
import path from 'path';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);
const dnsLookup = promisify(dns.lookup);

class ConnectionDiagnostics {
  constructor(config = {}) {
    this.config = {
      rooCodeHost: config.rooCodeHost || 'roo-code.com',
      rooCodePort: config.rooCodePort || 443,
      windurfHost: config.windurfHost || 'windsurf.dev',
      windurfPort: config.windurfPort || 443,
      timeout: config.timeout || 5000,
      logFile: config.logFile || path.join(process.cwd(), 'connection_diagnostics.log')
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.config.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
    
    console.log(message);
  }

  async checkDNSResolution() {
    this.log('Checking DNS Resolution...');
    
    const checks = [
      { host: this.config.rooCodeHost, name: 'Roo Code' },
      { host: this.config.windurfHost, name: 'Windsurf' }
    ];

    const results = [];

    for (const check of checks) {
      try {
        const address = await dnsLookup(check.host);
        results.push({
          service: check.name,
          status: 'SUCCESS',
          ip: address.address
        });
        this.log(`DNS Resolution for ${check.name}: Successful (${address.address})`);
      } catch (error) {
        results.push({
          service: check.name,
          status: 'FAILED',
          error: error.message
        });
        this.log(`DNS Resolution for ${check.name}: Failed - ${error.message}`);
      }
    }

    return results;
  }

  async checkTCPConnectivity() {
    this.log('Checking TCP Connectivity...');
    
    const checks = [
      { host: this.config.rooCodeHost, port: this.config.rooCodePort, name: 'Roo Code' },
      { host: this.config.windurfHost, port: this.config.windurfPort, name: 'Windsurf' }
    ];

    const results = [];

    for (const check of checks) {
      const socket = new net.Socket();
      
      try {
        await new Promise((resolve, reject) => {
          socket.setTimeout(this.config.timeout);
          socket.connect(check.port, check.host, () => {
            socket.destroy();
            resolve();
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection Timeout'));
          });
          
          socket.on('error', (err) => {
            socket.destroy();
            reject(err);
          });
        });

        results.push({
          service: check.name,
          status: 'SUCCESS',
          host: check.host,
          port: check.port
        });
        this.log(`TCP Connectivity for ${check.name}: Successful`);
      } catch (error) {
        results.push({
          service: check.name,
          status: 'FAILED',
          error: error.message
        });
        this.log(`TCP Connectivity for ${check.name}: Failed - ${error.message}`);
      }
    }

    return results;
  }

  async runNetworkDiagnostics() {
    this.log('Starting Comprehensive Network Diagnostics...');

    const diagnosticResults = {
      dnsResolution: await this.checkDNSResolution(),
      tcpConnectivity: await this.checkTCPConnectivity(),
      networkConfig: await this.getNetworkConfiguration()
    };

    this.log('Network Diagnostics Complete.');
    return diagnosticResults;
  }

  async getNetworkConfiguration() {
    this.log('Retrieving Network Configuration...');

    try {
      const { stdout: ipConfig } = await execPromise('ipconfig /all');
      const { stdout: routeInfo } = await execPromise('route print');

      return {
        ipConfig: this.sanitizeNetworkOutput(ipConfig),
        routeInfo: this.sanitizeNetworkOutput(routeInfo)
      };
    } catch (error) {
      this.log(`Network Configuration Retrieval Failed: ${error.message}`);
      return { error: error.message };
    }
  }

  sanitizeNetworkOutput(output) {
    // Remove potentially sensitive information
    return output
      .split('\n')
      .filter(line => 
        !line.includes('Physical Address') && 
        !line.includes('IPv4 Address')
      )
      .join('\n');
  }

  async troubleshootConnection() {
    this.log('Starting Connection Troubleshooting...');

    const diagnostics = await this.runNetworkDiagnostics();
    const recommendations = [];

    // DNS Resolution Issues
    if (diagnostics.dnsResolution.some(result => result.status === 'FAILED')) {
      recommendations.push(
        'DNS Resolution Failed: Check your DNS settings, try changing DNS servers, or contact your network administrator.'
      );
    }

    // TCP Connectivity Issues
    if (diagnostics.tcpConnectivity.some(result => result.status === 'FAILED')) {
      recommendations.push(
        'TCP Connectivity Failed: Verify firewall settings, check proxy configurations, and ensure network access.'
      );
    }

    // Network Configuration Warnings
    if (diagnostics.networkConfig.error) {
      recommendations.push(
        'Network Configuration Retrieval Failed: Manual network configuration review recommended.'
      );
    }

    this.log('Connection Troubleshooting Recommendations:');
    recommendations.forEach(rec => this.log(`- ${rec}`));

    return {
      diagnostics,
      recommendations
    };
  }
}

export default new ConnectionDiagnostics();
