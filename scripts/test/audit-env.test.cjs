'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { auditEntries, isolationIssues } = require('../audit-env.cjs');

test('frontend audit flags server secrets and dead public configuration without disclosing values', () => {
  const secret = 'private-value-never-returned';
  const result = auditEntries('lumina-dashboard', { JWT_SECRET: secret, MONGODB_URI: secret, VITE_DISCORD_REDIRECT_URI: 'https://unused.test', VITE_API_BASE_URL: 'https://api.test', VERCEL_ENV: 'production' });
  assert.deepEqual(result.unused, ['JWT_SECRET', 'MONGODB_URI', 'VITE_DISCORD_REDIRECT_URI']);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.deepEqual(result.missing, []);
});

test('SDK configuration and system environment are not misclassified as unused', () => {
  const result = auditEntries('lumina-api', { OTEL_EXPORTER_OTLP_TRACES_HEADERS: 'private', OTEL_SERVICE_NAME: 'lumina-api', NODE_OPTIONS: '--use-system-ca', VERCEL_REGION: 'gru1', DB_SECRET: 'obsolete' }, { template: true });
  assert.deepEqual(result.unused, ['DB_SECRET']);
  assert.deepEqual(result.missing, []);
});

test('required configuration treats blank values as missing; templates can remain blank', () => {
  const result = auditEntries('lumina-bot', { DISCORD_BOT_TOKEN: ' ', API_BASE_URL: 'http://localhost' });
  assert.ok(result.missing.includes('DISCORD_BOT_TOKEN'));
  assert.ok(result.missing.includes('ENCRYPTION_KEY'));
  assert.ok(!result.missing.includes('API_BASE_URL'));
  assert.deepEqual(auditEntries('lumina-bot', {}, { template: true }).missing, []);
});

test('development must not reuse production database, bot credentials or application secrets', () => {
  const production = { MONGODB_URI: 'mongodb://server/live', JWT_SECRET: 'production-secret', GMAIL_CLIENT_SECRET: 'mail-with-dev-recipient' };
  const development = { ...production, MONGODB_URI: 'mongodb://server/development' };
  assert.deepEqual(isolationIssues(production, development), ['JWT_SECRET']);
  development.JWT_SECRET = 'development-secret';
  assert.deepEqual(isolationIssues(production, development), []);
});
