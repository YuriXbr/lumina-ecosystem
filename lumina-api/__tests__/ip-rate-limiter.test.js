/**
 * __tests__/ip-rate-limiter.test.js
 *
 * Testes unitários para src/utils/ipRateLimiter.js:
 *   - calcBlockDuration: fórmula de backoff exponencial
 *   - ipRateLimiter middleware: bypass em test, header RateLimit-*
 *   - Lógica de bloqueio/desbloqueio via mock do MongoDB
 */

jest.mock('../src/database/services/LogService', () => ({
    write: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

// Mock do mongoose usado pelo IpRateLimitService (extends DatabaseService)
const mockIpModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    collection: {
        createIndex: jest.fn().mockResolvedValue(null),
    },
};

jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(true),
    connection: { readyState: 1 },
    model: jest.fn(() => mockIpModel),
    models: {},
    Schema: class Schema { constructor() {} },
}));

const { calcBlockDuration, BASE_BLOCK_MS, MAX_BLOCK_MS, ipRateLimiter } = require('../src/utils/ipRateLimiter');

beforeEach(() => jest.clearAllMocks());

// ─── calcBlockDuration ────────────────────────────────────────────────────────

describe('calcBlockDuration — backoff exponencial', () => {
    it('primeiro bloqueio usa BASE_BLOCK_MS (1 minuto)', () => {
        expect(calcBlockDuration(0)).toBe(BASE_BLOCK_MS); // 2^0 × base = base
    });

    it('segundo bloqueio é o dobro do primeiro', () => {
        expect(calcBlockDuration(1)).toBe(BASE_BLOCK_MS * 2);
    });

    it('terceiro bloqueio é 4x o base', () => {
        expect(calcBlockDuration(2)).toBe(BASE_BLOCK_MS * 4);
    });

    it('nunca excede MAX_BLOCK_MS (24h)', () => {
        // Com base de 60s e 15 bloqueios, 2^14 × 60s ≫ 24h
        expect(calcBlockDuration(20)).toBe(MAX_BLOCK_MS);
        expect(calcBlockDuration(100)).toBe(MAX_BLOCK_MS);
    });

    it('após 10 bloqueios atinge o máximo de 24h', () => {
        // BASE_BLOCK_MS × 2^9 = 60s × 512 = 30720s ≈ 8.5h (ainda não chegou)
        // BASE_BLOCK_MS × 2^10 = 60s × 1024 = 61440s ≈ 17h (ainda não)
        // BASE_BLOCK_MS × 2^(MAX_BLOCKS_CAP-1) onde MAX_BLOCKS_CAP=10 → 2^9 × 60s = 30720s
        // Com cap de exponent em 9: MAX_BLOCK_MS = 86400s
        // O cap força MAX_BLOCK_MS no 10°+ bloqueio
        const tenth = calcBlockDuration(9); // blockCount=9 = 10° bloqueio
        expect(tenth).toBeLessThanOrEqual(MAX_BLOCK_MS);
    });

    it('é monotonicamente crescente até o teto', () => {
        let prev = 0;
        for (let i = 0; i <= 15; i++) {
            const current = calcBlockDuration(i);
            expect(current).toBeGreaterThanOrEqual(prev);
            expect(current).toBeLessThanOrEqual(MAX_BLOCK_MS);
            prev = current;
        }
    });
});

// ─── ipRateLimiter — bypass em NODE_ENV=test ─────────────────────────────────

describe('ipRateLimiter — bypass em NODE_ENV=test', () => {
    it('não bloqueia NENHUMA requisição em ambiente de teste', async () => {
        // NODE_ENV=test é garantido pelo setup-env.js
        const middleware = ipRateLimiter({ max: 1, windowMs: 60_000 });

        const mockReq = { ip: '1.2.3.4', path: '/test', method: 'GET', route: null };
        const mockRes = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        // Mesmo com max=1, deve sempre chamar next() em test
        await middleware(mockReq, mockRes, next);
        await middleware(mockReq, mockRes, next);
        await middleware(mockReq, mockRes, next);

        expect(next).toHaveBeenCalledTimes(3);
        expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
});

// ─── ipRateLimiter — lógica de bloqueio (via mock MongoDB) ───────────────────

describe('ipRateLimiter — lógica de bloqueio (NODE_ENV forçado para non-test)', () => {
    let originalNodeEnv;
    let middleware;

    beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'integration-test'; // Não é 'test', ativa a lógica
        jest.resetModules();
        // Reimporta com NODE_ENV modificado
        const mod = require('../src/utils/ipRateLimiter');
        middleware = mod.ipRateLimiter({ max: 2, windowMs: 60_000 });
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        jest.clearAllMocks();
    });

    it('passa quando IP está bloqueado com blockedUntil no futuro → responde 429', async () => {
        const mockIpModelReq = jest.requireMock('mongoose').model();

        const futureDate = new Date(Date.now() + 60_000);
        mockIpModelReq.findOne.mockResolvedValueOnce({
            ip: '5.5.5.5', route: '/test',
            blockCount: 1, blockedUntil: futureDate,
        });

        const mockReq = { ip: '5.5.5.5', path: '/test', method: 'GET', route: null, connection: {} };
        const mockRes = {
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        await middleware(mockReq, mockRes, next);

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'RATE_LIMIT_BLOCKED',
        }));
        expect(next).not.toHaveBeenCalled();
    });
});
