/**
 * __tests__/routes/internal-punishments.test.js
 *
 * Suite para rotas internas de punições:
 *   POST /expapi/internal/newpunishrecord
 *   POST /expapi/internal/modifypunishrecord
 *   POST /expapi/internal/removepunishrecord
 *
 * Tipos: ban, mute, warn
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, INTERNAL_KEY, internalKey,
    mockLogger, mockPunishServices,
} = require('../helpers/testUtils');

mockLogger();
const { BanListService, MuteListService, WarnListService } = mockPunishServices();

const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── POST /expapi/internal/newpunishrecord ─────────────────────────────────
describe('POST /expapi/internal/newpunishrecord', () => {
    const URL = '/expapi/internal/newpunishrecord';

    it('200 cria registro de ban', async () => {
        BanListService.addBan.mockResolvedValueOnce({ guildId: 'g1', targetId: 't1' });

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1', staffId: 's1', reason: 'spam',
        });

        expect(res.status).toBe(200);
        expect(BanListService.addBan).toHaveBeenCalledWith('g1', 't1', 's1', 'spam', undefined);
    });

    it('200 cria registro de mute', async () => {
        MuteListService.addMute.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'mute', guildId: 'g1', targetId: 't1', staffId: 's1',
        });

        expect(res.status).toBe(200);
        expect(MuteListService.addMute).toHaveBeenCalled();
    });

    it('200 cria registro de warn', async () => {
        WarnListService.addWarn.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'warn', guildId: 'g1', targetId: 't1', staffId: 's1',
        });

        expect(res.status).toBe(200);
        expect(WarnListService.addWarn).toHaveBeenCalled();
    });

    it('400 MISSING_PARAMS sem type', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g1', targetId: 't1', staffId: 's1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem guildId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', targetId: 't1', staffId: 's1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem targetId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', staffId: 's1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem staffId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_TYPE para tipo desconhecido', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'kick', guildId: 'g1', targetId: 't1', staffId: 's1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TYPE');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({
            type: 'ban', guildId: 'g', targetId: 't', staffId: 's',
        });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        BanListService.addBan.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g', targetId: 't', staffId: 's',
        });
        expect(res.status).toBe(500);
    });
});

// ─── POST /expapi/internal/modifypunishrecord ──────────────────────────────
describe('POST /expapi/internal/modifypunishrecord', () => {
    const URL = '/expapi/internal/modifypunishrecord';

    it('200 modifica registro de ban', async () => {
        BanListService.updateBan.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1',
            updateData: { reason: 'updated reason', endTime: new Date() },
        });

        expect(res.status).toBe(200);
    });

    it('200 modifica registro de mute', async () => {
        MuteListService.updateMute.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'mute', guildId: 'g1', targetId: 't1',
            updateData: { reason: 'new' },
        });

        expect(res.status).toBe(200);
    });

    it('200 modifica registro de warn', async () => {
        WarnListService.update.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'warn', guildId: 'g1', targetId: 't1',
            updateData: { reason: 'new reason' },
        });

        expect(res.status).toBe(200);
    });

    it('200 ignora campos NÃO whitelistados (apenas reason, endTime, staffId)', async () => {
        BanListService.updateBan.mockResolvedValueOnce({});

        await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1',
            updateData: {
                reason: 'new',
                endTime: '2025-12-31T23:59:59Z', // string ISO (JSON serialization)
                staffId: 's2',
                _id: 'should-be-ignored', // NOT whitelisted
                targetId: 'should-be-ignored', // NOT whitelisted
                guildId: 'should-be-ignored', // NOT whitelisted
            },
        });

        const callArgs = BanListService.updateBan.mock.calls[0];
        expect(callArgs[2]).toEqual({
            reason: 'new',
            endTime: '2025-12-31T23:59:59Z',
            staffId: 's2',
        });
        expect(callArgs[2]).not.toHaveProperty('_id');
        expect(callArgs[2]).not.toHaveProperty('targetId');
    });

    it('400 MISSING_PARAMS sem updateData', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 NO_VALID_FIELDS quando updateData só tem campos não-whitelistados', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1',
            updateData: { _id: 'hack', targetId: 'hack' },
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NO_VALID_FIELDS');
    });

    it('400 INVALID_TYPE para tipo desconhecido', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'kick', guildId: 'g1', targetId: 't1', updateData: { reason: 'x' },
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TYPE');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({
            type: 'ban', guildId: 'g', targetId: 't', updateData: { reason: 'x' },
        });
        expect(res.status).toBe(401);
    });
});

// ─── POST /expapi/internal/removepunishrecord ──────────────────────────────
describe('POST /expapi/internal/removepunishrecord', () => {
    const URL = '/expapi/internal/removepunishrecord';

    it('200 remove registro de ban', async () => {
        BanListService.removeBan.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g1', targetId: 't1',
        });

        expect(res.status).toBe(200);
    });

    it('200 remove registro de mute', async () => {
        MuteListService.removeMute.mockResolvedValueOnce({ deletedCount: 1 });
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'mute', guildId: 'g1', targetId: 't1',
        });
        expect(res.status).toBe(200);
    });

    it('200 remove registro de warn', async () => {
        WarnListService.removeWarn.mockResolvedValueOnce({ deletedCount: 1 });
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'warn', guildId: 'g1', targetId: 't1',
        });
        expect(res.status).toBe(200);
    });

    it('400 MISSING_PARAMS sem type', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            guildId: 'g1', targetId: 't1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_TYPE para tipo desconhecido', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'kick', guildId: 'g1', targetId: 't1',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_TYPE');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({
            type: 'ban', guildId: 'g', targetId: 't',
        });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        BanListService.removeBan.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey()).send({
            type: 'ban', guildId: 'g', targetId: 't',
        });
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
