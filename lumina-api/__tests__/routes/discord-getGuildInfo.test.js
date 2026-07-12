/**
 * __tests__/routes/discord-getGuildInfo.test.js
 *
 * Suite para GET /expapi/v1/discord/guild/:guildId
 * Busca info da guilda via Discord OAuth do usuário + canais/cargos via bot token
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAccount, makeGuild,
    mockLogger, mockDashboardAccountService, mockGuildService, mockBotService, mockAxios,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockGuildService();
mockBotService();
mockAxios();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const GuildService = require('../../src/database/services/GuildService');
const BotService = require('../../src/database/services/BotService');
const axios = require('axios');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
    process.env.DISCORD_AUTH_REDIRECT_URI = 'https://example.com/callback';
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/discord/guild/:guildId', () => {
    const validGuildId = '987654321098765432';
    const URL = (id = validGuildId) => `/expapi/v1/discord/guild/${id}`;
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna info da guilda + canManage', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
            discordOauth2TokenScope: 'identify email guilds guilds.members.read',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(account);

        // Primeira chamada (axios.get /users/@me/guilds) retorna a guilda
        // Chamadas subsequentes (bot: members/@me, channels, roles) retornam array vazio
        axios.get
            .mockResolvedValueOnce({
                data: [{ id: validGuildId, name: 'My Guild', icon: 'icon', owner: false, permissions: '32', features: [] }],
            })
            .mockResolvedValue({ data: [] });

        GuildService.getGuildData.mockResolvedValue(makeGuild({ guildId: validGuildId }));

        const res = await request(app).get(URL()).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(validGuildId);
        expect(res.body.name).toBe('My Guild');
        expect(res.body.canManage).toBe(true); // permissions: '32' = MANAGE_GUILD
    });

    it('400 INVALID_GUILD_ID para ID com formato inválido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        }));

        const res = await request(app).get(URL('not-a-number')).set(authHeader());

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_GUILD_ID');
    });

    it('400 para ID muito curto (< 17 dígitos)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        }));

        const res = await request(app).get(URL('12345')).set(authHeader());

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_GUILD_ID');
    });

    it('401 sem auth', async () => {
        const res = await request(app).get(URL());
        expect(res.status).toBe(401);
    });

    it('403 DISCORD_NOT_LINKED quando conta não tem Discord', async () => {
        // Usar mockResolvedValue (não Once) pois a rota chama getDashboardAccountByEmail 2x
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ discordOauth2Token: '' })
        );

        const res = await request(app).get(URL()).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('DISCORD_NOT_LINKED');
    });

    it('403 NOT_GUILD_MEMBER quando usuário não é membro da guilda', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(account);

        axios.get.mockResolvedValue({ data: [] }); // lista vazia = não é membro

        const res = await request(app).get(URL()).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NOT_GUILD_MEMBER');
    });

    it('429 DISCORD_RATE_LIMITED quando Discord retorna 429', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(account);

        const err = new Error('rate limited');
        err.response = { status: 429, headers: { 'retry-after': '3' } };
        axios.get.mockRejectedValue(err);

        const res = await request(app).get(URL()).set(authHeader());

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DISCORD_RATE_LIMITED');
    });

    it('403 DISCORD_MISSING_GUILDS_SCOPE quando Discord retorna 403', async () => {
        const account = makeAccount({
            discordOauth2Token: 'valid',
            discordOauth2TokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(account);

        const err = new Error('forbidden');
        err.response = { status: 403 };
        axios.get.mockRejectedValue(err);

        const res = await request(app).get(URL()).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('DISCORD_MISSING_GUILDS_SCOPE');
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
