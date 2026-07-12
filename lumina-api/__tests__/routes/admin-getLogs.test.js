/**
 * __tests__/routes/admin-getLogs.test.js
 *
 * Suite para GET /expapi/v1/admin/logs
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAdminAccount,
    mockLogger, mockDashboardAccountService, mockLogService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockLogService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const LogService = require('../../src/database/services/LogService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/admin/logs', () => {
    const URL = '/expapi/v1/admin/logs';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna logs com filtros', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        LogService.queryLogs.mockResolvedValueOnce({
            logs: [{ level: 'info', message: 'test' }],
            total: 1,
            page: 1,
            limit: 50,
            pages: 1,
        });

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.logs).toHaveLength(1);
        expect(res.body.total).toBe(1);
    });

    it('200 aceita filtros ?level=error&type=API&route=login', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        LogService.queryLogs.mockResolvedValueOnce({ logs: [], total: 0, page: 1, limit: 50, pages: 0 });

        await request(app).get(`${URL}?level=error&type=API&route=login`).set(authHeader());

        expect(LogService.queryLogs).toHaveBeenCalledWith(expect.objectContaining({
            level: 'error', type: 'API', route: 'login',
        }));
    });

    it('200 aceita ?requestId=abc-123', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        LogService.queryLogs.mockResolvedValueOnce({ logs: [], total: 0, page: 1, limit: 50, pages: 0 });

        await request(app).get(`${URL}?requestId=abc-123`).set(authHeader());

        expect(LogService.queryLogs).toHaveBeenCalledWith(expect.objectContaining({
            requestId: 'abc-123',
        }));
    });

    it('200 aceita paginação ?page=2&limit=10', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        LogService.queryLogs.mockResolvedValueOnce({ logs: [], total: 0, page: 2, limit: 10, pages: 0 });

        await request(app).get(`${URL}?page=2&limit=10`).set(authHeader());

        expect(LogService.queryLogs).toHaveBeenCalledWith(expect.objectContaining({
            page: '2', limit: '10',
        }));
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

    it('403 ACCOUNT_SUSPENDED', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ banned: true })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });

    it('500 erro do service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        LogService.queryLogs.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
