#!/usr/bin/env node
import ConnectionDiagnostics from '../src/connection_diagnostics.js';

async function main() {
  console.log('🔍 Starting Connection Diagnostics...');
  
  try {
    const results = await ConnectionDiagnostics.troubleshootConnection();
    
    console.log('\n📊 Diagnostic Results:');
    console.log('DNS Resolution:');
    results.diagnostics.dnsResolution.forEach(result => {
      console.log(`  - ${result.service}: ${result.status}`);
    });

    console.log('\nTCP Connectivity:');
    results.diagnostics.tcpConnectivity.forEach(result => {
      console.log(`  - ${result.service}: ${result.status}`);
    });

    console.log('\n🚨 Recommendations:');
    results.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });

    console.log('\n✅ Diagnostics Complete. Check connection_diagnostics.log for detailed information.');
  } catch (error) {
    console.error('❌ Diagnostic Process Failed:', error);
  }
}

main();
