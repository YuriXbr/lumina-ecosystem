/**
 * __tests__/routes/expapi-v1-dailyReward.test.js
 *
 * Suite para POST /expapi/v1/dailyreward
 * Requer: jwtNeeded + CSRF (bypassed em test)
 * Usa resolveDiscordAccount para resolver Discord ID
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf, makeAccount,
    mockLogger, mockDashboardAccountService, mockInventoryService, mockAxios,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockInventoryService();
mockAxios();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const InventoryService = require('../../src/database/services/UserInventoryService');
const axios = require('axios');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'https://example.com/callback';
});

afterEach(() => jest.clearAllMocks());

describe('POST /expapi/v1/dailyreward', () => {
    const URL = '/expapi/v1/dailyreward';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt());
    const withAuth = (req) => req.set(combineAuthAndCsrf(authHeader(), csrf.headers));

    it('200 resgata diária com sucesso', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.claimDaily.mockResolvedValueOnce({
            claimed: true,
            reward: { hextechChests: 3, keys: 1 },
            streak: 1,
            nextDailyReward: new Date(Date.now() + 24 * 3600 * 1000),
            inventory: {},
        });

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(200);
        expect(res.body.claimed).toBe(true);
        expect(res.body.reward.hextechChests).toBe(3);
    });

    it('429 DAILY_ALREADY_CLAIMED quando já resgatou', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.claimDaily.mockResolvedValueOnce({
            claimed: false,
            nextDailyReward: new Date(Date.now() + 23 * 3600 * 1000),
            streak: 5,
        });

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DAILY_ALREADY_CLAIMED');
        expect(res.body.streak).toBe(5);
    });

    it('401 sem JWT', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send();
        expect(res.status).toBe(401);
    });

    it('400 DISCORD_NOT_LINKED quando sem Discord', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Token: '' })
        );
        const res = await withAuth(request(app).post(URL)).send();
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('DISCORD_NOT_LINKED');
    });

    it('500 erro no claimDaily', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.claimDaily.mockRejectedValueOnce(new Error('DB down'));

        const res = await withAuth(request(app).post(URL)).send();
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
