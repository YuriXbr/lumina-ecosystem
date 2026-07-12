/**
 * __tests__/routes/expapi-v1-myInventory.test.js
 *
 * Suite para GET /expapi/v1/myinventory
 * Requer: jwtNeeded (processado no middleware do index.js)
 * Usa resolveDiscordAccount para pegar Discord ID
 *
 * Cobertura:
 *   - 200 sucesso (retorna chaves, baús, daily disponível)
 *   - 200 cria inventário se não existe
 *   - 401 sem JWT
 *   - 400/403 DISCORD_NOT_LINKED (quando conta não tem Discord)
 *   - 502 DISCORD_API_ERROR
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeInventory, makeAccount,
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

describe('GET /expapi/v1/myinventory', () => {
    const URL = '/expapi/v1/myinventory';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna inventário existente', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.getInventory.mockResolvedValueOnce(makeInventory({
            keys: 5,
            hextechChests: 3,
            masterWorkChests: 2,
            nextDailyReward: null,
            dailyRewardStreak: 5,
        }));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.keys).toBe(5);
        expect(res.body.hextechChests).toBe(3);
        expect(res.body.masterWorkChests).toBe(2);
        expect(res.body.dailyRewardAvailable).toBe(true);
        expect(res.body.dailyRewardStreak).toBe(5);
    });

    it('200 cria inventário se não existir', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.getInventory.mockResolvedValueOnce(null);
        InventoryService.create.mockResolvedValueOnce(makeInventory({ userId: '123456789012345678' }));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(InventoryService.create).toHaveBeenCalledWith({ userId: '123456789012345678' });
    });

    it('200 dailyRewardAvailable=false quando nextDailyReward é futuro', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.getInventory.mockResolvedValueOnce(makeInventory({
            nextDailyReward: new Date(Date.now() + 12 * 3600 * 1000), // 12h no futuro
        }));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.dailyRewardAvailable).toBe(false);
    });

    // ─── 401 ──────────────────────────────────────────────────────────────
    it('401 sem JWT', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    // ─── Erros do resolveDiscordAccount ───────────────────────────────────
    it('400 DISCORD_NOT_LINKED quando conta não tem Discord', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Token: '' })
        );

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('DISCORD_NOT_LINKED');
    });

    it('502 DISCORD_API_ERROR quando Discord falha (não 401)', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const err = new Error('Discord failed');
        err.response = { status: 500 };
        axios.get.mockRejectedValueOnce(err);

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(502);
        expect(res.body.code).toBe('DISCORD_API_ERROR');
    });

    it('403 DISCORD_TOKEN_EXPIRED quando Discord retorna 401', async () => {
        const account = makeAccount({
            discordOauth2Token: 'expired-on-discord-side',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const err = new Error('unauthorized');
        err.response = { status: 401 };
        axios.get.mockRejectedValueOnce(err);

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('DISCORD_TOKEN_EXPIRED');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro no InventoryService', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        InventoryService.getInventory.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
