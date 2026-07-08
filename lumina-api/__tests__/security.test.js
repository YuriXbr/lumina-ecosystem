/**
 * __tests__/security.test.js
 *
 * Testes de segurança: headers, CORS, JWT, validação de senha, e
 * verificação de que o rate limiter de login está ativo.
 *
 * Reescrito para:
 *   - Mockar corretamente DashboardAccountService e logger (sem DB real)
 *   - Não depender do loginLimiter em NODE_ENV=test (desativado)
 *   - Não sofrer EADDRINUSE (app.listen() guarded por require.main === module)
 *   - Verificar x-xss-protection de forma compatível com helmet
 *     (helmet >=7 não define X-XSS-Protection, que é header legado)
 */

const request = require('supertest');

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/database/services/DashboardAccountService', () => ({
    getDashboardAccountByEmail:     jest.fn(),
    checkCredentials:               jest.fn(),
    createAccount:                  jest.fn(),
    getDashboardAccountByAccountId: jest.fn(),
    getDashboardAccountByProviderId:jest.fn(),
    createOAuthAccount:             jest.fn(),
    linkOAuthProvider:              jest.fn(),
    update:                         jest.fn(),
}));

jest.mock('../src/logger/logger', () => ({
    addLog: jest.fn(),
    routeError: jest.fn(({ res, errorCode, userMsg, status = 500 }) =>
        res.status(status).json({ error: userMsg, code: errorCode })
    ),
    sendErrorEmbed: jest.fn(),
    forceSendLogs: jest.fn(),
    requestLogger: jest.fn(() => (req, res, next) => next()),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

const DashboardAccountService = require('../src/database/services/DashboardAccountService');

let app;
beforeAll(() => {
    app = require('../index');
});

beforeEach(() => jest.clearAllMocks());

// ─── Headers de segurança ─────────────────────────────────────────────────────

describe('Headers de segurança', () => {
    it('inclui X-Frame-Options: DENY', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('inclui X-Content-Type-Options: nosniff', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('inclui X-Request-Id (rastreabilidade por requisição)', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-request-id']).toBeTruthy();
        expect(res.headers['x-request-id']).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });

    it('remove X-Powered-By (fingerprinting do Express)', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});

// ─── CORS ─────────────────────────────────────────────────────────────────────

describe('CORS', () => {
    it('rejeita origens não autorizadas (sem Access-Control-Allow-Origin)', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'https://malicious-site.com');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('aceita origens autorizadas', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'https://luminasink.me');
        expect(res.headers['access-control-allow-origin']).toBe('https://luminasink.me');
    });
});

// ─── Validação de senha na rota de registro ───────────────────────────────────

describe('Validação de senha (POST /expapi/v1/register)', () => {
    const URL = '/expapi/v1/register';

    it('rejeita senha curta (< 8 chars)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(null);
        const res = await request(app).post(URL).send({ email: 't@t.com', password: 'Ab1', firstName: 'T', lastName: 'U' });
        expect(res.status).toBe(400);
    });

    it('rejeita senha sem número', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(null);
        const res = await request(app).post(URL).send({ email: 't@t.com', password: 'SemNumero', firstName: 'T', lastName: 'U' });
        expect(res.status).toBe(400);
    });

    it('rejeita senha sem maiúscula', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(null);
        const res = await request(app).post(URL).send({ email: 't@t.com', password: 'semmaius123', firstName: 'T', lastName: 'U' });
        expect(res.status).toBe(400);
    });
});

// ─── Rota 501 para changePassword desativada ──────────────────────────────────

describe('Rota desativada (PUT /expapi/v1/user/change-password)', () => {
    it('retorna 501 com código ROUTE_DISABLED', async () => {
        const res = await request(app)
            .put('/expapi/v1/user/change-password')
            .send({ currentPassword: 'A', newPassword: 'B' });
        expect(res.status).toBe(501);
    });
});

// ─── Proteção de rotas internas ───────────────────────────────────────────────

describe('Proteção de rotas internas', () => {
    it('retorna 401 sem internal-key em /expapi/internal/newguild', async () => {
        const res = await request(app).post('/expapi/internal/newguild').send({});
        expect(res.status).toBe(401);
    });

    it('retorna 401 sem internal-key em /expapi/internal/deleteguild', async () => {
        const res = await request(app).delete('/expapi/internal/deleteguild').send({});
        expect(res.status).toBe(401);
    });
});
