/**
 * __tests__/routes/expapi-v1-setPassword.test.js
 *
 * Suite para POST /expapi/v1/user/set-password
 *
 * Requer: JWT (jwtNeeded) + CSRF (bypassed em test) + loginLimiter (bypassed em test)
 *
 * Cobertura:
 *   - 401 sem JWT
 *   - 400 MISSING_FIELDS sem newPassword
 *   - 200 sucesso (define senha pela 1ª vez em conta OAuth)
 *   - 200 sucesso (altera senha com currentPassword correta)
 *   - 404 ACCOUNT_NOT_FOUND
 *   - 429 ACCOUNT_LOCKED (após 5 tentativas erradas)
 *   - 400 INVALID_CURRENT_PASSWORD
 *   - 400 SAME_PASSWORD
 *   - 400 WEAK_PASSWORD
 *   - 500 erro genérico
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, makeGarbageJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
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

describe('POST /expapi/v1/user/set-password', () => {
    const URL = '/expapi/v1/user/set-password';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt({ accountId: 'acc-123', email: 'user@example.com' }));

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization header', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ newPassword: 'Nova12345' });
        expect(res.status).toBe(401);
    });

    it('401 com token lixo', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(makeGarbageJwt()), csrf.headers))
            .send({ newPassword: 'Nova12345' });
        expect(res.status).toBe(401);
    });

    // ─── 400 Campos faltando ──────────────────────────────────────────────
    it('400 MISSING_FIELDS sem newPassword', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 MISSING_FIELDS com newPassword vazio', async () => {
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ newPassword: '' });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 quando define senha pela 1ª vez (sem currentPassword)', async () => {
        DashboardAccountService.changePassword.mockResolvedValueOnce(true);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ newPassword: 'NovaSenha123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(DashboardAccountService.changePassword).toHaveBeenCalledWith('acc-123', null, 'NovaSenha123');
    });

    it('200 quando altera senha com currentPassword correta', async () => {
        DashboardAccountService.changePassword.mockResolvedValueOnce(true);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ currentPassword: 'Old12345', newPassword: 'NovaSenha123' });

        expect(res.status).toBe(200);
        expect(DashboardAccountService.changePassword).toHaveBeenCalledWith('acc-123', 'Old12345', 'NovaSenha123');
    });

    // ─── 404 Conta não existe ─────────────────────────────────────────────
    it('404 ACCOUNT_NOT_FOUND', async () => {
        const err = new Error('not found'); err.code = 'ACCOUNT_NOT_FOUND';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ newPassword: 'NovaSenha123' });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 429 Conta locked ─────────────────────────────────────────────────
    it('429 ACCOUNT_LOCKED após múltiplas tentativas erradas', async () => {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        const err = new Error('locked'); err.code = 'ACCOUNT_LOCKED'; err.lockedUntil = lockedUntil;
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ currentPassword: 'wrong', newPassword: 'NovaSenha123' });

        expect(res.status).toBe(429);
        expect(res.body.code).toBe('ACCOUNT_LOCKED');
        // lockedUntil é serializado como string ISO no JSON
        expect(res.body.lockedUntil).toBe(lockedUntil.toISOString());
    });

    // ─── 400 Senha atual incorreta ────────────────────────────────────────
    it('400 INVALID_CURRENT_PASSWORD com tentativas restantes', async () => {
        const err = new Error('wrong'); err.code = 'INVALID_CURRENT_PASSWORD'; err.attemptsRemaining = 3;
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ currentPassword: 'wrong', newPassword: 'NovaSenha123' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
        expect(res.body.attemptsRemaining).toBe(3);
    });

    it('400 INVALID_CURRENT_PASSWORD sem tentativas restantes (lock iminente)', async () => {
        const err = new Error('wrong'); err.code = 'INVALID_CURRENT_PASSWORD'; err.attemptsRemaining = 0;
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ currentPassword: 'wrong', newPassword: 'NovaSenha123' });

        expect(res.status).toBe(400);
        expect(res.body.attemptsRemaining).toBe(0);
        // Mensagem deve mencionar bloqueio
        expect(res.body.error).toMatch(/bloqueada/i);
    });

    // ─── 400 Mesma senha ──────────────────────────────────────────────────
    it('400 SAME_PASSWORD', async () => {
        const err = new Error('same'); err.code = 'SAME_PASSWORD';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ currentPassword: 'Same123', newPassword: 'Same123' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('SAME_PASSWORD');
    });

    // ─── 400 Senha fraca ──────────────────────────────────────────────────
    it('400 WEAK_PASSWORD', async () => {
        const err = new Error('weak'); err.code = 'WEAK_PASSWORD';
        DashboardAccountService.changePassword.mockRejectedValueOnce(err);

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ newPassword: 'fraca' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('WEAK_PASSWORD');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro genérico do service', async () => {
        DashboardAccountService.changePassword.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(authHeader(), csrf.headers))
            .send({ newPassword: 'NovaSenha123' });

        expect(res.status).toBe(500);
    });

    // ─── JWT sem accountId ────────────────────────────────────────────────
    it('401 INVALID_TOKEN quando JWT não tem accountId', async () => {
        const token = makeJwt({ accountId: undefined });
        const res = await request(app)
            .post(URL)
            .set(combineAuthAndCsrf(bearerAuth(token), csrf.headers))
            .send({ newPassword: 'NovaSenha123' });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_TOKEN');
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
