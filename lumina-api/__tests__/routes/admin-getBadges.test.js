/**
 * __tests__/routes/admin-getBadges.test.js
 *
 * Suite para GET /expapi/v1/admin/badges
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, makeAdminAccount, makeBadge,
    mockLogger, mockDashboardAccountService, mockBadgeService, mockUserBadgeService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockBadgeService();
mockUserBadgeService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const BadgeService = require('../../src/database/services/BadgeService');
const UserBadgeService = require('../../src/database/services/UserBadgeService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/admin/badges', () => {
    const URL = '/expapi/v1/admin/badges';
    const authHeader = () => bearerAuth(makeJwt());

    it('200 retorna todas as badges com contagem de redenção', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getAll.mockResolvedValueOnce([
            makeBadge({ code: 'A', createdAt: new Date('2024-01-01') }),
            makeBadge({ code: 'B', createdAt: new Date('2024-02-01') }),
        ]);
        UserBadgeService.countByBadge.mockResolvedValue(5);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.badges).toHaveLength(2);
        expect(res.body.badges[0]).toHaveProperty('redemptionCount', 5);
        // Mais recente primeiro
        expect(res.body.badges[0].code).toBe('B');
    });

    it('200 retorna lista vazia quando não há badges', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        BadgeService.getAll.mockResolvedValueOnce([]);

        const res = await request(app).get(URL).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.badges).toEqual([]);
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
        BadgeService.getAll.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL).set(authHeader());
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
