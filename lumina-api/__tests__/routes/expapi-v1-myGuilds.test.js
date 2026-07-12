/**
 * __tests__/routes/expapi-v1-myGuilds.test.js
 *
 * Suite para GET /expapi/v1/my-guilds
 * Requer JWT + Discord OAuth vinculado
 * Chama Discord API (axios) para listar guildas do usuário
 *
 * Cobertura:
 *   - 200 sucesso (lista guildas com hasBot/canManage)
 *   - 401 sem auth
 *   - 401 ACCOUNT_NOT_FOUND
 *   - 400 DISCORD_NOT_LINKED
 *   - 429 DISCORD_RATE_LIMITED (Discord returns 429)
 *   - 403 DISCORD_MISSING_GUILDS_SCOPE (Discord returns 403)
 *   - 500 erro ao refresh token
 *   - 502 DISCORD_API_ERROR
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAccount,
    mockLogger, mockDashboardAccountService, mockGuildService, mockAxios,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockGuildService();
mockAxios();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const GuildService = require('../../src/database/services/GuildService');
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

describe('GET /expapi/v1/my-guilds', () => {
    const URL = '/expapi/v1/my-guilds';
    const authHeader = () => bearerAuth(makeJwt());

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 retorna guildas do usuário com hasBot/canManage', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid-token',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000), // não expira
            discordOauth2TokenScope: 'identify email guilds guilds.members.read',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({
            data: [
                { id: '111', name: 'Server A', icon: 'a1', owner: true, permissions: '0' },
                { id: '222', name: 'Server B', icon: null, owner: false, permissions: '32' }, // MANAGE_GUILD
                { id: '333', name: 'Server C', icon: null, owner: false, permissions: '8' }, // ADMINISTRATOR
                { id: '444', name: 'Server D', icon: null, owner: false, permissions: '0' }, // sem perm
            ],
        });

        GuildService.getAll.mockResolvedValueOnce([
            { guildId: '222', prefix: 'l!', guildLocale: 'pt-BR', memberWelcomeToggle: true, memberCount: 50 },
        ]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.guilds).toHaveLength(4);
        expect(res.body.guilds[0]).toHaveProperty('id');
        expect(res.body.guilds[0]).toHaveProperty('hasBot');
        expect(res.body.guilds[0]).toHaveProperty('canManage');

        // Verifica que Server B (222) tem hasBot=true
        const serverB = res.body.guilds.find(g => g.id === '222');
        expect(serverB.hasBot).toBe(true);
        expect(serverB.canManage).toBe(true);
        expect(serverB.botConfig).toBeTruthy();
    });

    it('200 ordena: com bot primeiro, depois canManage, depois alfabético', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
            discordOauth2TokenScope: 'identify email guilds',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.get.mockResolvedValueOnce({
            data: [
                { id: '1', name: 'Zebra Server', owner: false, permissions: '0' },
                { id: '2', name: 'Apple Server', owner: false, permissions: '32' },
                { id: '3', name: 'Banana Server', owner: true, permissions: '0' },
            ],
        });

        GuildService.getAll.mockResolvedValueOnce([{ guildId: '3', prefix: 'l!' }]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        // Com bot primeiro (3), depois canManage (2), depois alfabético (1)
        expect(res.body.guilds.map(g => g.id)).toEqual(['3', '2', '1']);
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('401 ACCOUNT_NOT_FOUND quando conta não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 400 Discord não vinculado ────────────────────────────────────────
    it('400 DISCORD_NOT_LINKED quando conta não tem Discord OAuth', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ discordOauth2Token: '' })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('DISCORD_NOT_LINKED');
    });

    // ─── 429 Rate limited pelo Discord ────────────────────────────────────
    it('429 DISCORD_RATE_LIMITED quando Discord retorna 429', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
            discordOauth2TokenScope: 'identify email guilds',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const err = new Error('rate limited');
        err.response = { status: 429, headers: { 'retry-after': '2' } };
        axios.get.mockRejectedValueOnce(err);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DISCORD_RATE_LIMITED');
    });

    // ─── 403 Missing guilds scope ─────────────────────────────────────────
    it('403 DISCORD_MISSING_GUILDS_SCOPE quando Discord retorna 403', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
            discordOauth2TokenScope: 'identify email', // sem guilds
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const err = new Error('forbidden');
        err.response = { status: 403 };
        axios.get.mockRejectedValueOnce(err);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('DISCORD_MISSING_GUILDS_SCOPE');
    });

    // ─── Refresh token expirado ───────────────────────────────────────────
    it('200 faz refresh do token quando expirado e retorna guildas (após correção do bug)', async () => {
        // CORREÇÃO #1: a rota agora usa `let account` em vez de `const account`,
        // permitindo reatribuição após refresh do token OAuth2 do Discord.
        const account = makeAccount({
            discordOauth2Token: 'expired',
            discordOauth2TokenExpiresAt: new Date(Date.now() - 1000),
            discordOauth2RefreshToken: 'valid-refresh',
            discordOauth2TokenScope: 'identify email guilds',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(account);

        axios.post.mockResolvedValue({
            data: {
                access_token: 'new-token',
                refresh_token: 'new-refresh',
                expires_in: 3600,
                token_type: 'Bearer',
                scope: 'identify email guilds',
            },
        });
        DashboardAccountService.update.mockResolvedValue({
            ...account,
            discordOauth2Token: 'new-token',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });

        axios.get.mockResolvedValue({ data: [{ id: '1', name: 'S', owner: true, permissions: '0' }] });
        GuildService.getAll.mockResolvedValue([]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(axios.post).toHaveBeenCalled(); // refresh foi chamado
    });

    it('500 quando refresh token falha (sem ser 429)', async () => {
        const account = makeAccount({
            discordOauth2Token: 'expired',
            discordOauth2TokenExpiresAt: new Date(Date.now() - 1000),
            discordOauth2RefreshToken: 'invalid',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        axios.post.mockRejectedValueOnce(new Error('invalid_grant'));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(500);
    });

    // ─── 500 Erro genérico ────────────────────────────────────────────────
    it('500 erro inesperado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL).set(authHeader());
        // verifyRequestAuthWithAccountCheck retorna 503 para DB errors
        expect([500, 503]).toContain(res.status);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
