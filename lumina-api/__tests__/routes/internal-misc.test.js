/**
 * __tests__/routes/internal-misc.test.js
 *
 * Suite para rotas internas misc:
 *   POST /expapi/internal/claimdaily (internal-key)
 *   POST /expapi/internal/commandlog (internal-key)
 *   GET /expapi/internal/staff (apiKey only)
 *   GET /expapi/internal/fetchbot (apiKey + internal-key, encrypted)
 *   POST /expapi/internal/updatebot (apiKey + internal-key, encrypted)
 */

'use strict';

const request = require('supertest');
const crypto = require('crypto');
const {
    JWT_SECRET, INTERNAL_KEY, API_KEY, internalKey, apiKeyHeader,
    mockLogger, mockInventoryService, mockBotService, mockLogService,
} = require('../helpers/testUtils');

mockLogger();
mockInventoryService();
mockBotService();
mockLogService();

const InventoryService = require('../../src/database/services/UserInventoryService');
const BotService = require('../../src/database/services/BotService');
const LogService = require('../../src/database/services/LogService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    process.env.LUMINA_API_KEY = API_KEY;
    process.env.ENCRYPTION_KEY = '0'.repeat(32); // 32 bytes para AES-256
});

afterEach(() => jest.clearAllMocks());

// ─── POST /expapi/internal/claimdaily ──────────────────────────────────────
describe('POST /expapi/internal/claimdaily', () => {
    const URL = '/expapi/internal/claimdaily';

    it('200 resgata diária com sucesso', async () => {
        InventoryService.claimDaily.mockResolvedValueOnce({
            claimed: true,
            reward: { hextechChests: 3, keys: 1 },
            streak: 1,
            nextDailyReward: new Date(),
        });

        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1' });

        expect(res.status).toBe(200);
        expect(res.body.claimed).toBe(true);
    });

    it('429 DAILY_ALREADY_CLAIMED', async () => {
        InventoryService.claimDaily.mockResolvedValueOnce({
            claimed: false,
            nextDailyReward: new Date(Date.now() + 23 * 3600 * 1000),
            streak: 5,
        });

        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1' });

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DAILY_ALREADY_CLAIMED');
    });

    it('400 MISSING_USER_ID sem userId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USER_ID');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ userId: 'u1' });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        InventoryService.claimDaily.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1' });
        expect(res.status).toBe(500);
    });
});

// ─── POST /expapi/internal/commandlog ──────────────────────────────────────
describe('POST /expapi/internal/commandlog', () => {
    const URL = '/expapi/internal/commandlog';

    it('200 registra log de comando', async () => {
        LogService.write.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            action: 'ping.executed',
            message: 'User executed /ping',
            durationMs: 50,
            userId: '123',
            guildId: '456',
        });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok', true);
    });

    it('400 MISSING_FIELDS sem action', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            message: 'No action',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 MISSING_FIELDS sem message', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({
            action: 'test',
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ action: 'x', message: 'y' });
        expect(res.status).toBe(401);
    });

    it('200 aceita extras opcionais (level, type, extra)', async () => {
        LogService.write.mockResolvedValueOnce({});

        const res = await request(app).post(URL).set(internalKey()).send({
            action: 'test',
            message: 'test msg',
            level: 'warn',
            type: 'COMMAND',
            extra: { foo: 'bar' },
        });

        expect(res.status).toBe(200);
    });
});

// ─── GET /expapi/internal/staff (apiKey only) ──────────────────────────────
describe('GET /expapi/internal/staff', () => {
    const URL = '/expapi/internal/staff';

    it('200 retorna staff do bot', async () => {
        BotService.getBot.mockResolvedValueOnce({
            owners: ['111'],
            admins: ['222'],
            moderators: ['333'],
        });

        const res = await request(app).get(URL).set(apiKeyHeader());

        expect(res.status).toBe(200);
        expect(res.body.owners).toEqual(['111']);
        expect(res.body.admins).toEqual(['222']);
        expect(res.body.moderators).toEqual(['333']);
    });

    it('401 sem apiKey', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('401 com apiKey errada', async () => {
        const res = await request(app).get(URL).set(apiKeyHeader('wrong-key'));
        expect(res.status).toBe(401);
    });

    it('404 BOT_NOT_FOUND quando bot não configurado', async () => {
        BotService.getBot.mockResolvedValueOnce(null);

        const res = await request(app).get(URL).set(apiKeyHeader());

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('BOT_NOT_FOUND');
    });
});

// ─── GET /expapi/internal/fetchbot (apiKey + internal-key, encrypted) ──────
describe('GET /expapi/internal/fetchbot', () => {
    const URL = '/expapi/internal/fetchbot';

    it('200 retorna dados do bot criptografados', async () => {
        BotService.getBot.mockResolvedValueOnce({ prefix: 'l!', devMode: false });

        const res = await request(app).get(URL)
            .set(internalKey())
            .set(apiKeyHeader());

        expect(res.status).toBe(200);
        // Resposta deve ser uma string criptografada (iv:data em hex)
        expect(typeof res.text).toBe('string');
        expect(res.text).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).get(URL).set(apiKeyHeader());
        expect(res.status).toBe(401);
    });

    it('401 sem apiKey', async () => {
        const res = await request(app).get(URL).set(internalKey());
        expect(res.status).toBe(401);
    });

    it('404 BOT_NOT_FOUND', async () => {
        BotService.getBot.mockResolvedValueOnce(null);

        const res = await request(app).get(URL)
            .set(internalKey())
            .set(apiKeyHeader());

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('BOT_NOT_FOUND');
    });
});

// ─── POST /expapi/internal/updatebot (apiKey + internal-key, encrypted) ────
describe('POST /expapi/internal/updatebot', () => {
    const URL = '/expapi/internal/updatebot';

    // Helper para criptografar dados como a rota espera
    function encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    it('200 atualiza config do bot com dados criptografados', async () => {
        BotService.updateBot.mockResolvedValueOnce({});

        const encrypted = encrypt({ '0': { prefix: '!' } });

        const res = await request(app).post(URL)
            .set(internalKey())
            .set(apiKeyHeader())
            .send({ data: encrypted });

        expect(res.status).toBe(200);
        expect(BotService.updateBot).toHaveBeenCalledWith({ prefix: '!' });
    });

    it('400 MISSING_DATA sem data', async () => {
        const res = await request(app).post(URL)
            .set(internalKey())
            .set(apiKeyHeader())
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_DATA');
    });

    it('500 quando dados não são um JSON criptografado válido', async () => {
        const res = await request(app).post(URL)
            .set(internalKey())
            .set(apiKeyHeader())
            .send({ data: 'not-valid-encrypted-data' });

        expect(res.status).toBe(500);
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).set(apiKeyHeader()).send({ data: 'x' });
        expect(res.status).toBe(401);
    });

    it('401 sem apiKey', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ data: 'x' });
        expect(res.status).toBe(401);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
