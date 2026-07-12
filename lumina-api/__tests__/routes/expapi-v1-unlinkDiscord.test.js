/**
 * __tests__/routes/expapi-v1-unlinkDiscord.test.js
 *
 * Suite para POST /expapi/v1/unlink-discord
 * Requer JWT + CSRF (bypassed em test)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf, makeAccount,
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

describe('POST /expapi/v1/unlink-discord', () => {
    const URL = '/expapi/v1/unlink-discord';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt());
    const withAuth = (req) => req.set(combineAuthAndCsrf(authHeader(), csrf.headers));

    it('200 desvincula Discord com sucesso', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Id: '123', password: '$2a$10$hash' })
        );
        DashboardAccountService.update.mockResolvedValueOnce(true);

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(DashboardAccountService.update).toHaveBeenCalled();
    });

    it('400 DISCORD_NOT_LINKED quando conta não tem Discord vinculado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Id: '', authProviders: {} })
        );

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('DISCORD_NOT_LINKED');
    });

    it('400 SET_PASSWORD_FIRST quando conta não tem senha (não pode perder acesso)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Id: '123', password: '', authProviders: { discord: { providerId: '123' } } })
        );

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('SET_PASSWORD_FIRST');
    });

    it('401 sem auth', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send();
        expect(res.status).toBe(401);
    });

    it('401 ACCOUNT_NOT_FOUND', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await withAuth(request(app).post(URL)).send();
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('500 erro no update', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Id: '123', password: '$2a$10$hash' })
        );
        DashboardAccountService.update.mockRejectedValueOnce(new Error('DB down'));

        const res = await withAuth(request(app).post(URL)).send();
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
