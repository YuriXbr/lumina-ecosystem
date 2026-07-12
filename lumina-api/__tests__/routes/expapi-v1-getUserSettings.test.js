/**
 * __tests__/routes/expapi-v1-getUserSettings.test.js
 *
 * Suite para GET /expapi/v1/user/settings
 * Requer: JWT via verifyRequestAuthWithAccountCheck (cookie ou Bearer)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, makeGarbageJwt, bearerAuth, makeAccount,
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

describe('GET /expapi/v1/user/settings', () => {
    const URL = '/expapi/v1/user/settings';

    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna configurações do usuário', async () => {
        const account = makeAccount({
            emailNotifications: false,
            discordNotifications: false,
            botActivityAlerts: true,
            publicProfile: true,
            showOnlineStatus: false,
            language: 'en-US',
            timezone: 'America/New_York',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.emailNotifications).toBe(false);
        expect(res.body.discordNotifications).toBe(false);
        expect(res.body.botActivityAlerts).toBe(true);
        expect(res.body.publicProfile).toBe(true);
        expect(res.body.showOnlineStatus).toBe(false);
        expect(res.body.language).toBe('en-US');
        expect(res.body.timezone).toBe('America/New_York');
    });

    it('200 usa defaults quando campos são null/undefined', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            emailNotifications: null,
            discordNotifications: undefined,
            botActivityAlerts: null,
            publicProfile: null,
            showOnlineStatus: null,
            language: null,
            timezone: null,
        }));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        // Defaults: ?? true, || false
        expect(res.body.emailNotifications).toBe(true);
        expect(res.body.discordNotifications).toBe(true);
        expect(res.body.botActivityAlerts).toBe(false);
        expect(res.body.publicProfile).toBe(false);
        expect(res.body.showOnlineStatus).toBe(true);
        expect(res.body.language).toBe('pt-BR');
        expect(res.body.timezone).toBe('America/Sao_Paulo');
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('401 com token lixo', async () => {
        const res = await request(app).get(URL).set(bearerAuth(makeGarbageJwt()));
        expect(res.status).toBe(401);
    });

    // ─── 404 Conta não existe ─────────────────────────────────────────────
    it('401 ACCOUNT_NOT_FOUND quando conta não existe (auth check returns 401)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 403 Conta banida ─────────────────────────────────────────────────
    it('403 ACCOUNT_BANNED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ banned: true })
        );

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BANNED');
    });

    it('403 ACCOUNT_BLOCKED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ blocked: true })
        );

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BLOCKED');
    });

    // ─── 503 DB indisponível ──────────────────────────────────────────────
    it('503 DB_UNAVAILABLE quando service falha', async () => {
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
