'use strict';
jest.mock('../../src/logger/logger', () => ({ addLog: jest.fn(), routeError: ({ res }) => res.status(500).json({ code: 'ERROR' }), requestLogger: () => (req, res, next) => next(), forceSendLogs: jest.fn(), sendErrorEmbed: jest.fn() }));
jest.mock('../../src/email/mailer', () => ({ assertConfigured: () => { throw new Error('No real email in isolated integration tests'); } }));
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const accounts = require('../../src/database/services/DashboardAccountService');
const { generateCsrfToken } = require('../../src/utils/csrfMiddleware');
const { accountRequestMetadata } = require('../../src/utils/accountRequestMetadata');
const app = require('../../index');
let replica;
const originalVercel = process.env.VERCEL;
jest.setTimeout(180000);
const body = { email: 'location@isolated.example', password: 'IsolatedPassword123', firstName: 'Teste', lastName: 'Local', username: 'LocalTest', displayName: 'Conta isolada' };
const edge = { 'x-vercel-forwarded-for': '172.67.156.54', 'cf-connecting-ip': '203.0.113.20', 'cf-ipcountry': 'BR', 'cf-ipcity': 'S%C3%A3o%20Paulo', 'cf-region-code': 'SP' };
function post(route, data, headers = edge) {
  const csrf = generateCsrfToken();
  return request(app).post(route).set(headers).set('Cookie', `csrf_token=${csrf}`).set('x-csrf-token', csrf).send(data);
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1 }, binary: { version: '8.0.17' } });
  process.env.MONGODB_URI = replica.getUri('isolated_location');
  process.env.VERCEL = '1';
  await accounts.connect();
  await accounts.model.createCollection();
  await accounts.model.createIndexes();
});
afterAll(async () => { await mongoose.disconnect(); await replica?.stop(); if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel; });
beforeEach(async () => { await accounts.model.deleteMany({}); });

test('registration persists Cloudflare approximate location and ignores body-supplied geography', async () => {
  const response = await post('/expapi/v1/register', { ...body, registrationCountry: 'US', registrationCity: 'Forged' });
  expect(response.status).toBe(200);
  const account = await accounts.getDashboardAccountByEmail(body.email);
  expect(account).toMatchObject({ registrationCountry: 'BR', registrationRegion: 'SP', registrationCity: 'São Paulo', registrationLocationSource: 'cloudflare', registrationIp: '203.0.113.20', lastLogin: null });
});

test('only a successful login replaces last access metadata; registration remains unchanged and metadata stays private', async () => {
  expect((await post('/expapi/v1/register', body)).status).toBe(200);
  const login = await post('/expapi/v1/login', { email: body.email, password: body.password }, { ...edge, 'cf-connecting-ip': '203.0.113.21', 'cf-ipcountry': 'PT', 'cf-ipcity': 'Lisboa', 'cf-region-code': '11' });
  expect(login.status).toBe(200);
  expect(JSON.stringify(login.body)).not.toMatch(/registrationIp|registrationCity|lastLoginIp|lastLoginCity|203\.0\.113/);
  const account = await accounts.getDashboardAccountByEmail(body.email);
  expect(account).toMatchObject({ registrationCountry: 'BR', registrationCity: 'São Paulo', lastLoginCountry: 'PT', lastLoginCity: 'Lisboa', lastLoginRegion: '11', lastLoginLocationSource: 'cloudflare', lastLoginIp: '203.0.113.21' });
  expect((await post('/expapi/v1/login', { email: body.email, password: 'WrongPassword123' })).status).toBe(401);
  const afterFailure = await accounts.getDashboardAccountByEmail(body.email);
  expect(afterFailure.lastLogin).toEqual(account.lastLogin);
  expect(afterFailure.lastLoginCity).toBe('Lisboa');
});

test('OAuth account creation persists initial registration and successful login metadata together', async () => {
  const metadata = accountRequestMetadata({ headers: edge, ip: '172.67.156.54' }, 'registration');
  const account = await accounts.createOAuthAccount({ email: 'oauth@isolated.example', provider: 'discord', providerId: '771421826974089236', emailVerified: true, ...metadata });
  const persisted = await accounts.getDashboardAccountByAccountId(account.accountId);
  expect(persisted).toMatchObject({ registrationCity: 'São Paulo', registrationRegion: 'SP', registrationLocationSource: 'cloudflare', lastLoginCity: 'São Paulo', lastLoginCountry: 'BR', lastLoginLocationSource: 'cloudflare' });
  expect(persisted.lastLogin).toBeInstanceOf(Date);
});
