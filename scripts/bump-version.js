const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const envPath = path.join(__dirname, '..', '.env.local');

// Read package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

// Determine bump type from command line argument
const bumpType = process.argv[2] || 'patch';

let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
}

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

// Update or create .env.local with the new version
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  // Remove existing NEXT_PUBLIC_APP_VERSION line if present
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('NEXT_PUBLIC_APP_VERSION='))
    .join('\n');
  // Ensure there's a newline at the end if content exists
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
}
envContent += `NEXT_PUBLIC_APP_VERSION=${newVersion}\n`;
fs.writeFileSync(envPath, envContent);

console.log(`Version bumped: ${major}.${minor}.${patch} -> ${newVersion}`);
console.log(`Updated package.json and .env.local with version ${newVersion}`);
