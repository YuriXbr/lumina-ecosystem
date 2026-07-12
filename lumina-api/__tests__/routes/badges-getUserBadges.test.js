/**
 * __tests__/routes/badges-getUserBadges.test.js
 *
 * Suite para GET /expapi/v1/badges/user/:identifier
 * Retorna badges públicas de um usuário (só se publicProfile=true)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeAccount, makeBadge,
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

describe('GET /expapi/v1/badges/user/:identifier', () => {
    const URL = (id) => `/expapi/v1/badges/user/${id}`;

    it('200 retorna badges públicas de usuário com perfil público', async () => {
        DashboardAccountService.getOne.mockImplementation((query) => {
            if (query.username) return Promise.resolve(makeAccount({ username: 'pubuser', publicProfile: true }));
            return Promise.resolve(null);
        });
        UserBadgeService.getByUser.mockResolvedValueOnce([
            { badgeCode: 'BADGE1', redeemedAt: new Date() },
        ]);
        BadgeService.getByCode.mockResolvedValueOnce(makeBadge({ code: 'BADGE1', rarity: 'epic' }));

        const res = await request(app).get(URL('pubuser'));

        expect(res.status).toBe(200);
        expect(res.body.badges).toHaveLength(1);
        expect(res.body.username).toBe('pubuser');
    });

    it('200 busca por MongoDB ObjectId (24 hex chars)', async () => {
        const objId = '65a1b2c3d4e5f6a7b8c9d0e1';
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ accountId: objId, publicProfile: true }));
        UserBadgeService.getByUser.mockResolvedValueOnce([]);

        const res = await request(app).get(URL(objId));

        expect(res.status).toBe(200);
        expect(res.body.badges).toEqual([]);
    });

    it('200 busca por Discord ID', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ discordOauth2Id: '123456789012345678', publicProfile: true }));
        UserBadgeService.getByUser.mockResolvedValueOnce([]);

        const res = await request(app).get(URL('123456789012345678'));

        expect(res.status).toBe(200);
    });

    it('403 PROFILE_PRIVATE quando publicProfile=false', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(
            makeAccount({ username: 'priv', publicProfile: false })
        );

        const res = await request(app).get(URL('priv'));

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PROFILE_PRIVATE');
    });

    it('404 USER_NOT_FOUND quando identifier não existe', async () => {
        DashboardAccountService.getOne.mockResolvedValue(null);

        const res = await request(app).get(URL('ghostuser'));

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('filtra badges inativas (active=false)', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(
            makeAccount({ username: 'pub', publicProfile: true })
        );
        UserBadgeService.getByUser.mockResolvedValueOnce([
            { badgeCode: 'ACTIVE', redeemedAt: new Date() },
            { badgeCode: 'INACTIVE', redeemedAt: new Date() },
        ]);
        BadgeService.getByCode.mockImplementation((code) => {
            if (code === 'ACTIVE') return Promise.resolve(makeBadge({ code, active: true }));
            return Promise.resolve(makeBadge({ code, active: false }));
        });

        const res = await request(app).get(URL('pub'));

        expect(res.status).toBe(200);
        expect(res.body.badges).toHaveLength(1);
        expect(res.body.badges[0].code).toBe('ACTIVE');
    });

    it('funciona sem auth (público)', async () => {
        DashboardAccountService.getOne.mockResolvedValueOnce(makeAccount({ publicProfile: true }));
        UserBadgeService.getByUser.mockResolvedValueOnce([]);

        const res = await request(app).get(URL('pubuser'));
        expect(res.status).toBe(200);
    });

    it('500 erro do service', async () => {
        DashboardAccountService.getOne.mockRejectedValueOnce(new Error('DB down'));
        const res = await request(app).get(URL('anyone'));
        expect(res.status).toBe(500);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
