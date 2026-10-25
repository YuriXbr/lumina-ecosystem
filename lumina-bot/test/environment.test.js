'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dotenv = require('@dotenvx/dotenvx');
const loadEnvironment = require('../src/utils/loadEnvironment');

for (const environment of ['production', 'development', 'test', undefined]) {
  test(`component-local environment: ${environment ?? 'default'}`, t => {
    const originalEnvironment = { ...process.env };
    const originalConfig = dotenv.config;
    const calls = [];
    t.after(() => { process.env = originalEnvironment; dotenv.config = originalConfig; });
    if (environment) process.env.NODE_ENV = environment;
    else delete process.env.NODE_ENV;
    delete process.env.VERCEL;
    dotenv.config = options => { calls.push(options); process.env.NODE_ENV ||= 'production'; };
    loadEnvironment();
    if (environment === 'test') assert.equal(calls.length, 0);
    else {
      assert.deepEqual(calls, [{ path: path.resolve(__dirname, '..', environment === 'production' ? '.env' : '.env.dev'), quiet: true }]);
      assert.equal(process.env.NODE_ENV, environment || 'development');
    }
  });
}

test('platform-injected configuration does not read local files', t => {
  const originalEnvironment = { ...process.env };
  const originalConfig = dotenv.config;
  t.after(() => { process.env = originalEnvironment; dotenv.config = originalConfig; });
  process.env.NODE_ENV = 'production';
  process.env.VERCEL = '1';
  dotenv.config = () => { throw new Error('Must not read local configuration'); };
  loadEnvironment();
});
