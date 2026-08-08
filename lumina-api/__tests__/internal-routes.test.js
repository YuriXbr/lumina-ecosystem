/**
 * __tests__/internal-routes.test.js
 *
 * Testes para as rotas internas (expapi/internal/*).
 * Essas rotas requerem o header `internal-key`.
 *
 * Cobertura:
 *   POST /expapi/internal/claimdaily
 *   POST /expapi/internal/addinventory
 *   POST /expapi/internal/addskin
 *   POST /expapi/internal/fetchinventory
 *   POST /expapi/internal/fetchbot
 *   POST /expapi/internal/newguild
 *   DELETE /expapi/internal/deleteguild
 */

const request = require('supertest');

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../src/database/services/UserInventoryService', () => ({
    claimDaily: jest.fn(),
    addInventory: jest.fn(),
    getInventory: jest.fn(),
    getDailyStatus: jest.fn(),
}));

jest.mock('../src/database/services/SkinService', () => ({
    addSkinToInventory: jest.fn(),
    getSkinInfo: jest.fn(),
    getSkinsId: jest.fn(),
    getAllSkins: jest.fn(),
}));

jest.mock('../src/database/services/BotService', () => ({
    getBot: jest.fn(),
    updateBot: jest.fn(),
}));

jest.mock('../src/database/services/GuildService', () => ({
    getGuildData: jest.fn(),
    createGuildData: jest.fn(),
    updateGuildData: jest.fn(),
    delete: jest.fn(),
}));

jest.mock('../src/database/services/DashboardAccountService', () => ({
    getDashboardAccountByEmail: jest.fn(),
    getDashboardAccountByAccountId: jest.fn(),
    checkCredentials: jest.fn(),
    getAllAccounts: jest.fn(),
}));

jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(({ res, errorCode, userMsg, status = 500 }) =>
        res.status(status).json({ error: userMsg, code: errorCode })
    ),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    // requestLogger deve retornar um middleware Express válido para não
    // quebrar o app.use(requestLogger()) no index.js quando o logger é mocked
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

jest.useFakeTimers();

const InventoryService = require('../src/database/services/UserInventoryService');
const SkinService = require('../src/database/services/SkinService');
const BotService = require('../src/database/services/BotService');
const GuildService = require('../src/database/services/GuildService');

const app = require('../index');

const INTERNAL_KEY = 'test-internal-key-super-secret';

beforeAll(() => {
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    process.env.JWT_SECRET = 'test-secret';
});

afterEach(() => jest.clearAllMocks());

const withKey = (req) => req.set('internal-key', INTERNAL_KEY);

// ─── Autenticação da chave interna ────────────────────────────────────────────

describe('Proteção da chave interna', () => {
    it('401 sem internal-key', async () => {
        const res = await request(app).post('/expapi/internal/claimdaily').send({ userId: 'u1' });
        expect(res.status).toBe(401);
    });

    it('401 com internal-key errada', async () => {
        const res = await request(app)
            .post('/expapi/internal/claimdaily')
            .set('internal-key', 'chave-errada')
            .send({ userId: 'u1' });
        expect(res.status).toBe(401);
    });
});

// ─── POST /expapi/internal/claimdaily ────────────────────────────────────────

describe('POST /expapi/internal/claimdaily', () => {
    const URL = '/expapi/internal/claimdaily';

    it('400 se userId estiver ausente', async () => {
        const res = await withKey(request(app).post(URL)).send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_USER_ID');
    });

    it('429 quando diária já foi resgatada hoje', async () => {
        const next = new Date(Date.now() + 23 * 60 * 60 * 1000);
        InventoryService.claimDaily.mockResolvedValueOnce({ claimed: false, nextDailyReward: next, streak: 5 });

        const res = await withKey(request(app).post(URL)).send({ userId: 'user-01' });
        expect(res.status).toBe(429);
        expect(res.body.code).toBe('DAILY_ALREADY_CLAIMED');
    });

    it('200 em resgate bem-sucedido', async () => {
        InventoryService.claimDaily.mockResolvedValueOnce({
            claimed: true,
            reward: { hextechChests: 3, keys: 1 },
            streak: 3,
            nextDailyReward: new Date(),
            inventory: {},
        });

        const res = await withKey(request(app).post(URL)).send({ userId: 'user-02' });
        expect(res.status).toBe(200);
        expect(res.body.claimed).toBe(true);
    });
});

// ─── POST /expapi/internal/addinventory ──────────────────────────────────────

