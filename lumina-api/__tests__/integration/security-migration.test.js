'use strict';
const path = require('node:path');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { decryptSecret } = require('../../src/utils/secretEncryption');
let replica, uri;
jest.setTimeout(180000);
const migrate = (...args) => execFile(process.execPath, [path.resolve(__dirname, '../../scripts/migrate-security.js'), ...args], { env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri }, timeout: 90000 });
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1 }, binary: { version: '8.0.17' } });
  uri = replica.getUri('isolated_migration');
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
});
afterAll(async () => { await mongoose.disconnect(); await replica?.stop(); });
beforeEach(async () => { await mongoose.connection.db.dropDatabase(); });

test('dry-run is read-only; indexes-only keeps legacy tokens; full migration encrypts them idempotently', async () => {
  const accounts = mongoose.connection.collection('dashboardaccounts');
  await accounts.insertOne({ accountId: 'isolated', username: 'LuminaTest', discordOauth2Token: 'isolated-legacy-access', discordOauth2RefreshToken: 'isolated-legacy-refresh', deletionScheduledFor: new Date(Date.now() + 30 * 86400000) });
  await accounts.createIndex({ usernameLower: 1 });
  await accounts.createIndex({ deletionScheduledFor: 1 }, { expireAfterSeconds: 0 });
  const before = await accounts.findOne({ accountId: 'isolated' });
  const indexes = await accounts.indexes();
  await migrate('--indexes-only');
  expect(await accounts.findOne({ accountId: 'isolated' })).toEqual(before);
  expect(await accounts.indexes()).toEqual(indexes);
  await migrate('--apply', '--indexes-only');
  const indexed = await accounts.findOne({ accountId: 'isolated' });
  expect(indexed.usernameLower).toBe('luminatest');
  expect(indexed.discordOauth2Token).toBe(before.discordOauth2Token);
  const applied = await accounts.indexes();
  expect(applied.find(index => index.name === 'username_normalized_unique').unique).toBe(true);
  expect(applied.some(index => index.key.deletionScheduledFor && index.expireAfterSeconds !== undefined)).toBe(false);
  await migrate('--apply');
  const encrypted = await accounts.findOne({ accountId: 'isolated' });
  expect(encrypted.discordOauth2Token).toMatch(/^v1\./);
  expect(decryptSecret(encrypted.discordOauth2Token)).toBe(before.discordOauth2Token);
  expect(decryptSecret(encrypted.discordOauth2RefreshToken)).toBe(before.discordOauth2RefreshToken);
  await migrate('--apply');
  expect((await accounts.findOne({ accountId: 'isolated' })).discordOauth2Token).toBe(encrypted.discordOauth2Token);
});

test('conflicts prevent backfill, index removal and token encryption', async () => {
  const accounts = mongoose.connection.collection('dashboardaccounts');
  await accounts.insertMany([{ username: 'Lumina', discordOauth2Token: 'legacy' }, { username: 'lumina' }]);
  await accounts.createIndex({ usernameLower: 1 });
  const before = await accounts.find().toArray();
  const indexes = await accounts.indexes();
  await expect(migrate('--apply', '--indexes-only')).rejects.toMatchObject({ code: 1 });
  expect(await accounts.find().toArray()).toEqual(before);
  expect(await accounts.indexes()).toEqual(indexes);
});
