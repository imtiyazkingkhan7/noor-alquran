const { cpSync, mkdirSync, rmSync, existsSync } = require('fs');
const { join } = require('path');

const from = join(__dirname, 'dist', 'frontend', 'browser');
const to = join(__dirname, '..', 'backend', 'src', 'main', 'resources', 'static');

if (!existsSync(from)) {
  console.error('Angular build missing. Run ng build first.');
  process.exit(1);
}

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log('Website copied to backend/src/main/resources/static');
