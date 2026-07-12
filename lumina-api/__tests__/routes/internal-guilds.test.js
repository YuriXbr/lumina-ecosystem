/**
 * __tests__/routes/internal-guilds.test.js
 *
 * Suite para rotas internas de guild:
 *   POST /expapi/internal/newguild
 *   POST|DELETE /expapi/internal/deleteguild
 *   POST /expapi/internal/fetchguilddata
 *   POST /expapi/internal/updateguilddata
 *
 * Todas requerem internal-key (exceto fetchinventory e fetchuserskins que são públicas).
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, INTERNAL_KEY, internalKey, makeGuild,
    mockLogger, mockGuildService,
} = require('../helpers/testUtils');

mockLogger();
mockGuildService();

const GuildService = require('../../src/database/services/GuildService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── POST /expapi/internal/newguild ────────────────────────────────────────
describe('POST /expapi/internal/newguild', () => {
    const URL = '/expapi/internal/newguild';

    it('200 cria guild com sucesso', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(null);
        GuildService.createGuildData.mockResolvedValueOnce(makeGuild({ guildId: 'g-new' }));

        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g-new', ownerId: 'o1', guildName: 'New Server',
        });

        expect(res.status).toBe(200);
        expect(res.body.guildId).toBe('g-new');
    });

    it('200 faz upsert quando guild já existe (bot re-adicionado)', async () => {
        const existing = makeGuild({ guildId: 'g1', guildReferenceName: 'Old Name' });
        GuildService.getGuildData.mockResolvedValueOnce(existing);
        GuildService.updateGuildData.mockResolvedValueOnce({ ...existing, guildReferenceName: 'New Name' });

        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g1', ownerId: 'o1', guildName: 'New Name',
        });

        expect(res.status).toBe(200);
        expect(res.body._upserted).toBe(true);
        expect(GuildService.updateGuildData).toHaveBeenCalled();
    });

    it('400 MISSING_PARAMS sem guildId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ ownerId: 'o1', guildName: 'n' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem ownerId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'g1', guildName: 'n' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem guildName', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'g1', ownerId: 'o1' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ guildId: 'g', ownerId: 'o', guildName: 'n' });
        expect(res.status).toBe(401);
    });

    it('401 com internal-key errada', async () => {
        const res = await request(app).post(URL).set(internalKey('wrong')).send({ guildId: 'g', ownerId: 'o', guildName: 'n' });
        expect(res.status).toBe(401);
    });

    it('500 erro ao criar', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(null);
        GuildService.createGuildData.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g', ownerId: 'o', guildName: 'n',
        });

        expect(res.status).toBe(500);
    });
});

// ─── POST|DELETE /expapi/internal/deleteguild ──────────────────────────────
describe('DELETE /expapi/internal/deleteguild', () => {
    const URL = '/expapi/internal/deleteguild';

    it('200 deleta guild existente via DELETE', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.delete.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await request(app).delete(URL).set(internalKey()).send({ guildId: 'g1' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/removida/i);
    });

    it('200 deleta guild existente via POST', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.delete.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'g1' });

        expect(res.status).toBe(200);
    });

    it('400 MISSING_GUILD_ID sem guildId', async () => {
        const res = await request(app).delete(URL).set(internalKey()).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_GUILD_ID');
    });

    it('404 GUILD_NOT_FOUND', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(null);
        const res = await request(app).delete(URL).set(internalKey()).send({ guildId: 'ghost' });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('GUILD_NOT_FOUND');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).delete(URL).send({ guildId: 'g' });
        expect(res.status).toBe(401);
    });

    it('500 erro ao deletar', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild());
        GuildService.delete.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).delete(URL).set(internalKey()).send({ guildId: 'g1' });
        expect(res.status).toBe(500);
    });
});

// ─── POST /expapi/internal/fetchguilddata ──────────────────────────────────
describe('POST /expapi/internal/fetchguilddata', () => {
    const URL = '/expapi/internal/fetchguilddata';

    it('200 retorna dados da guild', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(makeGuild({ prefix: 'l!' }));

        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'g1' });

        expect(res.status).toBe(200);
        expect(res.body.prefix).toBe('l!');
    });

    it('400 MISSING_GUILD_ID sem guildId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_GUILD_ID');
    });

    it('404 GUILD_NOT_FOUND', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(null);
        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'ghost' });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('GUILD_NOT_FOUND');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ guildId: 'g' });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        GuildService.getGuildData.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'g' });
        expect(res.status).toBe(500);
    });
});

// ─── POST /expapi/internal/updateguilddata ─────────────────────────────────
describe('POST /expapi/internal/updateguilddata', () => {
    const URL = '/expapi/internal/updateguilddata';

    it('200 atualiza campos whitelistados', async () => {
        GuildService.updateGuildData.mockResolvedValueOnce({ ...makeGuild(), prefix: '!' });

        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g1', prefix: '!', djEnabled: true,
        });

        expect(res.status).toBe(200);
        expect(res.body.updatedFields).toContain('prefix');
        expect(res.body.updatedFields).toContain('djEnabled');
    });

    it('200 ignora campos NÃO whitelistados (defense-in-depth)', async () => {
        GuildService.updateGuildData.mockResolvedValueOnce(makeGuild());

        await request(app).post(URL).set(internalKey()).send({
            guildId: 'g1',
            prefix: '!', // whitelisted
            _id: 'should-be-ignored', // NOT whitelisted
            guildOwnerId: 'should-be-ignored', // NOT whitelisted
        });

        const callArgs = GuildService.updateGuildData.mock.calls[0];
        expect(callArgs[1]).toEqual({ prefix: '!' });
        expect(callArgs[1]).not.toHaveProperty('_id');
        expect(callArgs[1]).not.toHaveProperty('guildOwnerId');
    });

    it('400 MISSING_GUILD_ID sem guildId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ prefix: '!' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_GUILD_ID');
    });

    it('400 NO_VALID_FIELDS quando body só tem campos não-whitelistados', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g1', _id: 'hack', accountId: 'hack',
        });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NO_VALID_FIELDS');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ guildId: 'g', prefix: '!' });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        GuildService.updateGuildData.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey()).send({ guildId: 'g', prefix: '!' });
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
