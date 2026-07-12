/**
 * __tests__/utils/authHelpers.test.js
 *
 * Suite para src/utils/authHelpers.js
 *
 * Testa:
 *   - extractToken (cookie vs Authorization header)
 *   - verifyRequestAuth (válido, expirado, inválido, ausente)
 *   - verifyRequestAuthWithAccountCheck (banned/blocked/DB error)
 *   - requireAuth middleware (401 em falha, popula req.user em sucesso)
 *   - optionalAuth middleware (não bloqueia)
 *   - setAuthCookie / clearAuthCookie
 *   - COOKIE_NAME constante
 */

'use strict';

const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

const { JWT_SECRET, makeJwt, makeExpiredJwt, makeWrongSecretJwt, makeGarbageJwt, makeAccount } = require('../helpers/testUtils');

// Mock do DashboardAccountService para verifyRequestAuthWithAccountCheck
jest.mock('../../src/database/services/DashboardAccountService', () => ({
    getDashboardAccountByEmail: jest.fn(),
}));

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const authHelpers = require('../../src/utils/authHelpers');

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

// ─── COOKIE_NAME ───────────────────────────────────────────────────────────
describe('COOKIE_NAME', () => {
    it('é "lumina_token"', () => {
        expect(authHelpers.COOKIE_NAME).toBe('lumina_token');
    });
});

// ─── extractToken ──────────────────────────────────────────────────────────
describe('extractToken', () => {
    it('retorna token do cookie lumina_token', () => {
        const req = { cookies: { lumina_token: 'cookie-token' } };
        expect(authHelpers.extractToken(req)).toBe('cookie-token');
    });

    it('retorna token do header Authorization: Bearer', () => {
        const req = { cookies: {}, headers: { authorization: 'Bearer header-token' } };
        expect(authHelpers.extractToken(req)).toBe('header-token');
    });

    it('prefere cookie sobre header quando ambos existem', () => {
        const req = {
            cookies: { lumina_token: 'cookie-token' },
            headers: { authorization: 'Bearer header-token' },
        };
        expect(authHelpers.extractToken(req)).toBe('cookie-token');
    });

    it('retorna null quando nenhum token está presente', () => {
        const req = { cookies: {}, headers: {} };
        expect(authHelpers.extractToken(req)).toBeNull();
    });

    it('retorna null quando Authorization não é Bearer', () => {
        const req = { cookies: {}, headers: { authorization: 'Basic abc' } };
        expect(authHelpers.extractToken(req)).toBeNull();
    });

    it('lê token do header quando req.cookies é undefined', () => {
        // req.cookies é undefined, mas req.headers tem Authorization
        const req = { headers: { authorization: 'Bearer tok' } };
        expect(authHelpers.extractToken(req)).toBe('tok');
    });

    it('retorna null quando ambos cookies e headers são objetos vazios', () => {
        const req = { cookies: {}, headers: {} };
        expect(authHelpers.extractToken(req)).toBeNull();
    });
});

// ─── verifyRequestAuth ─────────────────────────────────────────────────────
describe('verifyRequestAuth', () => {
    it('retorna user decodificado quando token é válido', () => {
        const token = makeJwt({ email: 'x@x.com', accountId: 'acc-1' });
        const result = authHelpers.verifyRequestAuth({ cookies: { lumina_token: token } });

        expect(result.error).toBeNull();
        expect(result.user.email).toBe('x@x.com');
        expect(result.user.accountId).toBe('acc-1');
    });

    it('retorna MISSING_TOKEN quando não há token', () => {
        const result = authHelpers.verifyRequestAuth({ cookies: {}, headers: {} });

        expect(result.user).toBeNull();
        expect(result.error.status).toBe(401);
        expect(result.error.code).toBe('MISSING_TOKEN');
    });

    it('retorna TOKEN_EXPIRED quando token está expirado', () => {
        const token = makeExpiredJwt();
        const result = authHelpers.verifyRequestAuth({ cookies: { lumina_token: token } });

        expect(result.user).toBeNull();
        expect(result.error.code).toBe('TOKEN_EXPIRED');
    });

    it('retorna INVALID_TOKEN quando token é lixo', () => {
        const result = authHelpers.verifyRequestAuth({ cookies: { lumina_token: makeGarbageJwt() } });

        expect(result.user).toBeNull();
        expect(result.error.code).toBe('INVALID_TOKEN');
    });

    it('retorna INVALID_TOKEN quando token é assinado com secret errado', () => {
        const result = authHelpers.verifyRequestAuth({ cookies: { lumina_token: makeWrongSecretJwt() } });

        expect(result.user).toBeNull();
        expect(result.error.code).toBe('INVALID_TOKEN');
    });
});

