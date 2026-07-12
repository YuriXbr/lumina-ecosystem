/**
 * __tests__/routes/admin-getMetrics.test.js
 *
 * Suite para GET /expapi/v1/admin/metrics
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAdminAccount,
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

describe('GET /expapi/v1/admin/metrics', () => {
    const URL = '/expapi/v1/admin/metrics';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna snapshot de métricas', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('uptimeSeconds');
        expect(res.body).toHaveProperty('totalRequests');
        expect(res.body).toHaveProperty('totalErrors');
        expect(res.body).toHaveProperty('errorRate');
        expect(res.body).toHaveProperty('routes');
        expect(res.body).toHaveProperty('recentErrors');
        expect(res.body).toHaveProperty('memory');
    });

    it('401 sem auth', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ accessType: 'user' })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });

    it('403 INSUFFICIENT_PERMISSION para moderator (level 6)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ accessType: 'moderator' })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });

    it('403 ACCOUNT_SUSPENDED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ banned: true })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
