/**
 * __tests__/routes/expapi-v1-publicRollskin.test.js
 *
 * Suite para POST /expapi/v1/rollskin
 * Requer: jwtNeeded + CSRF (bypassed em test)
 * Usa rollSkin do gachaService
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf, makeAccount,
    mockLogger, mockDashboardAccountService, mockInventoryService, mockSkinService, mockAxios,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockInventoryService();
mockSkinService();
mockAxios();

// Mock do gachaService — é chamado diretamente pelo route handler
jest.mock('../../src/utils/gachaService', () => ({
    rollSkin: jest.fn(),
    computeProbabilities: jest.fn(),
    pickRarity: jest.fn(),
    RARITY_ORDER: ['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic'],
}));

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const { rollSkin } = require('../../src/utils/gachaService');
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

describe('POST /expapi/v1/rollskin', () => {
    const URL = '/expapi/v1/rollskin';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt());
    const withAuth = (req) => req.set(combineAuthAndCsrf(authHeader(), csrf.headers));

    it('200 sorteia skin hextechChests com sucesso', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        rollSkin.mockResolvedValueOnce({
            skinId: 1001,
            skinName: 'Awesome Skin',
            rarity: 'epic',
            championId: 1,
            championName: 'Annie',
        });

        const res = await withAuth(request(app).post(URL)).send({ chestType: 'hextechChests' });

        expect(res.status).toBe(200);
        expect(res.body.skinId).toBe(1001);
        expect(res.body.rarity).toBe('epic');
        expect(rollSkin).toHaveBeenCalledWith('123456789012345678', 'hextechChests');
    });

    it('200 sorteia skin masterWorkChests', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        rollSkin.mockResolvedValueOnce({
            skinId: 2002, skinName: 'Masterwork Skin', rarity: 'legendary', championId: 2,
        });

        const res = await withAuth(request(app).post(URL)).send({ chestType: 'masterWorkChests' });

        expect(res.status).toBe(200);
        expect(rollSkin).toHaveBeenCalledWith('123456789012345678', 'masterWorkChests');
    });

    // ─── 400 Inputs inválidos ─────────────────────────────────────────────
    it('400 MISSING_PARAMS sem chestType', async () => {
        const res = await withAuth(request(app).post(URL)).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_CHEST_TYPE para chestType inválido', async () => {
        const res = await withAuth(request(app).post(URL)).send({ chestType: 'invalidChest' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_CHEST_TYPE');
    });

    it('400 INVALID_CHEST_TYPE para chestType vazio', async () => {
        const res = await withAuth(request(app).post(URL)).send({ chestType: '' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem JWT', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers))
            .send({ chestType: 'hextechChests' });
        expect(res.status).toBe(401);
    });

    // ─── 400 Sem recursos ─────────────────────────────────────────────────
    it('400 INSUFFICIENT_RESOURCES quando rollSkin retorna null', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        rollSkin.mockResolvedValueOnce(null);

        const res = await withAuth(request(app).post(URL)).send({ chestType: 'hextechChests' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INSUFFICIENT_RESOURCES');
    });

    // ─── 500 Erro ─────────────────────────────────────────────────────────
    it('500 erro no rollSkin', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);
        axios.get.mockResolvedValueOnce({ data: { id: '123456789012345678' } });

        rollSkin.mockRejectedValueOnce(new Error('DB error'));

        const res = await withAuth(request(app).post(URL)).send({ chestType: 'hextechChests' });
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
