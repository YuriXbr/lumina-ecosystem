/**
 * __tests__/utils/csrfMiddleware.test.js
 *
 * Suite para src/utils/csrfMiddleware.js
 *
 * Testa o padrão double-submit cookie:
 *   - GET gera/regenera token CSRF no cookie
 *   - POST/PUT/DELETE valida X-CSRF-Token header vs cookie
 *   - 403 EBADCSRFTOKEN quando token ausente ou diferente
 *   - Comparação timing-safe (não vulnerável a timing attacks)
 */

'use strict';

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

const { csrfProtection, generateCsrfToken, ensureCsrfToken, COOKIE_NAME, HEADER_NAME } = require('../../src/utils/csrfMiddleware');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

// ─── Constantes ────────────────────────────────────────────────────────────
describe('Constantes', () => {
    it('COOKIE_NAME é "csrf_token"', () => {
        expect(COOKIE_NAME).toBe('csrf_token');
    });

    it('HEADER_NAME é "x-csrf-token"', () => {
        expect(HEADER_NAME).toBe('x-csrf-token');
    });
});

// ─── generateCsrfToken ─────────────────────────────────────────────────────
describe('generateCsrfToken', () => {
    it('gera uma string base64url de 43 chars (32 bytes)', () => {
        const token = generateCsrfToken();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(43); // 32 bytes base64url = 43 chars
    });

    it('gera tokens únicos a cada chamada', () => {
        const t1 = generateCsrfToken();
        const t2 = generateCsrfToken();
        expect(t1).not.toBe(t2);
    });
});

