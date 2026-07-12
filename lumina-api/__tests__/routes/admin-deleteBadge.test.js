/**
 * __tests__/routes/admin-deleteBadge.test.js
 *
 * Suite para DELETE /expapi/v1/admin/badges/:code
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
    makeAdminAccount, makeBadge,
    mockLogger, mockDashboardAccountService, mockBadgeService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockBadgeService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const BadgeService = require('../../src/database/services/BadgeService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('DELETE /expapi/v1/admin/badges/:code', () => {
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const headers = () => combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers);

    it('200 deleta badge com sucesso', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'TEST' }));
        BadgeService.deleteByCode.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await request(app)
            .delete('/expapi/v1/admin/badges/TEST')
            .set(headers());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    it('401 sem auth', async () => {
        const res = await request(app).delete('/expapi/v1/admin/badges/TEST').set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ accessType: 'user' })
        );

        const res = await request(app).delete('/expapi/v1/admin/badges/TEST').set(headers());

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('INSUFFICIENT_PERMISSION');
    });

    it('404 BADGE_NOT_FOUND quando código não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(null);

        const res = await request(app).delete('/expapi/v1/admin/badges/NOPE').set(headers());

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('BADGE_NOT_FOUND');
    });

    it('código é normalizado para UPPERCASE', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'TEST' }));
        BadgeService.deleteByCode.mockResolvedValueOnce({ deletedCount: 1 });

        await request(app).delete('/expapi/v1/admin/badges/test').set(headers());

        expect(BadgeService.getByCode).toHaveBeenCalledWith('TEST');
        expect(BadgeService.deleteByCode).toHaveBeenCalledWith('TEST');
    });

    it('500 erro ao deletar', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge());
        BadgeService.deleteByCode.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).delete('/expapi/v1/admin/badges/TEST').set(headers());

        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
