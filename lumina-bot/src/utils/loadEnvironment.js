'use strict';
const path = require('node:path');

// All entrypoints resolve the same component-local file, regardless of shell cwd.
// Platform-injected environment keeps precedence; tests never load real secrets.
function loadEnvironment() {
    process.env.NODE_ENV ||= 'development';
    if (process.env.NODE_ENV === 'test' || process.env.VERCEL) return;
    const file = process.env.NODE_ENV === 'production' ? '.env' : '.env.dev';
    require('@dotenvx/dotenvx').config({ path: path.resolve(__dirname, '../..', file), quiet: true });
}

module.exports = loadEnvironment;
