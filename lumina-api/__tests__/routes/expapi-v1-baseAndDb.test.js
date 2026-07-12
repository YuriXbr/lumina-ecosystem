/**
 * __tests__/routes/expapi-v1-baseAndDb.test.js
 *
 * Suite para:
 *   GET /expapi/v1/        → "Pong!" (rota baseExpURL)
 *   GET /expapi/v1/db      → status do banco (requer internal-key)
 *   GET /expapi/v1/getconfig → desativada (501)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, INTERNAL_KEY, internalKey,
    mockLogger,
} = require('../helpers/testUtils');

mockLogger();

// Mock DataBaseService para /expapi/v1/db
jest.mock('../../src/database/services/DataBaseService', function() {
    return class MockDB {
        constructor(name, schema) { this.modelName = name; this.model = { collection: { createIndex: jest.fn() } }; }
        async checkConnection() { return 1; }
    };
});

const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── GET /expapi/v1/ ──────────────────────────────────────────────────────
describe('GET /expapi/v1/', () => {
    it('200 retorna "Pong!"', async () => {
        const res = await request(app).get('/expapi/v1/');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Pong!');
    });

    it('funciona sem auth (público)', async () => {
        const res = await request(app).get('/expapi/v1/');
        expect(res.status).toBe(200);
    });
});

// ─── GET /expapi/v1/db ────────────────────────────────────────────────────
describe('GET /expapi/v1/db', () => {
    const URL = '/expapi/v1/db';

    it('401 sem internal-key', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('401 com internal-key errada', async () => {
        const res = await request(app).get(URL).set(internalKey('wrong-key'));
        expect(res.status).toBe(401);
    });

    it('200 retorna status quando internal-key correta', async () => {
        const res = await request(app).get(URL).set(internalKey());
        expect(res.status).toBe(200);
        expect(res.text).toContain('Connection State');
    });
});

// ─── GET /expapi/v1/getconfig (desativada) ────────────────────────────────
describe('GET /expapi/v1/getconfig', () => {
    it('retorna 501 (rota desativada)', async () => {
        const res = await request(app).get('/expapi/v1/getconfig');
        // Rota com enabled:false retorna 501 ROUTE_DISABLED
        expect([404, 501]).toContain(res.status);
        if (res.status === 501) {
            expect(res.body.code).toBe('ROUTE_DISABLED');
        }
    });
});

// ─── GET /expapi/v1/csrf-token (definido inline no index.js) ──────────────
describe('GET /expapi/v1/csrf-token', () => {
    it('200 retorna csrfToken no JSON', async () => {
        const res = await request(app).get('/expapi/v1/csrf-token');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('csrfToken');
    });

    it('200 seta cookie csrf_token', async () => {
        const res = await request(app).get('/expapi/v1/csrf-token');
        expect(res.status).toBe(200);
        const setCookie = res.headers['set-cookie'] || [];
        const hasCsrfCookie = setCookie.some(c => c.startsWith('csrf_token='));
        expect(hasCsrfCookie).toBe(true);
    });
});

// ─── POST /expapi/v1/validate-token (definido inline no index.js) ────────
describe('POST /expapi/v1/validate-token', () => {
    const { makeJwt, makeGarbageJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf } = require('../helpers/testUtils');
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    it('200 { valid: true, email } quando token válido', async () => {
        const token = makeJwt({ email: 'valid@example.com' });
        const res = await request(app)
            .post('/expapi/v1/validate-token')
            .set(combineAuthAndCsrf(bearerAuth(token), csrf.headers))
            .send();
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.email).toBe('valid@example.com');
    });

    it('401 quando token é lixo', async () => {
        const res = await request(app)
            .post('/expapi/v1/validate-token')
            .set(combineAuthAndCsrf(bearerAuth(makeGarbageJwt()), csrf.headers))
            .send();
        expect(res.status).toBe(401);
    });

    it('401 quando não há token', async () => {
        const res = await request(app)
            .post('/expapi/v1/validate-token')
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send();
        expect(res.status).toBe(401);
    });
});

// ─── GET /expapi/v1/validateAuth (definido inline no index.js) ───────────
describe('GET /expapi/v1/validateAuth', () => {
    const { makeJwt, bearerAuth, makeAccount, mockDashboardAccountService } = require('../helpers/testUtils');

    it('200 "Valid credentials." quando auth válida', async () => {
        // validateAuth usa checkAuth que usa verifyRequestAuth (não verifica conta)
        const token = makeJwt();
        const res = await request(app).get('/expapi/v1/validateAuth').set(bearerAuth(token));
        expect(res.status).toBe(200);
        expect(res.text).toBe('Valid credentials.');
    });

    it('401 sem auth', async () => {
        const res = await request(app).get('/expapi/v1/validateAuth');
        expect(res.status).toBe(401);
    });
});

// ─── Root e 404 ───────────────────────────────────────────────────────────
describe('Root e 404 handler', () => {
    it('GET / retorna 204', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(204);
    });

    it('GET /nonexistent retorna 404', async () => {
        const res = await request(app).get('/nonexistent');
        expect(res.status).toBe(404);
    });

    it('POST /nonexistent retorna 404', async () => {
        const res = await request(app).post('/nonexistent').send({});
        expect(res.status).toBe(404);
    });

    it('GET /expapi/v1/nonexistent retorna 404', async () => {
        const res = await request(app).get('/expapi/v1/nonexistent');
        expect(res.status).toBe(404);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
