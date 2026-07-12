/**
 * __tests__/routes/expapi-v1-cancelCloseAccount.test.js
 *
 * Suite para POST /expapi/v1/user/cancel-close-account
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf, makeAccount,
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

describe('POST /expapi/v1/user/cancel-close-account', () => {
    const URL = '/expapi/v1/user/cancel-close-account';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const authHeader = () => bearerAuth(makeJwt());
    const withAuth = (req) => req.set(combineAuthAndCsrf(authHeader(), csrf.headers));

    // ─── 200 Sucesso ──────────────────────────────────────────────────────
    it('200 cancela exclusão agendada', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            deletionRequestedAt: new Date(),
        }));
        DashboardAccountService.cancelAccountClosure.mockResolvedValueOnce(true);

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok', true);
        expect(DashboardAccountService.cancelAccountClosure).toHaveBeenCalled();
    });

    // ─── 400 Sem fechamento agendado ──────────────────────────────────────
    it('400 NO_CLOSURE_SCHEDULED quando não há fechamento agendado', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            deletionRequestedAt: null,
        }));

        const res = await withAuth(request(app).post(URL)).send();

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NO_CLOSURE_SCHEDULED');
    });

    // ─── 401 Sem auth ─────────────────────────────────────────────────────
    it('401 sem Authorization', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send();
        expect(res.status).toBe(401);
    });

    // ─── 404 Conta não existe ─────────────────────────────────────────────
    it('401 ACCOUNT_NOT_FOUND (auth check retorna 401)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(null);
        const res = await withAuth(request(app).post(URL)).send();
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    });

    // ─── 500 Erro interno ─────────────────────────────────────────────────
    it('500 erro ao cancelar', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValueOnce(makeAccount({
            deletionRequestedAt: new Date(),
        }));
        DashboardAccountService.cancelAccountClosure.mockRejectedValueOnce(new Error('DB down'));

        const res = await withAuth(request(app).post(URL)).send();
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
