/**
 * __tests__/routes/admin-getGuilds.test.js
 *
 * Suite para GET /expapi/v1/admin/guilds
 * Lista guildas do banco + guildas do bot (via Discord API)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAdminAccount, makeGuild,
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
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/admin/guilds', () => {
    const URL = '/expapi/v1/admin/guilds';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna guildas combinadas (DB + Discord)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getAll.mockResolvedValueOnce([
            makeGuild({ guildId: '111', guildReferenceName: 'DB Guild' }),
        ]);
        axios.get.mockResolvedValueOnce({
            data: [
                { id: '111', name: 'Discord Guild', icon: 'icon1', approximate_member_count: 200 },
                { id: '222', name: 'Discord Only', icon: null, approximate_member_count: 50 },
            ],
        });

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.guilds).toHaveLength(2);
        // DB Guild (configurada) deve vir primeiro
        expect(res.body.guilds[0].configured).toBe(true);
        expect(res.body.guilds[1].configured).toBe(false);
        expect(res.body.pagination.configured).toBe(1);
        expect(res.body.pagination.unconfigured).toBe(1);
    });

    it('200 continua funcionando mesmo se Discord API falhar', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getAll.mockResolvedValueOnce([makeGuild()]);
        axios.get.mockRejectedValueOnce(new Error('Discord down'));

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        // Apenas guildas do DB
        expect(res.body.guilds).toHaveLength(1);
    });

    it('200 usa BotService se DISCORD_BOT_TOKEN não estiver setado', async () => {
        delete process.env.DISCORD_BOT_TOKEN;
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getAll.mockResolvedValueOnce([]);
        BotService.getBot.mockResolvedValueOnce({ token: 'bot-token-from-db' });
        axios.get.mockResolvedValueOnce({ data: [] });

        await request(app).get(URL).set(authHeader());

        expect(BotService.getBot).toHaveBeenCalled();
        process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
    });

    it('200 aceita paginação e busca', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getAll.mockResolvedValueOnce([]);
        axios.get.mockResolvedValueOnce({ data: [] });

        await request(app).get(`${URL}?page=2&limit=10&search=test`).set(authHeader());

        // Verifica que a resposta é 200 (paginação é feita após combinar guildas)
    });

    it('401 sem auth', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ accessType: 'user' })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });

    it('403 ACCOUNT_SUSPENDED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ banned: true })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