describe('POST /expapi/internal/addinventory', () => {
    const URL = '/expapi/internal/addinventory';

    it('400 se userId, item ou amount estiverem faltando', async () => {
        const res = await withKey(request(app).post(URL)).send({ userId: 'u1', item: 'keys' });
        expect(res.status).toBe(400);
    });

    it('200 em adição bem-sucedida', async () => {
        InventoryService.addInventory.mockResolvedValueOnce({ userId: 'u1', keys: 5 });

        const res = await withKey(request(app).post(URL)).send({ userId: 'u1', item: 'keys', amount: 2 });
        expect(res.status).toBe(200);
    });
});

// ─── POST /expapi/internal/addskin ───────────────────────────────────────────

describe('POST /expapi/internal/addskin', () => {
    const URL = '/expapi/internal/addskin';

    it('400 se userId ou skinId estiverem faltando', async () => {
        const res = await withKey(request(app).post(URL)).send({ userId: 'u1' });
        expect(res.status).toBe(400);
    });

    it('200 ao adicionar skin com sucesso', async () => {
        SkinService.addSkinToInventory.mockResolvedValueOnce({ userId: 'u1', skins: [1001] });

        const res = await withKey(request(app).post(URL)).send({ userId: 'u1', skinId: 1001 });
        expect(res.status).toBe(200);
    });
});

// ─── POST /expapi/internal/fetchinventory ────────────────────────────────────

describe('POST /expapi/internal/fetchinventory', () => {
    const URL = '/expapi/internal/fetchinventory';

    it('400 se userId estiver ausente', async () => {
        const res = await withKey(request(app).post(URL)).send({});
        expect(res.status).toBe(400);
    });

    it('404 se inventário não existir', async () => {
        InventoryService.getInventory.mockResolvedValueOnce(null);

        const res = await withKey(request(app).post(URL)).send({ userId: 'ghost-user' });
        expect(res.status).toBe(404);
    });

    it('200 retorna inventário existente', async () => {
        InventoryService.getInventory.mockResolvedValueOnce({ userId: 'u1', hextechChests: 5 });

        const res = await withKey(request(app).post(URL)).send({ userId: 'u1' });
        expect(res.status).toBe(200);
    });
});

// ─── POST /expapi/internal/fetchbot ──────────────────────────────────────────

describe('POST /expapi/internal/fetchbot', () => {
    const URL = '/expapi/internal/fetchbot';

    it('200 retorna dados do bot', async () => {
        BotService.getBot.mockResolvedValueOnce({ prefix: 'l!', devMode: false });

        const res = await withKey(request(app).post(URL)).send({});
        expect(res.status).toBe(200);
    });

    it('404 quando bot não está configurado', async () => {
        BotService.getBot.mockResolvedValueOnce(null);

        const res = await withKey(request(app).post(URL)).send({});
        expect(res.status).toBe(404);
    });
});

// ─── POST /expapi/internal/newguild ──────────────────────────────────────────

describe('POST /expapi/internal/newguild', () => {
    const URL = '/expapi/internal/newguild';

    it('400 se campos obrigatórios estiverem faltando', async () => {
        const res = await withKey(request(app).post(URL)).send({ guildId: '123' });
        expect(res.status).toBe(400);
    });

    it('409 se guild já existe', async () => {
        GuildService.getGuildData.mockResolvedValueOnce({ guildId: 'g1' });

        const res = await withKey(request(app).post(URL)).send({
            guildId: 'g1',
            guildReferenceName: 'Test Server',
            guildOwnerId: 'owner-1',
        });
        expect(res.status).toBe(409);
    });

    it('200 ao criar guild com sucesso', async () => {
        GuildService.getGuildData.mockResolvedValueOnce(null);
        GuildService.createGuildData.mockResolvedValueOnce({ guildId: 'g2' });

        const res = await withKey(request(app).post(URL)).send({
            guildId: 'g2',
            guildReferenceName: 'New Server',
            guildOwnerId: 'owner-2',
        });
        expect(res.status).toBe(200);
    });
});

// ─── DELETE /expapi/internal/deleteguild ─────────────────────────────────────

describe('DELETE /expapi/internal/deleteguild', () => {
    const URL = '/expapi/internal/deleteguild';

    it('400 se guildId estiver ausente', async () => {
        const res = await withKey(request(app).delete(URL)).send({});
        expect(res.status).toBe(400);
    });

    it('200 ao deletar guild existente', async () => {
        GuildService.delete.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await withKey(request(app).delete(URL)).send({ guildId: 'g1' });
        expect(res.status).toBe(200);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 200));
});
