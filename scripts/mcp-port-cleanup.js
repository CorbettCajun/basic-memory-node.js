import { execSync } from 'child_process';

function findProcessOnPort(port) {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const match = output.match(/\s+(\d+)$/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error finding process:', error);
        return null;
    }
}

function killProcess(pid) {
    try {
        execSync(`taskkill /PID ${pid} /F`);
        console.log(`Process ${pid} killed successfully.`);
    } catch (error) {
        console.error('Error killing process:', error);
    }
}

function cleanupMCPPort(port = 8766) {
    console.log(`Checking for processes on port ${port}...`);
    const pid = findProcessOnPort(port);
    
    if (pid) {
        console.log(`Found process with PID ${pid} using port ${port}`);
        killProcess(pid);
    } else {
        console.log(`No process found using port ${port}`);
    }
}

cleanupMCPPort();
