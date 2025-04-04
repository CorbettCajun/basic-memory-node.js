const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const loggerReplacements = [
  { 
    oldImport: "from '../utils/logger.js'", 
    newImport: "from '../utils/enhanced-logger.js'"
  },
  { 
    oldImport: "from './logger.js'", 
    newImport: "from './enhanced-logger.js'"
  }
];

function replaceLoggerImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  loggerReplacements.forEach(replacement => {
    if (content.includes(replacement.oldImport)) {
      content = content.replace(replacement.oldImport, replacement.newImport);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated logger import in: ${filePath}`);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      traverseDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.mjs'))) {
      try {
        replaceLoggerImports(fullPath);
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error);
      }
    }
  });
}

traverseDirectory(path.join(rootDir, 'src'));
console.log('Logger import update complete.');
