/**
 * __tests__/routes/expapi-v1-getUserProfile.test.js
 *
 * Suite para GET /expapi/v1/user/profile
 * Requer: JWT via verifyRequestAuthWithAccountCheck
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAccount,
    mockLogger, mockDashboardAccountService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/user/profile', () => {
    const URL = '/expapi/v1/user/profile';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna perfil completo do usuário', async () => {
        const account = makeAccount({
            accessType: 'vipUser',
            emailVerified: true,
            discordOauth2Id: '123456789',
            username: 'specialuser',
            displayName: 'Special User',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.accountId).toBe(account.accountId);
        expect(res.body.email).toBe(account.email);
        expect(res.body.accessType).toBe('vipUser');
        expect(res.body.username).toBe('specialuser');
        expect(res.body.displayName).toBe('Special User');
        expect(res.body).toHaveProperty('hasPassword', true);
        expect(res.body).toHaveProperty('authProviders');
        expect(res.body).toHaveProperty('registrationDate');
    });

    it('200 inclui campos de account closure quando agendada', async () => {
        const scheduled = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            deletionRequestedAt: new Date(),
            deletionScheduledFor: scheduled,
        }));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('deletionRequestedAt');
        expect(res.body).toHaveProperty('deletionScheduledFor');
    });

    // ─── 401 ──────────────────────────────────────────────────────────────
    it('401 sem auth', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    // ─── 404 Conta não existe ─────────────────────────────────────────────
    it('401 ACCOUNT_NOT_FOUND quando conta não existe (auth check returns 401)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 403 Conta suspensa ───────────────────────────────────────────────
    it('403 ACCOUNT_BANNED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({ banned: true }));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BANNED');
    });

    it('403 ACCOUNT_BLOCKED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({ blocked: true }));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BLOCKED');
    });

    // ─── 503 DB indisponível ──────────────────────────────────────────────
    it('503 DB_UNAVAILABLE', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(503);
        expect(res.body.code).toBe('DB_UNAVAILABLE');
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
