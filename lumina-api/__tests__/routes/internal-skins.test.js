/**
 * __tests__/routes/internal-skins.test.js
 *
 * Suite para rotas internas de skins:
 *   POST /expapi/internal/addskin (internal-key)
 *   POST /expapi/internal/rollskin (internal-key)
 *   GET|POST /expapi/internal/fetchuserskins (PÚBLICA com rate limit)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, INTERNAL_KEY, internalKey,
    mockLogger, mockSkinService, mockInventoryService,
} = require('../helpers/testUtils');

mockLogger();
mockSkinService();
mockInventoryService();

// Mock do gachaService usado pelo rollskin
jest.mock('../../src/utils/gachaService', () => ({
    rollSkin: jest.fn(),
    computeProbabilities: jest.fn(),
    pickRarity: jest.fn(),
    RARITY_ORDER: ['legacy', 'epic', 'legendary', 'ultimate', 'transcendent', 'mythic'],
}));

const SkinService = require('../../src/database/services/SkinService');
const InventoryService = require('../../src/database/services/UserInventoryService');
const { rollSkin } = require('../../src/utils/gachaService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── POST /expapi/internal/addskin ─────────────────────────────────────────
describe('POST /expapi/internal/addskin', () => {
    const URL = '/expapi/internal/addskin';

    it('200 adiciona skin ao inventário', async () => {
        SkinService.addSkinToInventory.mockResolvedValueOnce({ skins: [1001] });

        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', skinId: 1001 });

        expect(res.status).toBe(200);
        expect(SkinService.addSkinToInventory).toHaveBeenCalledWith('u1', 1001);
    });

    it('400 MISSING_PARAMS sem userId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ skinId: 1001 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem skinId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ userId: 'u1', skinId: 1 });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        SkinService.addSkinToInventory.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1', skinId: 1 });
        expect(res.status).toBe(500);
    });
});

// ─── POST /expapi/internal/rollskin ────────────────────────────────────────
describe('POST /expapi/internal/rollskin', () => {
    const URL = '/expapi/internal/rollskin';

    it('200 sorteia skin hextechChests', async () => {
        rollSkin.mockResolvedValueOnce({ skinId: 1001, rarity: 'epic' });

        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', chestType: 'hextechChests' });

        expect(res.status).toBe(200);
        expect(rollSkin).toHaveBeenCalledWith('u1', 'hextechChests');
    });

    it('200 sorteia skin masterWorkChests', async () => {
        rollSkin.mockResolvedValueOnce({ skinId: 2002, rarity: 'legendary' });

        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', chestType: 'masterWorkChests' });

        expect(res.status).toBe(200);
    });

    it('400 MISSING_PARAMS sem userId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ chestType: 'hextechChests' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem chestType', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_CHEST_TYPE para tipo inválido', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', chestType: 'invalidChest' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_CHEST_TYPE');
    });

    it('400 INSUFFICIENT_RESOURCES quando rollSkin retorna null', async () => {
        rollSkin.mockResolvedValueOnce(null);

        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', chestType: 'hextechChests' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INSUFFICIENT_RESOURCES');
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ userId: 'u1', chestType: 'hextechChests' });
        expect(res.status).toBe(401);
    });

    it('500 erro do rollSkin', async () => {
        rollSkin.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', chestType: 'hextechChests' });
        expect(res.status).toBe(500);
    });
});

// ─── GET|POST /expapi/internal/fetchuserskins ──────────────────────────────
describe('GET|POST /expapi/internal/fetchuserskins (PÚBLICA)', () => {
    const URL = '/expapi/internal/fetchuserskins';

    it('200 GET retorna skins do usuário', async () => {
        SkinService.fetchUserSkins.mockResolvedValueOnce([{ id: 1001, name: 'Skin 1' }]);

        const res = await request(app).get(`${URL}?userId=123456789012345678`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('200 POST retorna skins do usuário', async () => {
        SkinService.fetchUserSkins.mockResolvedValueOnce([]);

        const res = await request(app).post(URL).send({ userId: '123456789012345678' });

        expect(res.status).toBe(200);
    });

    it('400 MISSING_USER_ID sem userId', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USER_ID');
    });

    it('400 INVALID_USER_ID quando userId tem letras (após filtro de não-dígitos)', async () => {
        const res = await request(app).get(`${URL}?userId=abc`);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_USER_ID');
    });

    it('200 sanitiza userId removendo não-dígitos', async () => {
        SkinService.fetchUserSkins.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?userId=abc123def456`);

        // O route substitui tudo que não é dígito por ''
        expect(SkinService.fetchUserSkins).toHaveBeenCalledWith('123456');
    });

    it('200 retorna array vazio quando service retorna null', async () => {
        SkinService.fetchUserSkins.mockResolvedValueOnce(null);

        const res = await request(app).get(`${URL}?userId=123456789012345678`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('500 erro do service', async () => {
        SkinService.fetchUserSkins.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).get(`${URL}?userId=123456789012345678`);
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
