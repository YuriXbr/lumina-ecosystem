/**
 * __tests__/routes/internal-inventory.test.js
 *
 * Suite para rotas internas de inventário:
 *   GET|POST /expapi/internal/fetchinventory (PÚBLICA com rate limit)
 *   POST /expapi/internal/addinventory (internal-key)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, INTERNAL_KEY, internalKey, makeInventory,
    mockLogger, mockInventoryService,
} = require('../helpers/testUtils');

mockLogger();
mockInventoryService();

const InventoryService = require('../../src/database/services/UserInventoryService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── GET|POST /expapi/internal/fetchinventory ──────────────────────────────
describe('GET|POST /expapi/internal/fetchinventory (PÚBLICA)', () => {
    const URL = '/expapi/internal/fetchinventory';

    it('200 GET retorna inventário sem internal-key (rota pública)', async () => {
        InventoryService.getInventory.mockResolvedValueOnce(makeInventory());

        const res = await request(app).get(`${URL}?userId=123`);

        expect(res.status).toBe(200);
        expect(res.body.userId).toBe('123456789012345678');
    });

    it('200 POST retorna inventário sem internal-key', async () => {
        InventoryService.getInventory.mockResolvedValueOnce(makeInventory());

        const res = await request(app).post(URL).send({ userId: '123' });

        expect(res.status).toBe(200);
    });

    it('400 MISSING_USER_ID sem userId (GET)', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USER_ID');
    });

    it('400 MISSING_USER_ID sem userId (POST)', async () => {
        const res = await request(app).post(URL).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USER_ID');
    });

    it('404 INVENTORY_NOT_FOUND quando não existe', async () => {
        InventoryService.getInventory.mockResolvedValueOnce(null);

        const res = await request(app).get(`${URL}?userId=ghost`);

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('INVENTORY_NOT_FOUND');
    });

    it('500 erro do service', async () => {
        InventoryService.getInventory.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).get(`${URL}?userId=123`);
        expect(res.status).toBe(500);
    });
});

// ─── POST /expapi/internal/addinventory ────────────────────────────────────
describe('POST /expapi/internal/addinventory', () => {
    const URL = '/expapi/internal/addinventory';

    it('200 adiciona item ao inventário', async () => {
        InventoryService.addInventory.mockResolvedValueOnce({ keys: 5 });

        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'keys', amount: 2 });

        expect(res.status).toBe(200);
        expect(InventoryService.addInventory).toHaveBeenCalledWith('u1', 'keys', 2);
    });

    it('400 MISSING_PARAMS sem userId', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ item: 'keys', amount: 1 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem item', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1', amount: 1 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 MISSING_PARAMS sem amount', async () => {
        const res = await request(app).post(URL).set(internalKey()).send({ userId: 'u1', item: 'keys' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_ITEM para item não whitelistado', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'dailyRewardStreak', amount: 1 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ITEM');
    });

    it('400 MISSING_PARAMS para amount=0 (falsy)', async () => {
        // 0 é falsy, então !amount é true → cai em MISSING_PARAMS primeiro
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'keys', amount: 0 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_PARAMS');
    });

    it('400 INVALID_AMOUNT para amount > 10000', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'keys', amount: 10001 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_AMOUNT');
    });

    it('400 INVALID_AMOUNT para amount negativo', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'keys', amount: -5 });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_AMOUNT');
    });

    it('400 INVALID_AMOUNT para amount não-numérico', async () => {
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'keys', amount: 'many' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_AMOUNT');
    });

    it('200 aceita hextechChests como item', async () => {
        InventoryService.addInventory.mockResolvedValueOnce({});
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'hextechChests', amount: 1 });
        expect(res.status).toBe(200);
    });

    it('200 aceita masterWorkChests como item', async () => {
        InventoryService.addInventory.mockResolvedValueOnce({});
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'masterWorkChests', amount: 1 });
        expect(res.status).toBe(200);
    });

    it('401 sem internal-key', async () => {
        const res = await request(app).post(URL).send({ userId: 'u1', item: 'keys', amount: 1 });
        expect(res.status).toBe(401);
    });

    it('500 erro do service', async () => {
        InventoryService.addInventory.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).post(URL).set(internalKey())
            .send({ userId: 'u1', item: 'keys', amount: 1 });
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
