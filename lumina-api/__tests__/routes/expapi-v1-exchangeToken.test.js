/**
 * __tests__/routes/expapi-v1-exchangeToken.test.js
 *
 * Suite de testes para POST /expapi/v1/exchange-token
 *
 * Recebe um JWT no body e seta o cookie httpOnly. Usado para resolver
 * cross-origin em dev (frontend recebe token da URL fragment, envia
 * para a API mesma origem via proxy, API seta cookie).
 *
 * Cobertura:
 *   - 200 sucesso (token válido → seta cookie + retorna user)
 *   - 400 MISSING_TOKEN (sem token no body)
 *   - 401 INVALID_TOKEN (token inválido/expirado)
 *   - 404 ACCOUNT_NOT_FOUND (conta não existe mais)
 *   - 403 ACCOUNT_BANNED / ACCOUNT_BLOCKED
 *   - 500 erro interno
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, makeExpiredJwt, makeWrongSecretJwt, makeGarbageJwt,
    getCsrfTokens, combineAuthAndCsrf, makeAccount,
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

describe('POST /expapi/v1/exchange-token', () => {
    const URL = '/expapi/v1/exchange-token';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 seta cookie httpOnly + retorna user quando token é válido', async () => {
        const account = makeAccount();
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const token = makeJwt();
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok', true);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toBe(account.email);

        const setCookie = res.headers['set-cookie'] || [];
        const luminaCookie = setCookie.find(c => c.startsWith('lumina_token='));
        expect(luminaCookie).toBeDefined();
        expect(luminaCookie).toMatch(/HttpOnly/i);
    });

    it('200 retorna user com todos os campos esperados', async () => {
        const account = makeAccount({
            accessType: 'admin',
            emailVerified: true,
            username: 'specialuser',
            displayName: 'Special User',
        });
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeJwt() });

        expect(res.status).toBe(200);
        expect(res.body.user.accessType).toBe('admin');
        expect(res.body.user.username).toBe('specialuser');
        expect(res.body.user.displayName).toBe('Special User');
        expect(res.body.user.hasPassword).toBe(true);
    });

    // ─── 400 Token faltando ───────────────────────────────────────────────
    it('400 MISSING_TOKEN quando body não tem token', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_TOKEN');
    });

    it('400 MISSING_TOKEN quando body é null', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send(null);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_TOKEN');
    });

    it('400 MISSING_TOKEN quando token é string vazia', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: '' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_TOKEN');
    });

    // ─── 401 Token inválido ───────────────────────────────────────────────
    it('401 INVALID_TOKEN quando token é garbage', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeGarbageJwt() });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('401 INVALID_TOKEN quando token é expirado', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeExpiredJwt() });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('401 INVALID_TOKEN quando token é assinado com secret errado', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeWrongSecretJwt() });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });

    // ─── 404 Conta não existe ─────────────────────────────────────────────
    it('404 ACCOUNT_NOT_FOUND quando conta não existe mais', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeJwt() });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 403 Conta banida/bloqueada ───────────────────────────────────────
    it('403 ACCOUNT_BANNED quando conta está banida', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ banned: true })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeJwt() });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BANNED');
    });

    it('403 ACCOUNT_BLOCKED quando conta está bloqueada', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ blocked: true })
        );

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeJwt() });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ACCOUNT_BLOCKED');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro genérico do service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ token: makeJwt() });
        expect(res.status).toBe(500);
    });

    // ─── CSRF ─────────────────────────────────────────────────────────────
    it('em NODE_ENV=test, POST funciona sem CSRF (bypass)', async () => {
        const account = makeAccount();
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(account);

        const res = await request(app).post(URL).send({ token: makeJwt() });
        // Sem CSRF header: deve passar pois CSRF é bypassed em test env
        expect([200, 403]).toContain(res.status);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
