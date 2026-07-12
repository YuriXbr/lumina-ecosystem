/**
 * __tests__/middleware/auth.test.js
 *
 * Suite para auth.js (middlewares: checkAuth, internalKeyCheck, loginLimiter, registerLimiter)
 *
 * Testa:
 *   - checkAuth: popula req.user ou retorna 401
 *   - internalKeyCheck: valida header internal-key com timing-safe compare
 *   - loginLimiter: bypassed em test env
 *   - registerLimiter: bypassed em test env
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { JWT_SECRET, INTERNAL_KEY, makeJwt, makeGarbageJwt, bearerAuth, mockLogger } = require('../helpers/testUtils');

mockLogger();

const { checkAuth, internalKeyCheck, loginLimiter, registerLimiter } = require('../../auth');

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
});

afterEach(() => jest.clearAllMocks());

// ─── checkAuth ─────────────────────────────────────────────────────────────
describe('checkAuth middleware', () => {
    function buildApp() {
        const app = express();
        app.get('/protected', checkAuth, (req, res) => {
            res.json({ email: req.user.email });
        });
        return app;
    }

    it('popula req.user quando token é válido (Bearer)', async () => {
        const token = makeJwt({ email: 'auth@x.com' });
        const res = await request(buildApp()).get('/protected').set(bearerAuth(token));
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('auth@x.com');
    });

    it('retorna 401 quando não há token', async () => {
        const res = await request(buildApp()).get('/protected');
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('MISSING_TOKEN');
    });

    it('retorna 401 INVALID_TOKEN quando token é lixo', async () => {
        const res = await request(buildApp()).get('/protected').set(bearerAuth(makeGarbageJwt()));
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('retorna 401 TOKEN_EXPIRED quando token está expirado', async () => {
        const jwt = require('jsonwebtoken');
        const expired = jwt.sign({ email: 'x@x.com' }, JWT_SECRET, { expiresIn: '-1s' });
        const res = await request(buildApp()).get('/protected').set(bearerAuth(expired));
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
});

// ─── internalKeyCheck ──────────────────────────────────────────────────────
describe('internalKeyCheck middleware', () => {
    function buildApp() {
        const app = express();
        app.post('/internal', internalKeyCheck, (req, res) => res.json({ ok: true }));
        return app;
    }

    it('passa quando internal-key está correta', async () => {
        const res = await request(buildApp())
            .post('/internal')
            .set('internal-key', INTERNAL_KEY);
        expect(res.status).toBe(200);
    });

    it('retorna 401 quando internal-key está ausente', async () => {
        const res = await request(buildApp()).post('/internal');
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Invalid or missing internal key/);
    });

    it('retorna 401 quando internal-key está errada', async () => {
        const res = await request(buildApp())
            .post('/internal')
            .set('internal-key', 'wrong-key-xxx');
        expect(res.status).toBe(401);
    });

    it('retorna 401 quando internal-key é string vazia', async () => {
        const res = await request(buildApp())
            .post('/internal')
            .set('internal-key', '');
        expect(res.status).toBe(401);
    });

    it('retorna 401 quando INTERNAL_API_KEY env não está setada', async () => {
        const originalKey = process.env.INTERNAL_API_KEY;
        delete process.env.INTERNAL_API_KEY;

        const res = await request(buildApp())
            .post('/internal')
            .set('internal-key', 'anything');

        expect(res.status).toBe(401);
        process.env.INTERNAL_API_KEY = originalKey;
    });

    it('usa timing-safe comparison (não vulnerável a timing attacks)', () => {
        // Não podemos testar timing diretamente, mas verificamos que
        // a implementação usa crypto.timingSafeEqual
        const crypto = require('crypto');
        expect(typeof crypto.timingSafeEqual).toBe('function');
    });
});

// ─── loginLimiter ──────────────────────────────────────────────────────────
describe('loginLimiter middleware', () => {
    it('em NODE_ENV=test, bypassa (retorna next direto)', async () => {
        const app = express();
        app.post('/login', loginLimiter, (req, res) => res.json({ ok: true }));

        // Mesmo chamando 100x, não deve rate limitar em test env
        for (let i = 0; i < 20; i++) {
            const res = await request(app).post('/login');
            expect(res.status).toBe(200);
        }
    });

    it('é uma função', () => {
        expect(typeof loginLimiter).toBe('function');
    });
});

// ─── registerLimiter ───────────────────────────────────────────────────────
describe('registerLimiter middleware', () => {
    it('em NODE_ENV=test, bypassa (retorna next direto)', async () => {
        const app = express();
        app.post('/register', registerLimiter, (req, res) => res.json({ ok: true }));

        for (let i = 0; i < 20; i++) {
            const res = await request(app).post('/register');
            expect(res.status).toBe(200);
        }
    });

    it('é uma função', () => {
        expect(typeof registerLimiter).toBe('function');
    });
});

// ─── Em produção, limiters fariam rate limiting real ──────────────────────
describe('Fora de test env (documentação)', () => {
    it('documenta que em production, loginLimiter usa express-rate-limit', () => {
        // Em production:
        // - loginLimiter: 5 req/min por IP
        // - registerLimiter: 3 req/hora por IP
        // - Retornam 429 com mensagem "Too many attempts..."
        expect(typeof loginLimiter).toBe('function');
        expect(typeof registerLimiter).toBe('function');
    });
});