// ─── verifyRequestAuthWithAccountCheck ─────────────────────────────────────
describe('verifyRequestAuthWithAccountCheck', () => {
    it('retorna account quando token é válido e conta está ativa', async () => {
        const account = makeAccount();
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const result = await authHelpers.verifyRequestAuthWithAccountCheck({
            cookies: { lumina_token: makeJwt() },
        });

        expect(result.error).toBeNull();
        expect(result.account).toEqual(account);
    });

    it('retorna MISSING_TOKEN quando não há token', async () => {
        const result = await authHelpers.verifyRequestAuthWithAccountCheck({ cookies: {}, headers: {} });

        expect(result.user).toBeNull();
        expect(result.error.code).toBe('MISSING_TOKEN');
    });

    it('retorna DB_UNAVAILABLE quando service falha', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('DB down'));

        const result = await authHelpers.verifyRequestAuthWithAccountCheck({
            cookies: { lumina_token: makeJwt() },
        });

        expect(result.error.code).toBe('DB_UNAVAILABLE');
        expect(result.error.status).toBe(503);
    });

    it('retorna ACCOUNT_NOT_FOUND quando conta não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);

        const result = await authHelpers.verifyRequestAuthWithAccountCheck({
            cookies: { lumina_token: makeJwt() },
        });

        expect(result.error.code).toBe('ACCOUNT_NOT_FOUND');
        expect(result.error.status).toBe(401);
    });

    it('retorna ACCOUNT_BANNED quando conta está banida', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ banned: true })
        );

        const result = await authHelpers.verifyRequestAuthWithAccountCheck({
            cookies: { lumina_token: makeJwt() },
        });

        expect(result.error.code).toBe('ACCOUNT_BANNED');
        expect(result.error.status).toBe(403);
    });

    it('retorna ACCOUNT_BLOCKED quando conta está bloqueada', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ blocked: true })
        );

        const result = await authHelpers.verifyRequestAuthWithAccountCheck({
            cookies: { lumina_token: makeJwt() },
        });

        expect(result.error.code).toBe('ACCOUNT_BLOCKED');
        expect(result.error.status).toBe(403);
    });
});

// ─── requireAuth middleware ────────────────────────────────────────────────
describe('requireAuth middleware', () => {
    it('popula req.user quando token é válido', async () => {
        const app = express();
        app.use(cookieParser());
        app.get('/test', authHelpers.requireAuth, (req, res) => {
            res.json({ email: req.user.email });
        });

        const token = makeJwt({ email: 'test@x.com' });
        const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe('test@x.com');
    });

    it('retorna 401 quando não há token', async () => {
        const app = express();
        app.use(cookieParser());
        app.get('/test', authHelpers.requireAuth, (req, res) => res.json({}));

        const res = await request(app).get('/test');

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('MISSING_TOKEN');
    });
});

// ─── optionalAuth middleware ───────────────────────────────────────────────
describe('optionalAuth middleware', () => {
    it('popula req.user quando token é válido', async () => {
        const app = express();
        app.use(cookieParser());
        app.get('/test', authHelpers.optionalAuth, (req, res) => {
            res.json({ email: req.user?.email || null });
        });

        const token = makeJwt({ email: 'opt@x.com' });
        const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe('opt@x.com');
    });

    it('NÃO bloqueia quando não há token (req.user = null)', async () => {
        const app = express();
        app.use(cookieParser());
        app.get('/test', authHelpers.optionalAuth, (req, res) => {
            res.json({ email: req.user?.email || null });
        });

        const res = await request(app).get('/test');

        expect(res.status).toBe(200);
        expect(res.body.email).toBeNull();
    });
});

// ─── setAuthCookie / clearAuthCookie ───────────────────────────────────────
describe('setAuthCookie / clearAuthCookie', () => {
    it('setAuthCookie seta cookie httpOnly', async () => {
        const app = express();
        app.use(cookieParser());
        app.get('/set', (req, res) => {
            authHelpers.setAuthCookie(res, 'test-jwt');
            res.json({ ok: true });
        });

        const res = await request(app).get('/set');

        expect(res.status).toBe(200);
        const setCookie = res.headers['set-cookie'] || [];
        const lumina = setCookie.find(c => c.startsWith('lumina_token='));
        expect(lumina).toBeDefined();
        expect(lumina).toMatch(/HttpOnly/i);
        expect(lumina).toMatch(/SameSite=Lax/i);
    });

    it('clearAuthCookie remove o cookie', async () => {
        const app = express();
        app.use(cookieParser());
        app.get('/clear', (req, res) => {
            authHelpers.clearAuthCookie(res);
            res.json({ ok: true });
        });

        const res = await request(app).get('/clear');

        expect(res.status).toBe(200);
        const setCookie = res.headers['set-cookie'] || [];
        const lumina = setCookie.find(c => c.startsWith('lumina_token='));
        expect(lumina).toBeDefined();
        // Clear envia Expires no passado ou Max-Age=0
        expect(lumina).toMatch(/Expires=|Max-Age=0/i);
    });
});
