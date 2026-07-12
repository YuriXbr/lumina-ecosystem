/**
 * __tests__/routes/admin-getUsers.test.js
 *
 * Suite para GET /expapi/v1/admin/users
 * Restrito a staff+ (level 5+)
 *
 * Níveis visíveis:
 *   - level 5+: dados básicos
 *   - level 6+: discordOauth2Id, discordLinked
 *   - level 7+: notificação prefs
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAccount, makeAdminAccount,
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

describe('GET /expapi/v1/admin/users', () => {
    const URL = '/expapi/v1/admin/users';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna lista de usuários (level 5 support)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'support' })
        );
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([
            makeAccount({ email: 'a@x.com', accessType: 'user' }),
        ]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.users).toHaveLength(1);
        // Level 5: apenas dados básicos
        expect(res.body.users[0]).not.toHaveProperty('discordOauth2Id');
        expect(res.body.users[0]).not.toHaveProperty('emailNotifications');
    });

    it('200 inclui discordOauth2Id para level 6+ (moderator)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'moderator' })
        );
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([
            makeAccount({ discordOauth2Id: '12345' }),
        ]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.users[0]).toHaveProperty('discordOauth2Id', '12345');
        expect(res.body.users[0]).toHaveProperty('discordLinked', true);
    });

    it('200 inclui notificações para level 7+ (admin)', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([
            makeAccount({ emailNotifications: false }),
        ]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.users[0]).toHaveProperty('emailNotifications', false);
        expect(res.body.users[0]).toHaveProperty('discordNotifications');
        expect(res.body.users[0]).toHaveProperty('botActivityAlerts');
    });

    it('200 aceita paginação ?page=2&limit=10', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([]);

        const res = await request(app).get(`${URL}?page=2&limit=10`).set(authHeader());

        expect(res.status).toBe(200);
        expect(DashboardAccountService.getAllAccounts).toHaveBeenCalledWith({
            page: 2, limit: 10, search: '', accessType: '',
        });
    });

    it('200 limita limit a 100 máximo', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?limit=500`).set(authHeader());

        expect(DashboardAccountService.getAllAccounts).toHaveBeenCalledWith({
            page: 1, limit: 100, search: '', accessType: '',
        });
    });

    it('200 aceita ?search=joao', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?search=joao`).set(authHeader());

        expect(DashboardAccountService.getAllAccounts).toHaveBeenCalledWith({
            page: 1, limit: 50, search: 'joao', accessType: '',
        });
    });

    it('200 aceita ?accessType=user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getAllAccounts.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?accessType=user`).set(authHeader());

        expect(DashboardAccountService.getAllAccounts).toHaveBeenCalledWith({
            page: 1, limit: 50, search: '', accessType: 'user',
        });
    });

    it('401 sem auth', async () => {
        const res = await request(app).get(URL);
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user comum', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAccount({ accessType: 'user' })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
    });

    it('403 ACCOUNT_SUSPENDED quando banido', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ banned: true })
        );
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(403);
        expect(['ACCOUNT_BANNED', 'ACCOUNT_BLOCKED', 'ACCOUNT_SUSPENDED']).toContain(res.body.code);
    });

    it('500 erro do service', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        DashboardAccountService.getAllAccounts.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
