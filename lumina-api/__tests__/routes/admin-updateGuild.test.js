/**
 * __tests__/routes/admin-updateGuild.test.js
 *
 * Suite para PUT /expapi/v1/admin/guilds/:guildId
 * Restrito a admin+ (level 7+), com whitelisting de campos por nível
 * e validação de TIPO (boolean/string/number/object).
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
    makeAccount, makeAdminAccount, makeGuild,
    mockLogger, mockDashboardAccountService, mockGuildService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockGuildService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const GuildService = require('../../src/database/services/GuildService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('PUT /expapi/v1/admin/guilds/:guildId', () => {
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const headers = () => combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers);

    it('200 admin level 7 pode atualizar toggles (djEnabled)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.updateGuildData.mockResolvedValueOnce(true);

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ djEnabled: true });

        expect(res.status).toBe(200);
        expect(GuildService.updateGuildData).toHaveBeenCalledWith('123', { djEnabled: true });
    });

    it('200 admin level 8 pode atualizar prefix', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'headadmin' })
        );
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.updateGuildData.mockResolvedValueOnce(true);

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ prefix: '!' });

        expect(res.status).toBe(200);
        expect(GuildService.updateGuildData).toHaveBeenCalledWith('123', { prefix: '!' });
    });

    it('200 admin level 9 pode atualizar warnsToMute', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'developer' })
        );
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.updateGuildData.mockResolvedValueOnce(true);

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ warnsToMute: 5 });

        expect(res.status).toBe(200);
        expect(GuildService.updateGuildData).toHaveBeenCalledWith('123', { warnsToMute: 5 });
    });

    // ─── 400 Validação de tipo ────────────────────────────────────────────
    it('400 INVALID_FIELD_TYPE quando djEnabled é string em vez de boolean', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ djEnabled: 'true' }); // string, não boolean

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_FIELD_TYPE');
        expect(res.body.details).toContainEqual({ field: 'djEnabled', expected: 'boolean', actual: 'string' });
    });

    it('400 INVALID_FIELD_TYPE quando warnsToMute é string em vez de number', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'developer' })
        );
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ warnsToMute: 'five' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_FIELD_TYPE');
    });

    it('400 INVALID_FIELD_TYPE quando prefix é número em vez de string', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'headadmin' })
        );
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ prefix: 123 });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_FIELD_TYPE');
    });

    // ─── 403 NO_ALLOWED_FIELDS ────────────────────────────────────────────
    it('403 NO_ALLOWED_FIELDS quando level 7 tenta mudar prefix (level 8+)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ prefix: '!' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NO_ALLOWED_FIELDS');
    });

    it('403 NO_ALLOWED_FIELDS quando level 7 tenta mudar warnsToMute (level 9+)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ warnsToMute: 5 });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NO_ALLOWED_FIELDS');
    });

    // ─── 404 Guild não existe ─────────────────────────────────────────────
    it('404 GUILD_NOT_FOUND', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getGuildData.mockResolvedValueOnce(null);

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/ghost')
            .set(headers())
            .send({ djEnabled: true });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('GUILD_NOT_FOUND');
    });

    // ─── 401/403 ──────────────────────────────────────────────────────────
    it('401 sem auth', async () => {
        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ djEnabled: true });
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'user' })
        );
        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ djEnabled: true });
        expect(res.status).toBe(403);
    });

    it('403 ACCOUNT_SUSPENDED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ banned: true })
        );
        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ djEnabled: true });
        expect(res.status).toBe(403);
    });

    // ─── 500 Erro ─────────────────────────────────────────────────────────
    it('500 erro ao atualizar', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.updateGuildData.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app)
            .put('/expapi/v1/admin/guilds/123')
            .set(headers())
            .send({ djEnabled: true });

        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
