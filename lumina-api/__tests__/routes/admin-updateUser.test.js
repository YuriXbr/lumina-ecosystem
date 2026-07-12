/**
 * __tests__/routes/admin-updateUser.test.js
 *
 * Suite para PUT /expapi/v1/admin/users/:userId
 * Restrito a staff+ (level 5+), com hierarquia de campos por nível.
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
    makeAccount, makeAdminAccount,
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

describe('PUT /expapi/v1/admin/users/:userId', () => {
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const headers = () => combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers);

    it('200 admin level 5 pode bloquear usuário comum', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'support' })
        );
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        DashboardAccountService.updateAccount.mockResolvedValueOnce(true);

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ blocked: true });

        expect(res.status).toBe(200);
        expect(DashboardAccountService.updateAccount).toHaveBeenCalledWith('target-acc', { blocked: true });
    });

    it('200 admin level 7 pode mudar accessType de usuário comum', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        DashboardAccountService.updateAccount.mockResolvedValueOnce(true);

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ accessType: 'vipUser' });

        expect(res.status).toBe(200);
        expect(DashboardAccountService.updateAccount).toHaveBeenCalledWith('target-acc', { accessType: 'vipUser' });
    });

    it('200 admin level 8 pode mudar firstName/lastName', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'headadmin' })
        );
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        DashboardAccountService.updateAccount.mockResolvedValueOnce(true);

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ firstName: 'Novo', lastName: 'Nome' });

        expect(res.status).toBe(200);
        expect(DashboardAccountService.updateAccount).toHaveBeenCalledWith('target-acc', { firstName: 'Novo', lastName: 'Nome' });
    });

    it('403 NO_ALLOWED_FIELDS quando admin level 5 tenta mudar accessType', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'support' })
        );
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ accessType: 'admin' });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NO_ALLOWED_FIELDS');
    });

    it('403 quando admin tenta modificar usuário de nível igual ou maior', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'admin' }) // mesmo nível
        );

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ blocked: true });

        // blocked só é permitido para alvos de nível menor
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('NO_ALLOWED_FIELDS');
    });

    it('401 sem auth', async () => {
        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(combineAuthAndCsrf({}, csrf.headers))
            .send({ blocked: true });
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user comum', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'user' })
        );

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ blocked: true });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_PERMISSION');
    });

    it('404 USER_NOT_FOUND quando alvo não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(null);

        const res = await request(app)
            .put('/expapi/v1/admin/users/ghost')
            .set(headers())
            .send({ blocked: true });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('campos sensíveis como password são removidos antes do update', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        DashboardAccountService.updateAccount.mockResolvedValueOnce(true);

        await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ blocked: true, password: 'should-be-ignored', accountId: 'hacked' });

        const callArgs = DashboardAccountService.updateAccount.mock.calls[0];
        // password e accountId não devem estar presentes
        expect(callArgs[1]).toEqual({ blocked: true });
    });

    it('500 erro ao atualizar', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getDashboardAccountByAccountId.mockResolvedValueOnce(
            makeAccount({ accessType: 'user' })
        );
        DashboardAccountService.updateAccount.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app)
            .put('/expapi/v1/admin/users/target-acc')
            .set(headers())
            .send({ blocked: true });

        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
