/**
 * __tests__/routes/expapi-v1-closeAccount.test.js
 *
 * Suite para POST /expapi/v1/user/close-account
 * Agenda exclusão da conta para daqui a 30 dias.
 *
 * Cobertura:
 *   - 200 sucesso (agenda exclusão)
 *   - 400 CONFIRMATION_REQUIRED (sem { confirm: true })
 *   - 403 ADMIN_CANNOT_CLOSE (admin+ não pode auto-fechar)
 *   - 401 sem auth
 *   - 404 conta não existe
 *   - 500 erro interno
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf, makeAccount, makeAdminAccount,
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

describe('POST /expapi/v1/user/close-account', () => {
    const URL = '/expapi/v1/user/close-account';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = (overrides = {}) => bearerAuth(makeJwt(overrides));
    const withAuth = (req, overrides = {}) => req.set(combineAuthAndCsrf(authHeader(overrides), csrf.headers));

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 agenda exclusão para 30 dias no futuro', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.requestAccountClosure.mockResolvedValueOnce(true);

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok', true);
        expect(res.body).toHaveProperty('scheduledFor');
        // scheduledFor deve ser ~30 dias no futuro
        const scheduledMs = new Date(res.body.scheduledFor).getTime();
        const expectedMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
        expect(Math.abs(scheduledMs - expectedMs)).toBeLessThan(60 * 1000); // 1min de tolerance
    });

    it('200 inclui reason opcional no body', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.requestAccountClosure.mockResolvedValueOnce(true);

        const res = await withAuth(request(app).post(URL)).send({ confirm: true, reason: 'Não uso mais' });

        expect(res.status).toBe(200);
    });

    // ─── 400 Confirmação necessária ───────────────────────────────────────
    it('400 CONFIRMATION_REQUIRED sem { confirm: true }', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).post(URL)).send({});

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('400 CONFIRMATION_REQUIRED quando confirm é false', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).post(URL)).send({ confirm: false });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('400 CONFIRMATION_REQUIRED quando confirm é string "true"', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());

        const res = await withAuth(request(app).post(URL)).send({ confirm: 'true' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('CONFIRMATION_REQUIRED');
    });

    // ─── 403 Admin não pode auto-fechar ───────────────────────────────────
    it('403 ADMIN_CANNOT_CLOSE para accessType=admin', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAdminAccount());

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ADMIN_CANNOT_CLOSE');
    });

    it('403 ADMIN_CANNOT_CLOSE para accessType=owner', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ accessType: 'owner' })
        );

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ADMIN_CANNOT_CLOSE');
    });

    it('403 ADMIN_CANNOT_CLOSE para accessType=developer', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ accessType: 'developer' })
        );

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ADMIN_CANNOT_CLOSE');
    });

    it('200 permite user comum fechar conta', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        DashboardAccountService.requestAccountClosure.mockResolvedValueOnce(true);

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });
        expect(res.status).toBe(200);
    });

    it('200 permite vipUser fechar conta', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(
            makeAccount({ accessType: 'vipUser' })
        );
        DashboardAccountService.requestAccountClosure.mockResolvedValueOnce(true);

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });
        expect(res.status).toBe(200);
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send({ confirm: true });
        expect(res.status).toBe(401);
    });

    // ─── 404 Conta não existe ─────────────────────────────────────────────
    it('401 ACCOUNT_NOT_FOUND (auth check retorna 401 quando conta some)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await withAuth(request(app).post(URL)).send({ confirm: true });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro ao agendar fechamento', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount());
        DashboardAccountService.requestAccountClosure.mockRejectedValueOnce(new Error('DB down'));

        const res = await withAuth(request(app).post(URL)).send({ confirm: true });
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
