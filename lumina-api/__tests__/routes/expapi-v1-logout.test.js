/**
 * __tests__/routes/expapi-v1-logout.test.js
 *
 * Suite de testes para POST /expapi/v1/logout
 *
 * Comportamento esperado:
 *   - Limpa o cookie lumina_token (set-cookie com expired/maxAge=0)
 *   - Retorna 200 com { ok: true }
 *   - Não exige auth (qualquer um pode "deslogar")
 *   - Em NODE_ENV=test, CSRF é bypassed
 */

'use strict';

const request = require('supertest');
const { JWT_SECRET, getCsrfTokens, combineAuthAndCsrf, mockLogger } = require('../helpers/testUtils');

mockLogger();

const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('POST /expapi/v1/logout', () => {
    const URL = '/expapi/v1/logout';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    it('200 retorna { ok: true }', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    it('limpa o cookie lumina_token via Set-Cookie', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(200);
        const setCookie = res.headers['set-cookie'] || [];
        // O clearCookie envia um Set-Cookie comExpires ou maxAge=0
        const luminaCookie = setCookie.find(c => c.startsWith('lumina_token='));
        expect(luminaCookie).toBeDefined();
        // Deve conter indicador de expiração (Expires=past date OU Max-Age=0)
        expect(luminaCookie).toMatch(/Expires=|Max-Age=0/i);
    });

    it('funciona mesmo sem cookie de auth prévio (idempotente)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(200);
    });

    it('funciona com cookie de auth prévio (limpa mesmo assim)', async () => {
        const res = await request(app)
            .post(URL)
            .set('Cookie', 'lumina_token=some.jwt.token')
            .set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(200);
        const setCookie = res.headers['set-cookie'] || [];
        const luminaCookie = setCookie.find(c => c.startsWith('lumina_token='));
        expect(luminaCookie).toBeDefined();
    });

    it('não exige autenticação (anônimo pode chamar)', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(200);
    });

    it('ignora body da requisição', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ whatever: 'ignored' });
        expect(res.status).toBe(200);
    });

    // ─── Método não permitido ─────────────────────────────────────────────
    it('405/404 para GET /expapi/v1/logout (não é GET)', async () => {
        const res = await request(app).get(URL);
        // Rota é POST-only; GET cai no catch-all 404
        expect(res.status).toBe(404);
    });

    it('404 para PUT /expapi/v1/logout', async () => {
        const res = await request(app).put(URL).send({});
        expect(res.status).toBe(404);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
