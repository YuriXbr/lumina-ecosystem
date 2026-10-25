'use strict';
// Read-only: never imports the app, connects to MongoDB, or prints env values.
const fs = require('node:fs');
const path = require('node:path');
const contract = require('./environment-contract.json');
const platformKeys = new Set(['NODE_ENV', 'NODE_OPTIONS', 'NODE_NO_WARNINGS', 'NODE_EXTRA_CA_CERTS', 'NODE_USE_SYSTEM_CA', 'VERCEL', 'CI']);
const ignored = new Set(['node_modules', '.git', 'dist', 'coverage', '__tests__', 'test', 'tests', '.private', '.vercel']);

function knownKeys(component) {
  const entry = contract[component];
  if (!entry) throw new Error('Unknown component');
  return new Set([...entry.required, ...entry.optional, ...entry.sdk, ...platformKeys]);
}
function auditEntries(component, entries, { template = false } = {}) {
  const known = knownKeys(component);
  const keys = Object.keys(entries);
  const unused = keys.filter(key => !known.has(key) && !key.startsWith('VERCEL_')).sort();
  const missing = template ? [] : contract[component].required.filter(key => !entries[key]?.trim());
  return { configured: keys.length, unused, missing };
}
function sourceKeys(directory) {
  const keys = new Set();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith('.env')) continue;
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const key of sourceKeys(location)) keys.add(key);
    } else if (/\.(?:js|cjs|mjs|jsx|ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) {
      const text = fs.readFileSync(location, 'utf8');
      for (const match of text.matchAll(/(?:process|import\.meta)\.env(?:\.([A-Z][A-Z0-9_]*)|\[['"]([A-Z][A-Z0-9_]*)['"]\])/g)) keys.add(match[1] || match[2]);
    }
  }
  return keys;
}

function isolationIssues(production, development) {
  return ['MONGODB_URI', 'DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_SECRET', 'JWT_SECRET', 'OAUTH_STATE_SECRET', 'INTERNAL_API_KEY', 'LUMINA_API_KEY', 'ENCRYPTION_KEY', 'EMAIL_CODE_SECRET']
    .filter(key => production[key] && production[key] === development[key]);
}
function main() {
  const { parse } = require('../lumina-api/node_modules/@dotenvx/dotenvx');
  const root = path.resolve(__dirname, '..');
  let issues = 0;
  for (const component of Object.keys(contract)) {
    const directory = component === 'root' ? root : path.join(root, component);
    const known = knownKeys(component);
    const unknownReferences = component === 'root' ? [] : [...sourceKeys(directory)].filter(key => !known.has(key) && !['DEV', 'PROD'].includes(key) && !key.startsWith('VERCEL_')).sort();
    issues += unknownReferences.length;
    console.log(JSON.stringify({ component, unknownReferences }));
    const environments = {};
    for (const name of fs.readdirSync(directory).filter(name => /^\.env(?:\.|$)/.test(name))) {
      if (!fs.statSync(path.join(directory, name)).isFile()) continue;
      const entries = parse(fs.readFileSync(path.join(directory, name), 'utf8'), { quiet: true });
      environments[name] = entries;
      const result = auditEntries(component, entries, { template: name.endsWith('.example') });
      issues += result.unused.length + result.missing.length;
      console.log(JSON.stringify({ file: `${component}/${name}`, ...result }));
    }
    if (environments['.env'] && environments['.env.dev']) {
      const sharedProductionKeys = isolationIssues(environments['.env'], environments['.env.dev']);
      const acknowledged = process.argv.includes('--allow-shared-secrets');
      // Temporary user-authorized exception never permits sharing the database itself.
      issues += acknowledged ? sharedProductionKeys.filter(key => key === 'MONGODB_URI').length : sharedProductionKeys.length;
      console.log(JSON.stringify({ component, sharedProductionKeys, acknowledged }));
    }
  }
  if (process.argv.includes('--check') && issues) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = { knownKeys, auditEntries, sourceKeys, isolationIssues };
