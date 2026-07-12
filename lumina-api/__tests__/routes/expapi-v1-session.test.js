/**
 * __tests__/routes/expapi-v1-session.test.js
 *
 * Suite de testes para GET /expapi/v1/session
 *
 * Cobertura:
 *   - 200 { authenticated: false } quando não há token
 *   - 200 { authenticated: false } quando token é lixo
 *   - 200 { authenticated: false } quando token é expirado
 *   - 200 { authenticated: false } quando conta não existe (ACCOUNT_NOT_FOUND)
 *   - 200 { authenticated: false, reason: 'ACCOUNT_BANNED' } quando banida
 *   - 200 { authenticated: false, reason: 'ACCOUNT_BLOCKED' } quando bloqueada
 *   - 200 { authenticated: true, user: {...} } quando token válido e conta ativa
 *   - Cookie httpOnly aceito
 *   - Header Authorization Bearer aceito
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, makeExpiredJwt, makeWrongSecretJwt, makeGarbageJwt,
    cookieAuth, bearerAuth, makeAccount,
    mockLogger, mockDashboardAccountService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/session', () => {
    const URL = '/expapi/v1/session';

    // ─── 200 Não autenticado ──────────────────────────────────────────────
    it('200 { authenticated: false } quando não há token', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ authenticated: false });
    });

    it('200 { authenticated: false } quando token é string aleatória', async () => {
        const res = await request(app).get(URL).set(bearerAuth(makeGarbageJwt()));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ authenticated: false });
    });

    it('200 { authenticated: false } quando token é expirado', async () => {
        const res = await request(app).get(URL).set(bearerAuth(makeExpiredJwt()));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ authenticated: false });
    });

    it('200 { authenticated: false } quando token é assinado com secret errado', async () => {
        const res = await request(app).get(URL).set(bearerAuth(makeWrongSecretJwt()));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ authenticated: false });
    });

    it('200 { authenticated: false } quando Authorization header não é Bearer', async () => {
        const res = await request(app).get(URL).set({ Authorization: 'Basic abc' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ authenticated: false });
    });

    // ─── 200 Autenticado ──────────────────────────────────────────────────
    it('200 { authenticated: true, user } quando token válido e conta ativa', async () => {
        const account = makeAccount();
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).get(URL).set(bearerAuth(makeJwt()));
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.user).toHaveProperty('accountId', account.accountId);
        expect(res.body.user).toHaveProperty('email', account.email);
        expect(res.body.user).toHaveProperty('accessType', 'user');
        expect(res.body.user).toHaveProperty('username', 'tester');
        expect(res.body.user).toHaveProperty('displayName', 'Test User');
    });

    it('200 via cookie httpOnly (lumina_token) também autentica', async () => {
        const account = makeAccount();
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).get(URL).set(cookieAuth(makeJwt()));
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
    });

    // ─── 200 Conta banida/bloqueada ───────────────────────────────────────
    it('200 { authenticated: false, reason: "ACCOUNT_BANNED" } quando conta banida', async () => {
        const account = makeAccount({ banned: true });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).get(URL).set(bearerAuth(makeJwt()));
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(false);
        expect(res.body.reason).toBe('ACCOUNT_BANNED');
    });

    it('200 { authenticated: false, reason: "ACCOUNT_BLOCKED" } quando conta bloqueada', async () => {
        const account = makeAccount({ blocked: true });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).get(URL).set(bearerAuth(makeJwt()));
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(false);
        expect(res.body.reason).toBe('ACCOUNT_BLOCKED');
    });

    it('200 { authenticated: false } quando conta não existe mais (ACCOUNT_NOT_FOUND)', async () => {
        // verifyRequestAuthWithAccountCheck retorna ACCOUNT_NOT_FOUND (401)
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);

        const res = await request(app).get(URL).set(bearerAuth(makeJwt()));
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(false);
    });

    // ─── Erro de DB ───────────────────────────────────────────────────────
    it('200 { authenticated: false } quando DB está indisponível (session não falha)', async () => {
        // verifyRequestAuthWithAccountCheck retorna error 503 DB_UNAVAILABLE,
        // mas session.js trata isso como "não autenticado" (200) em vez de 500.
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('Connection lost'));

        const res = await request(app).get(URL).set(bearerAuth(makeJwt()));
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(false);
    });

    // ─── Não exige auth ───────────────────────────────────────────────────
    it('GET funciona sem nenhum header de auth (retorna não autenticado)', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(200);
    });

    it('GET não exige CSRF (rota GET)', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(200);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