// ─── csrfProtection middleware ─────────────────────────────────────────────
describe('csrfProtection middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(cookieParser());
        // GET não exige CSRF (apenas gera/regenera)
        app.get('/token', csrfProtection, (req, res) => {
            res.json({ csrfToken: req.csrfToken() });
        });
        // POST exige CSRF
        app.post('/action', csrfProtection, (req, res) => {
            res.json({ ok: true });
        });
        // PUT exige CSRF
        app.put('/update', csrfProtection, (req, res) => {
            res.json({ ok: true });
        });
        // DELETE exige CSRF
        app.delete('/remove', csrfProtection, (req, res) => {
            res.json({ ok: true });
        });
        // Error handler para CSRF
        app.use((err, req, res, next) => {
            if (err.code === 'EBADCSRFTOKEN') {
                return res.status(403).json({ error: 'CSRF inválido', code: 'CSRF_INVALID' });
            }
            next(err);
        });
    });

    // ─── GET (não exige CSRF, gera token) ─────────────────────────────────
    it('GET /token retorna 200 com csrfToken', async () => {
        const res = await request(app).get('/token');
        expect(res.status).toBe(200);
        expect(res.body.csrfToken).toBeDefined();
        expect(typeof res.body.csrfToken).toBe('string');
    });

    it('GET /token seta cookie csrf_token', async () => {
        const res = await request(app).get('/token');
        const setCookie = res.headers['set-cookie'] || [];
        const csrfCookie = setCookie.find(c => c.startsWith('csrf_token='));
        expect(csrfCookie).toBeDefined();
    });

    it('GET /token NÃO é httpOnly (JS precisa ler)', async () => {
        const res = await request(app).get('/token');
        const setCookie = res.headers['set-cookie'] || [];
        const csrfCookie = setCookie.find(c => c.startsWith('csrf_token='));
        // NÃO deve conter HttpOnly
        expect(csrfCookie).not.toMatch(/HttpOnly/i);
    });

    it('GET reutiliza cookie existente se já presente', async () => {
        const existingToken = 'preexisting-token-abc';
        const res = await request(app)
            .get('/token')
            .set('Cookie', `${COOKIE_NAME}=${existingToken}`);

        expect(res.status).toBe(200);
        expect(res.body.csrfToken).toBe(existingToken);
        // Não deve setar novo cookie
        const setCookie = res.headers['set-cookie'] || [];
        expect(setCookie.find(c => c.startsWith('csrf_token='))).toBeUndefined();
    });

    // ─── POST sem CSRF ────────────────────────────────────────────────────
    it('POST sem X-CSRF-Token retorna 403 CSRF_INVALID', async () => {
        const res = await request(app).post('/action').send({});
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('CSRF_INVALID');
    });

    it('POST sem cookie csrf_token retorna 403', async () => {
        const res = await request(app)
            .post('/action')
            .set('X-CSRF-Token', 'some-token')
            .send({});
        expect(res.status).toBe(403);
    });

    it('POST com X-CSRF-Token diferente do cookie retorna 403', async () => {
        const res = await request(app)
            .post('/action')
            .set('X-CSRF-Token', 'header-token')
            .set('Cookie', `${COOKIE_NAME}=cookie-token`)
            .send({});
        expect(res.status).toBe(403);
    });

    // ─── POST com CSRF válido ─────────────────────────────────────────────
    it('POST com X-CSRF-Token == cookie retorna 200', async () => {
        // Primeiro, obtém token válido
        const tokenRes = await request(app).get('/token');
        const token = tokenRes.body.csrfToken;
        const cookies = tokenRes.headers['set-cookie'] || [];
        const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
        const cookieValue = csrfCookie.split(';')[0];

        const res = await request(app)
            .post('/action')
            .set('X-CSRF-Token', token)
            .set('Cookie', cookieValue)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    it('PUT com CSRF válido retorna 200', async () => {
        const tokenRes = await request(app).get('/token');
        const token = tokenRes.body.csrfToken;
        const cookies = tokenRes.headers['set-cookie'] || [];
        const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
        const cookieValue = csrfCookie.split(';')[0];

        const res = await request(app)
            .put('/update')
            .set('X-CSRF-Token', token)
            .set('Cookie', cookieValue)
            .send({});

        expect(res.status).toBe(200);
    });

    it('DELETE com CSRF válido retorna 200', async () => {
        const tokenRes = await request(app).get('/token');
        const token = tokenRes.body.csrfToken;
        const cookies = tokenRes.headers['set-cookie'] || [];
        const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
        const cookieValue = csrfCookie.split(';')[0];

        const res = await request(app)
            .delete('/remove')
            .set('X-CSRF-Token', token)
            .set('Cookie', cookieValue);

        expect(res.status).toBe(200);
    });

    // ─── Timing-safe comparison ───────────────────────────────────────────
    it('tokens com tamanhos diferentes não causam crash', async () => {
        const res = await request(app)
            .post('/action')
            .set('X-CSRF-Token', 'short')
            .set('Cookie', `${COOKIE_NAME}=much-longer-token-value`)
            .send({});
        expect(res.status).toBe(403);
    });

    // ─── OPTIONS/HEAD não exigem CSRF ─────────────────────────────────────
    it('OPTIONS não exige CSRF (CORS preflight)', async () => {
        const res = await request(app).options('/action');
        // OPTIONS pode retornar 204 ou 200 dependendo do handler
        expect([200, 204, 404]).toContain(res.status);
    });
});

// ─── ensureCsrfToken ───────────────────────────────────────────────────────
describe('ensureCsrfToken', () => {
    it('cria novo token quando cookie não existe', () => {
        const req = { cookies: {} };
        const res = {
            cookie: jest.fn(),
        };

        ensureCsrfToken(req, res, () => {});

        expect(res.cookie).toHaveBeenCalled();
        expect(req.csrfToken).toBeDefined();
        const token = req.csrfToken();
        expect(typeof token).toBe('string');
    });

    it('reutiliza token existente quando cookie está presente', () => {
        const req = { cookies: { csrf_token: 'existing-token' } };
        const res = { cookie: jest.fn() };

        ensureCsrfToken(req, res, () => {});

        expect(res.cookie).not.toHaveBeenCalled();
        expect(req.csrfToken()).toBe('existing-token');
    });

    it('funciona sem next (modo standalone)', () => {
        const req = { cookies: {} };
        const res = { cookie: jest.fn() };

        // Não deve lançar mesmo sem next
        expect(() => ensureCsrfToken(req, res)).not.toThrow();
    });
});
